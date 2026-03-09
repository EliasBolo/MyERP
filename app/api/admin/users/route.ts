import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET /api/admin/users
// ?scope=admin  → returns only master_admin users (for /admin/users page)
// ?scope=business → returns only non-master_admin users (for business-card tab)
// (no param) → same as scope=business for backwards compat
export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'business';

  const where = scope === 'admin'
    ? { role: 'master_admin' as const }
    : { role: { not: 'master_admin' as const } };

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      business: {
        select: { id: true, name: true, subscriptionTier: true, isActive: true },
      },
    },
  });

  return NextResponse.json({ users });
}

// POST /api/admin/users
// body.scope === 'admin'   → creates a master_admin user (no businessId needed)
// body.scope === 'business' (default) → creates a business user (businessId required)
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, businessId, scope = 'business' } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: 'Όνομα, email και κωδικός είναι υποχρεωτικά' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' },
      { status: 400 }
    );
  }
  if (scope === 'business' && !businessId) {
    return NextResponse.json(
      { error: 'Η επιχείρηση είναι υποχρεωτική' },
      { status: 400 }
    );
  }

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Υπάρχει ήδη χρήστης με αυτό το email' }, { status: 409 });
  }

  // Verify business exists when needed
  if (scope === 'business') {
    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: 'Η επιχείρηση δεν βρέθηκε' }, { status: 404 });
    }
  }

  const hashedPassword = await hash(password, 12);

  const newUser = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: scope === 'admin' ? 'master_admin' : 'user',
      businessId: scope === 'business' ? businessId : null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      business: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}
