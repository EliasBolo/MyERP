import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all';

  try {
    if (type === 'clients' || type === 'all') {
      const clients = await db.client.findMany({ where: { businessId } });

      if (type === 'clients') {
        return NextResponse.json({
          columns: [
            { header: 'code', key: 'code' },
            { header: 'name', key: 'name' },
            { header: 'vatNumber', key: 'vatNumber' },
            { header: 'type', key: 'type' },
            { header: 'email', key: 'email' },
            { header: 'phone', key: 'phone' },
            { header: 'address', key: 'address' },
            { header: 'city', key: 'city' },
          ],
          rows: clients,
        });
      }
    }

    if (type === 'storage') {
      const products = await db.product.findMany({ where: { businessId }, include: { category: true } });
      return NextResponse.json({
        columns: [
          { header: 'sku', key: 'sku' },
          { header: 'name', key: 'name' },
          { header: 'category', key: 'categoryName' },
          { header: 'unit', key: 'unit' },
          { header: 'buyPrice', key: 'buyPrice' },
          { header: 'sellPrice', key: 'sellPrice' },
          { header: 'vatRate', key: 'vatRate' },
          { header: 'currentStock', key: 'currentStock' },
          { header: 'minStock', key: 'minStock' },
        ],
        rows: products.map((p) => ({ ...p, categoryName: p.category?.name ?? '' })),
      });
    }

    if (type === 'financial') {
      const [invoices, costs] = await Promise.all([
        db.invoice.findMany({ where: { businessId }, include: { client: true } }),
        db.cost.findMany({ where: { businessId } }),
      ]);

      return NextResponse.json({
        columns: [
          { header: 'type', key: 'type' },
          { header: 'number', key: 'number' },
          { header: 'client', key: 'client' },
          { header: 'date', key: 'date' },
          { header: 'status', key: 'status' },
          { header: 'total', key: 'total' },
        ],
        rows: [
          ...invoices.map((i) => ({
            type: 'invoice',
            number: i.number,
            client: i.client?.name,
            date: i.issueDate,
            status: i.status,
            total: i.total,
          })),
          ...costs.map((c) => ({
            type: 'cost',
            number: c.category,
            client: c.vendor,
            date: c.date,
            status: c.recurrence,
            total: -c.amount,
          })),
        ],
      });
    }

    // All - return clients as default
    const clients = await db.client.findMany({ where: { businessId } });
    const products = await db.product.findMany({ where: { businessId } });
    return NextResponse.json({
      columns: [{ header: 'entity', key: 'entity' }, { header: 'name', key: 'name' }],
      rows: [
        ...clients.map((c) => ({ ...c, entity: 'client' })),
        ...products.map((p) => ({ ...p, entity: 'product' })),
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
