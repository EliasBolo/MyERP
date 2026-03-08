import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, sku, description, categoryId, unit, buyPrice, sellPrice, vatRate,
            currentStock, minStock, maxStock, barcode, isActive } = body;

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        name, sku, description: description || null,
        categoryId: categoryId || null, unit,
        buyPrice: parseFloat(buyPrice) || 0,
        sellPrice: parseFloat(sellPrice) || 0,
        vatRate: parseFloat(vatRate) || 24,
        currentStock: parseFloat(currentStock) || 0,
        minStock: parseFloat(minStock) || 0,
        maxStock: maxStock ? parseFloat(maxStock) : null,
        barcode: barcode || null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
