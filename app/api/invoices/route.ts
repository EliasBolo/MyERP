import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ invoices: [] });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') || undefined;

  const invoices = await db.invoice.findMany({
    where: { businessId, ...(clientId && { clientId }) },
    include: {
      client: { select: { id: true, name: true, code: true, vatNumber: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const { number, type, clientId, issueDate, dueDate, notes, paymentTerms, items, subtotal, vatAmount, total } = body;

    const existing = await db.invoice.findUnique({
      where: { number_businessId: { number, businessId } },
    });
    if (existing) return NextResponse.json({ error: 'Ο αριθμός τιμολογίου υπάρχει ήδη' }, { status: 409 });

    const invoice = await db.invoice.create({
      data: {
        number,
        type: type || 'SALE',
        clientId,
        businessId,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        paymentTerms: paymentTerms || null,
        subtotal: parseFloat(subtotal) || 0,
        vatAmount: parseFloat(vatAmount) || 0,
        total: parseFloat(total) || 0,
        status: 'draft',
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            productId: item.productId || null,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            vatRate: parseFloat(item.vatRate),
            vatAmount: parseFloat(item.vatAmount),
            total: parseFloat(item.total),
          })),
        },
      },
      include: { items: true, client: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
