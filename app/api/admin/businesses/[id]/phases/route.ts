import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/businesses/[id]/phases
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const phases = await db.subscriptionPhase.findMany({
    where: { businessId: params.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ phases });
}

// POST /api/admin/businesses/[id]/phases — create a new phase
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, startDate, endDate, status, order } = body;

  if (!name || !startDate) {
    return NextResponse.json({ error: 'Name and start date are required' }, { status: 400 });
  }

  // Verify business exists
  const business = await db.business.findUnique({ where: { id: params.id } });
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  if (business.subscriptionTier !== 'production') {
    return NextResponse.json({ error: 'Phases are only available for Production tier' }, { status: 400 });
  }

  // Auto-assign order if not provided
  const maxOrder = await db.subscriptionPhase.findFirst({
    where: { businessId: params.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const phase = await db.subscriptionPhase.create({
    data: {
      businessId: params.id,
      name,
      description: description ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status ?? 'pending',
      order: order ?? (maxOrder ? maxOrder.order + 1 : 0),
    },
  });

  return NextResponse.json({ phase }, { status: 201 });
}
