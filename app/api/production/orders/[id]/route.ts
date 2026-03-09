import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getBusinessId(session: any): string | null {
  return ((session?.user as any)?.businessId as string) || null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const order = await db.productionOrder.findFirst({
    where: { id: params.id, businessId },
    include: {
      outputProduct: { select: { id: true, name: true, sku: true, unit: true } },
      phases: {
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const { status, notes, title } = body as { status?: string; notes?: string; title?: string };

    const existing = await db.productionOrder.findFirst({
      where: { id: params.id, businessId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot edit completed/cancelled order' }, { status: 400 });
    }

    const validStatuses = ['draft', 'in_progress', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await db.productionOrder.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(title?.trim() ? { title: title.trim() } : {}),
      },
      include: {
        outputProduct: { select: { id: true, name: true, sku: true, unit: true } },
        phases: {
          include: {
            items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
