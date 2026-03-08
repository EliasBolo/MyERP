import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

async function getBusinessId(session: any) {
  const user = session?.user as any;
  return user?.businessId;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = await getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const products = await db.product.findMany({
    where: { businessId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = await getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const { name, sku, description, categoryId, unit, buyPrice, sellPrice, vatRate,
            currentStock, minStock, maxStock, barcode, isActive } = body;

    if (!name || !sku) {
      return NextResponse.json({ error: 'Απαιτούνται Όνομα και SKU' }, { status: 400 });
    }

    const existing = await db.product.findUnique({ where: { sku_businessId: { sku, businessId } } });
    if (existing) return NextResponse.json({ error: 'Το SKU υπάρχει ήδη' }, { status: 409 });

    const product = await db.product.create({
      data: {
        name, sku, description: description || null, businessId,
        categoryId: categoryId || null, unit: unit || 'τεμ',
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

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
