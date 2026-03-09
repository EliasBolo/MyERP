import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getBusinessId(session: any): string | null {
  return ((session?.user as any)?.businessId as string) || null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = getBusinessId(session);
  if (!businessId) return NextResponse.json({ rows: [], columns: [] });

  const sp = req.nextUrl.searchParams;
  const period = sp.get('period') || 'month'; // month | year | custom
  const status = sp.get('status') || '';
  const year = Number(sp.get('year') || new Date().getFullYear());
  const month = Number(sp.get('month') || new Date().getMonth() + 1);
  const from = sp.get('from');
  const to = sp.get('to');

  let startDate = new Date(year, new Date().getMonth(), 1);
  let endDate = new Date(year, new Date().getMonth() + 1, 1);

  if (period === 'year') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 1);
  } else if (period === 'custom' && from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === 'month') {
    startDate = new Date(year, Math.max(0, month - 1), 1);
    endDate = new Date(year, Math.max(0, month - 1) + 1, 1);
  }

  const orders = await db.productionOrder.findMany({
    where: {
      businessId,
      ...(status ? { status } : {}),
      createdAt: { gte: startDate, lt: endDate },
    },
    include: {
      outputProduct: { select: { id: true, name: true, sku: true, unit: true } },
      phases: {
        include: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = orders.map((order) => ({
    code: order.code,
    title: order.title,
    status: order.status,
    createdAt: new Date(order.createdAt).toLocaleDateString('el-GR'),
    completedAt: order.completedAt ? new Date(order.completedAt).toLocaleDateString('el-GR') : '—',
    outputProduct: order.outputProduct?.name || '—',
    outputQty: Number(order.outputQuantity || 0).toFixed(2),
    phases: order.phases.length,
    materialsTotal: order.materialsTotal.toFixed(2),
    laborTotal: order.laborTotal.toFixed(2),
    overheadTotal: order.overheadTotal.toFixed(2),
    grandTotal: order.grandTotal.toFixed(2),
  }));

  const columns = [
    { key: 'code', header: 'Κωδικός' },
    { key: 'title', header: 'Παραγωγή' },
    { key: 'status', header: 'Κατάσταση' },
    { key: 'createdAt', header: 'Έναρξη' },
    { key: 'completedAt', header: 'Ολοκλήρωση' },
    { key: 'outputProduct', header: 'Τελικό Προϊόν' },
    { key: 'outputQty', header: 'Ποσότητα' },
    { key: 'phases', header: 'Φάσεις' },
    { key: 'materialsTotal', header: 'Υλικά (€)' },
    { key: 'laborTotal', header: 'Εργασία (€)' },
    { key: 'overheadTotal', header: 'Γενικά Έξοδα (€)' },
    { key: 'grandTotal', header: 'Σύνολο (€)' },
  ];

  const pdfColumns = [
    { header: 'Κωδικός', dataKey: 'code' },
    { header: 'Παραγωγή', dataKey: 'title' },
    { header: 'Κατάσταση', dataKey: 'status' },
    { header: 'Έναρξη', dataKey: 'createdAt' },
    { header: 'Ολοκλήρωση', dataKey: 'completedAt' },
    { header: 'Τελικό Προϊόν', dataKey: 'outputProduct' },
    { header: 'Ποσότητα', dataKey: 'outputQty' },
    { header: 'Φάσεις', dataKey: 'phases' },
    { header: 'Υλικά (€)', dataKey: 'materialsTotal' },
    { header: 'Εργασία (€)', dataKey: 'laborTotal' },
    { header: 'Γενικά (€)', dataKey: 'overheadTotal' },
    { header: 'Σύνολο (€)', dataKey: 'grandTotal' },
  ];

  const summary = {
    totalOrders: orders.length,
    totalGrandCost: orders.reduce((s, x) => s + Number(x.grandTotal || 0), 0),
    totalMaterials: orders.reduce((s, x) => s + Number(x.materialsTotal || 0), 0),
    totalLabor: orders.reduce((s, x) => s + Number(x.laborTotal || 0), 0),
    totalOverhead: orders.reduce((s, x) => s + Number(x.overheadTotal || 0), 0),
  };

  return NextResponse.json({ rows, columns, pdfColumns, summary });
}
