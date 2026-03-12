import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  try {
    const category = await db.costCategory.update({
      where: { id, businessId },
      data: {
        ...(body.name != null && { name: String(body.name).trim() }),
        ...(body.color != null && { color: String(body.color).trim() }),
        ...(body.order != null && { order: Number(body.order) }),
      },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Κατηγορία δεν βρέθηκε' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const { id } = await params;

  const costCount = await db.cost.count({
    where: { costCategoryId: id, businessId },
  });

  if (costCount > 0) {
    return NextResponse.json(
      { error: `Δεν μπορείτε να διαγράψετε κατηγορία που χρησιμοποιείται από ${costCount} έξοδο(α).` },
      { status: 409 }
    );
  }

  try {
    await db.costCategory.delete({ where: { id, businessId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Κατηγορία δεν βρέθηκε' }, { status: 404 });
  }
}
