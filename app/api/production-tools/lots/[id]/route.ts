import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const { id } = await params;
  const lot = await db.lotNumber.findFirst({
    where: { id, businessId },
    include: {
      invoice: {
        select: { number: true },
        include: { client: { select: { name: true, code: true } } },
      },
    },
  });
  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  return NextResponse.json({
    id: lot.id,
    lotNumber: lot.lotNumber,
    invoiceNumber: lot.invoice.number,
    clientName: lot.invoice.client.name,
    clientCode: lot.invoice.client.code,
  });
}
