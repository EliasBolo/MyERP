import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/businesses/[id]/payments
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payments = await db.customerPayment.findMany({
    where: { businessId: params.id },
    orderBy: { paidAt: 'desc' },
  });

  return NextResponse.json({ payments });
}

// POST /api/admin/businesses/[id]/payments
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { amount, currency = 'EUR', method = 'bank', status = 'paid', reference, notes, paidAt } = body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Απαιτείται έγκυρο ποσό' }, { status: 400 });
  }

  const payment = await db.customerPayment.create({
    data: {
      businessId: params.id,
      amount: Number(amount),
      currency,
      method,
      status,
      reference: reference || null,
      notes: notes || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
