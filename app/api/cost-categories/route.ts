import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const DEFAULT_CATEGORIES = [
  { name: 'Μισθοδοσία', color: '#3b82f6', order: 0 },
  { name: 'Ενοίκιο', color: '#8b5cf6', order: 1 },
  { name: 'Λογαριασμοί', color: '#f59e0b', order: 2 },
  { name: 'Marketing', color: '#10b981', order: 3 },
  { name: 'Λειτουργικά', color: '#ef4444', order: 4 },
  { name: 'Άλλα', color: '#6b7280', order: 5 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ categories: [] });

  let categories = await db.costCategory.findMany({
    where: { businessId },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });

  if (categories.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await db.costCategory.create({ data: { businessId, ...c } });
    }
    categories = await db.costCategory.findMany({
      where: { businessId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const name = (body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Όνομα απαιτείται' }, { status: 400 });

    const maxOrder = await db.costCategory
      .aggregate({ where: { businessId }, _max: { order: true } })
      .then((r) => r._max.order ?? -1);

    const category = await db.costCategory.create({
      data: {
        businessId,
        name,
        color: (body.color ?? '#6b7280').trim(),
        order: maxOrder + 1,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
