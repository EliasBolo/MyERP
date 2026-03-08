import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/businesses/[id]/renewals
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const renewals = await db.licenseRenewal.findMany({
    where: { businessId: params.id },
    orderBy: { renewedAt: 'desc' },
  });

  return NextResponse.json({ renewals });
}

// POST /api/admin/businesses/[id]/renewals
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    tierFrom, tierTo, statusFrom, statusTo,
    amountPaid, currency = 'EUR', notes, renewedAt,
    applyToSubscription = false,
  } = body;

  if (!tierTo || !statusTo) {
    return NextResponse.json({ error: 'Απαιτούνται τα πεδία tier και κατάσταση' }, { status: 400 });
  }

  const renewal = await db.licenseRenewal.create({
    data: {
      businessId: params.id,
      tierFrom: tierFrom || null,
      tierTo,
      statusFrom: statusFrom || null,
      statusTo,
      amountPaid: amountPaid ? Number(amountPaid) : null,
      currency,
      notes: notes || null,
      renewedAt: renewedAt ? new Date(renewedAt) : new Date(),
    },
  });

  // Optionally apply the new tier/status to the business subscription
  if (applyToSubscription) {
    await db.business.update({
      where: { id: params.id },
      data: { subscriptionTier: tierTo, subscriptionStatus: statusTo },
    });
  }

  return NextResponse.json({ renewal }, { status: 201 });
}
