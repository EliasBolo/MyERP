import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET /api/admin/businesses — list all businesses with subscription info (master_admin only)
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const businesses = await db.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subscriptionPhases: { orderBy: { order: 'asc' } },
      _count: { select: { users: true, invoices: true, clients: true, products: true } },
    },
  });

  return NextResponse.json({ businesses });
}

// POST /api/admin/businesses — create a new business + business_admin user (master_admin only)
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    businessName,
    businessEmail,
    vatNumber,
    phone,
    address,
    contactPerson,
    notes,
    subscriptionTier = 'standard',
    subscriptionStatus = 'active',
    licenseExpiresAt,
    adminName,
    adminEmail,
    adminPassword,
  } = body;

  // Validate required fields
  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'Το όνομα επιχείρησης είναι υποχρεωτικό' }, { status: 400 });
  }
  if (!adminName?.trim() || !adminEmail?.trim() || !adminPassword) {
    return NextResponse.json({ error: 'Το όνομα, email και κωδικός διαχειριστή είναι υποχρεωτικά' }, { status: 400 });
  }
  if (adminPassword.length < 8) {
    return NextResponse.json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: adminEmail.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Υπάρχει ήδη χρήστης με αυτό το email' }, { status: 409 });
  }

  // Check VAT uniqueness if provided
  if (vatNumber?.trim()) {
    const existingBiz = await db.business.findUnique({ where: { vatNumber: vatNumber.trim() } });
    if (existingBiz) {
      return NextResponse.json({ error: 'Υπάρχει ήδη επιχείρηση με αυτό το ΑΦΜ' }, { status: 409 });
    }
  }

  const hashedPassword = await hash(adminPassword, 12);

  // Create business + admin user in a single transaction
  const result = await db.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: businessName.trim(),
        email: businessEmail?.trim() || null,
        vatNumber: vatNumber?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        notes: notes?.trim() || null,
        subscriptionTier,
        subscriptionStatus,
        licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
        isActive: true,
      },
    });

    const adminUser = await tx.user.create({
      data: {
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: hashedPassword,
        role: 'business_admin',
        businessId: business.id,
        isActive: true,
      },
    });

    return { business, adminUser };
  });

  return NextResponse.json({
    business: result.business,
    adminUser: {
      id: result.adminUser.id,
      name: result.adminUser.name,
      email: result.adminUser.email,
    },
  }, { status: 201 });
}
