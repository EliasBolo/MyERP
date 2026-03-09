import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ lots: [] });

  const lots = await db.lotNumber.findMany({
    where: { businessId },
    include: {
      invoice: {
        select: { id: true, number: true, type: true, issueDate: true, total: true },
        include: { client: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ lots });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const { invoiceId, lotNumber: customLotNumber } = body as { invoiceId: string; lotNumber?: string };

    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json({ error: 'Invoice is required' }, { status: 400 });
    }

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { client: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let lotNumberValue: string;
    if (customLotNumber && String(customLotNumber).trim()) {
      lotNumberValue = String(customLotNumber).trim().toUpperCase();
    } else {
      const year = new Date().getFullYear();
      const count = await db.lotNumber.count({
        where: { businessId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      });
      lotNumberValue = `LOT-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    const existing = await db.lotNumber.findUnique({
      where: { lotNumber_businessId: { lotNumber: lotNumberValue, businessId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'This lot number already exists' }, { status: 409 });
    }

    const lot = await db.lotNumber.create({
      data: { lotNumber: lotNumberValue, invoiceId, businessId },
      include: {
        invoice: {
          select: { id: true, number: true, type: true, issueDate: true, total: true },
          include: { client: { select: { id: true, name: true, code: true } } },
        },
      },
    });
    return NextResponse.json({ lot }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
