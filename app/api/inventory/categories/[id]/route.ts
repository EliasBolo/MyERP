import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const user = session.user as any;
  if (user.role !== 'business_admin' && user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  try {
    const category = await db.category.update({
      where: { id: params.id, businessId },
      data: {
        name: body.name,
        description: body.description ?? null,
      },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const user = session.user as any;
  if (user.role !== 'business_admin' && user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if any products are using this category
  const productCount = await db.product.count({
    where: { categoryId: params.id, businessId },
  });

  if (productCount > 0) {
    return NextResponse.json(
      { error: `Δεν μπορείτε να διαγράψετε κατηγορία που χρησιμοποιείται από ${productCount} προϊόν(τα).` },
      { status: 409 }
    );
  }

  try {
    await db.category.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
}
