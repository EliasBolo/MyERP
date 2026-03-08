import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/businesses/[id] — full business detail with payments, renewals, phases, users
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const business = await db.business.findUnique({
    where: { id: params.id },
    include: {
      subscriptionPhases: { orderBy: { order: 'asc' } },
      licenseRenewals: { orderBy: { renewedAt: 'desc' } },
      customerPayments: { orderBy: { paidAt: 'desc' } },
      users: {
        where: { role: { in: ['business_admin', 'user'] } },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { users: true, invoices: true, clients: true, products: true } },
    },
  });

  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ business });
}

// PATCH /api/admin/businesses/[id] — update business details (name, email, VAT, phone, address, contactPerson, notes, subscription)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, email, vatNumber, phone, address, contactPerson, notes,
    subscriptionTier, subscriptionStatus, licenseExpiresAt, isActive,
  } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email || null;
  if (vatNumber !== undefined) updateData.vatNumber = vatNumber || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (address !== undefined) updateData.address = address || null;
  if (contactPerson !== undefined) updateData.contactPerson = contactPerson || null;
  if (notes !== undefined) updateData.notes = notes || null;
  if (subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionTier;
  if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
  if (licenseExpiresAt !== undefined) updateData.licenseExpiresAt = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
  if (isActive !== undefined) updateData.isActive = isActive;

  try {
    const business = await db.business.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json({ business });
  } catch {
    return NextResponse.json({ error: 'Business not found or VAT already in use' }, { status: 400 });
  }
}
