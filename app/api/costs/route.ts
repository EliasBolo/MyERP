import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ costs: [] });

  const costs = await db.cost.findMany({
    where: { businessId },
    orderBy: { date: 'desc' },
    include: {
      costCategory: true,
      invoiceFile: { select: { id: true, fileName: true, mimeType: true } },
    },
  });
  return NextResponse.json({ costs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const costCategoryId = body.costCategoryId || null;
    if (!costCategoryId) return NextResponse.json({ error: 'Κατηγορία απαιτείται' }, { status: 400 });
    const taxRate = body.taxRate != null && body.taxRate !== '' ? parseFloat(body.taxRate) : null;
    const cost = await db.cost.create({
      data: {
        businessId,
        costCategoryId,
        description: body.description,
        amount: parseFloat(body.amount),
        taxRate: taxRate != null && !Number.isNaN(taxRate) ? taxRate : null,
        date: body.date ? new Date(body.date) : new Date(),
        recurrence: body.recurrence || 'once',
        vendor: body.vendor || null,
        notes: body.notes || null,
      },
      include: { costCategory: true },
    });
    return NextResponse.json({ cost }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
