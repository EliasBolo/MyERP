import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ categories: [] });

  const categories = await db.category.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const body = await req.json();
  const category = await db.category.create({
    data: { name: body.name, description: body.description, businessId },
  });
  return NextResponse.json({ category }, { status: 201 });
}
