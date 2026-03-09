import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import QRCode from 'qrcode';

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
    select: { lotNumber: true },
  });
  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  try {
    const dataUrl = await QRCode.toDataURL(lot.lotNumber, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    return NextResponse.json({ dataUrl, lotNumber: lot.lotNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
