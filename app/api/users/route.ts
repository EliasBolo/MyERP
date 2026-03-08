import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as any;
  let where: any = {};

  if (currentUser.role === 'master_admin') {
    // See all users
  } else if (currentUser.role === 'business_admin') {
    where = { businessId: currentUser.businessId };
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await db.user.findMany({
    where,
    include: { business: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, twoFactorEnabled: true, lastLogin: true,
      businessId: true, business: true, createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role === 'user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Απαιτούνται Όνομα, Email και Κωδικός' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Το email υπάρχει ήδη' }, { status: 409 });

    // Prevent non-master from creating master_admin
    let finalRole = role;
    if (currentUser.role !== 'master_admin' && role === 'master_admin') {
      finalRole = 'user';
    }

    const hashedPassword = await hash(password, 12);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: finalRole || 'user',
        businessId: currentUser.businessId,
        isActive: isActive !== false,
      },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, twoFactorEnabled: true, businessId: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
