import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // If only updating status
    if (body.status && Object.keys(body).length === 1) {
      const invoice = await db.invoice.update({
        where: { id: params.id },
        data: { status: body.status },
      });
      return NextResponse.json({ invoice });
    }

    // Full update
    const { items, subtotal, vatAmount, total, ...rest } = body;

    // Delete existing items and recreate
    await db.invoiceItem.deleteMany({ where: { invoiceId: params.id } });

    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: {
        ...rest,
        issueDate: rest.issueDate ? new Date(rest.issueDate) : undefined,
        dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
        subtotal: parseFloat(subtotal) || 0,
        vatAmount: parseFloat(vatAmount) || 0,
        total: parseFloat(total) || 0,
        items: {
          create: (items || []).map((item: any) => ({
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

    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
