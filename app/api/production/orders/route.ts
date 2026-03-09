import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getBusinessId(session: any): string | null {
  return ((session?.user as any)?.businessId as string) || null;
}

function calculateTotals(phases: any[]) {
  const materialsTotal = phases.reduce(
    (sum, phase) =>
      sum +
      (phase.items || []).reduce((itemSum: number, item: any) => {
        const qty = Number(item.plannedQty || 0);
        const unitCost = Number(item.unitCostSnapshot || 0);
        return itemSum + qty * unitCost;
      }, 0),
    0
  );
  const laborTotal = phases.reduce((sum, phase) => sum + Number(phase.laborCost || 0), 0);
  const overheadTotal = phases.reduce((sum, phase) => sum + Number(phase.overheadCost || 0), 0);
  return {
    materialsTotal,
    laborTotal,
    overheadTotal,
    grandTotal: materialsTotal + laborTotal + overheadTotal,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ orders: [] });

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const period = sp.get('period'); // month | year
  const year = Number(sp.get('year') || new Date().getFullYear());
  const month = Number(sp.get('month') || new Date().getMonth() + 1);

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (period === 'month') {
    startDate = new Date(year, Math.max(0, month - 1), 1);
    endDate = new Date(year, Math.max(0, month - 1) + 1, 1);
  } else if (period === 'year') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 1);
  }

  const orders = await db.productionOrder.findMany({
    where: {
      businessId,
      ...(status ? { status } : {}),
      ...(startDate && endDate
        ? { createdAt: { gte: startDate, lt: endDate } }
        : {}),
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
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const {
      title,
      outputProductId,
      outputQuantity,
      notes,
      startDate,
      phases = [],
    } = body as {
      title: string;
      outputProductId: string;
      outputQuantity: number;
      notes?: string;
      startDate?: string;
      phases: Array<{
        name: string;
        laborCost?: number;
        overheadCost?: number;
        notes?: string;
        items: Array<{ productId: string; plannedQty: number; actualQty?: number }>;
      }>;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Ο τίτλος παραγωγής είναι υποχρεωτικός' }, { status: 400 });
    }
    if (!outputProductId) {
      return NextResponse.json({ error: 'Το τελικό προϊόν είναι υποχρεωτικό' }, { status: 400 });
    }
    if (!Array.isArray(phases) || phases.length === 0) {
      return NextResponse.json({ error: 'Προσθέστε τουλάχιστον μία φάση' }, { status: 400 });
    }

    const outputProduct = await db.product.findFirst({
      where: { id: outputProductId, businessId },
      select: { id: true },
    });
    if (!outputProduct) {
      return NextResponse.json({ error: 'Μη έγκυρο τελικό προϊόν' }, { status: 400 });
    }

    const allProductIds = Array.from(
      new Set(phases.flatMap((phase) => (phase.items || []).map((i) => i.productId)).filter(Boolean))
    );
    const products = await db.product.findMany({
      where: { businessId, id: { in: allProductIds } },
      select: { id: true, buyPrice: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const year = new Date().getFullYear();
    const count = await db.productionOrder.count({
      where: {
        businessId,
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const code = `PROD-${year}-${String(count + 1).padStart(4, '0')}`;

    const normalizedPhases = phases.map((phase, idx) => ({
      name: phase.name?.trim() || `Φάση ${idx + 1}`,
      sequence: idx + 1,
      laborCost: Number(phase.laborCost || 0),
      overheadCost: Number(phase.overheadCost || 0),
      notes: phase.notes || null,
      items: (phase.items || []).map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error('Βρέθηκε προϊόν φάσης που δεν ανήκει στην επιχείρηση');
        }
        const plannedQty = Number(item.plannedQty || 0);
        const unitCostSnapshot = Number(product.buyPrice || 0);
        return {
          productId: item.productId,
          plannedQty,
          actualQty: item.actualQty !== undefined ? Number(item.actualQty) : null,
          unitCostSnapshot,
          totalCost: plannedQty * unitCostSnapshot,
        };
      }),
    }));

    const totals = calculateTotals(normalizedPhases);

    const order = await db.productionOrder.create({
      data: {
        code,
        title: title.trim(),
        businessId,
        outputProductId,
        outputQuantity: Number(outputQuantity || 1),
        notes: notes || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        materialsTotal: totals.materialsTotal,
        laborTotal: totals.laborTotal,
        overheadTotal: totals.overheadTotal,
        grandTotal: totals.grandTotal,
        phases: {
          create: normalizedPhases.map((phase) => ({
            name: phase.name,
            sequence: phase.sequence,
            laborCost: phase.laborCost,
            overheadCost: phase.overheadCost,
            notes: phase.notes,
            items: {
              create: phase.items,
            },
          })),
        },
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

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
