import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ number: 'INV-0001' });

  const count = await db.invoice.count({ where: { businessId } });
  const year = new Date().getFullYear();
  const number = `${year}-${String(count + 1).padStart(4, '0')}`;
  return NextResponse.json({ number });
}
