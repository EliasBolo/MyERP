import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getBusinessId(session: any): string | null {
  return ((session?.user as any)?.businessId as string) || null;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const existing = await db.productionOrder.findFirst({
      where: { id: params.id, businessId },
      include: {
        outputProduct: { select: { id: true, name: true, currentStock: true } },
        phases: {
          include: {
            items: { include: { product: { select: { id: true, name: true, currentStock: true, unit: true } } } },
          },
        },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Production order already completed' }, { status: 400 });
    }
    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Cancelled orders cannot be completed' }, { status: 400 });
    }

    // Pre-check stock before transaction for clearer feedback.
    for (const phase of existing.phases) {
      for (const item of phase.items) {
        const qty = Number(item.actualQty ?? item.plannedQty ?? 0);
        if (qty <= 0) continue;
        if (item.product.currentStock < qty) {
          return NextResponse.json(
            {
              error: `Ανεπαρκές απόθεμα για ${item.product.name}. Διαθέσιμο: ${item.product.currentStock}, απαιτούμενο: ${qty}`,
            },
            { status: 409 }
          );
        }
      }
    }

    const completed = await db.$transaction(async (tx) => {
      let materialsTotal = 0;
      let laborTotal = 0;
      let overheadTotal = 0;

      for (const phase of existing.phases) {
        laborTotal += Number(phase.laborCost || 0);
        overheadTotal += Number(phase.overheadCost || 0);

        for (const item of phase.items) {
          const qty = Number(item.actualQty ?? item.plannedQty ?? 0);
          if (qty <= 0) continue;

          const lineCost = qty * Number(item.unitCostSnapshot || 0);
          materialsTotal += lineCost;

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: qty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: qty,
              unitPrice: Number(item.unitCostSnapshot || 0),
              reference: existing.code,
              notes: `Κατανάλωση παραγωγής (${phase.name})`,
            },
          });

          await tx.productionPhaseItem.update({
            where: { id: item.id },
            data: { totalCost: lineCost, actualQty: qty },
          });
        }

        await tx.productionPhase.update({
          where: { id: phase.id },
          data: { status: 'completed', completedAt: new Date() },
        });
      }

      const grandTotal = materialsTotal + laborTotal + overheadTotal;
      const outputQty = Number(existing.outputQuantity || 0);
      const outputUnitCost = outputQty > 0 ? grandTotal / outputQty : 0;

      if (outputQty > 0) {
        await tx.product.update({
          where: { id: existing.outputProductId },
          data: { currentStock: { increment: outputQty } },
        });

        await tx.stockMovement.create({
          data: {
            productId: existing.outputProductId,
            type: 'IN',
            quantity: outputQty,
            unitPrice: outputUnitCost,
            reference: existing.code,
            notes: 'Ολοκλήρωση παραγωγής',
          },
        });
      }

      return tx.productionOrder.update({
        where: { id: existing.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          materialsTotal,
          laborTotal,
          overheadTotal,
          grandTotal,
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
    });

    return NextResponse.json({ order: completed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
