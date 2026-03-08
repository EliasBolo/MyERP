import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { productId, type, quantity, unitPrice, warehouseId, reference, notes } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });

    // Create movement
    const movement = await db.stockMovement.create({
      data: {
        productId,
        type,
        quantity: qty,
        unitPrice: parseFloat(unitPrice) || 0,
        warehouseId: warehouseId || null,
        reference: reference || null,
        notes: notes || null,
      },
    });

    // Update product stock
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    let newStock: number;
    if (type === 'IN') {
      newStock = product.currentStock + qty;
    } else if (type === 'OUT') {
      newStock = Math.max(0, product.currentStock - qty);
    } else {
      // ADJUSTMENT - set directly
      newStock = qty;
    }

    await db.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    return NextResponse.json({ movement, newStock }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  const where = productId ? { productId } : {};
  const movements = await db.stockMovement.findMany({
    where,
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ movements });
}
