import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const user = session.user as any;
  if (user.role !== 'business_admin' && user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, filename } = await req.json();

    // Parse CSV data (basic implementation - parse by entity type)
    let rows: any[] = [];
    try {
      rows = JSON.parse(data);
    } catch {
      // Try CSV parsing
      const lines = data.split('\n').filter((l: string) => l.trim());
      if (lines.length < 2) return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });

      const headers = lines[0].split(';').map((h: string) => h.replace(/"/g, '').trim());
      rows = lines.slice(1).map((line: string) => {
        const values = line.split(';').map((v: string) => v.replace(/"/g, '').trim());
        return headers.reduce((obj: any, header: string, i: number) => {
          obj[header] = values[i] ?? '';
          return obj;
        }, {});
      });
    }

    let imported = 0;

    // Detect entity type from filename
    if (filename?.includes('clients')) {
      for (const row of rows) {
        if (!row.name && !row.code) continue;
        try {
          await db.client.upsert({
            where: { code_businessId: { code: row.code || `CL${Date.now()}`, businessId } },
            update: { name: row.name, email: row.email || null, phone: row.phone || null },
            create: {
              code: row.code || `CL${Date.now()}`,
              name: row.name,
              businessId,
              email: row.email || null,
              phone: row.phone || null,
              vatNumber: row.vatNumber || null,
              type: row.type || 'customer',
            },
          });
          imported++;
        } catch {}
      }
    } else if (filename?.includes('storage')) {
      for (const row of rows) {
        if (!row.sku || !row.name) continue;
        try {
          await db.product.upsert({
            where: { sku_businessId: { sku: row.sku, businessId } },
            update: {
              name: row.name,
              buyPrice: parseFloat(row.buyPrice) || 0,
              sellPrice: parseFloat(row.sellPrice) || 0,
              currentStock: parseFloat(row.currentStock) || 0,
            },
            create: {
              sku: row.sku,
              name: row.name,
              businessId,
              unit: row.unit || 'τεμ',
              buyPrice: parseFloat(row.buyPrice) || 0,
              sellPrice: parseFloat(row.sellPrice) || 0,
              vatRate: parseFloat(row.vatRate) || 24,
              currentStock: parseFloat(row.currentStock) || 0,
              minStock: parseFloat(row.minStock) || 0,
            },
          });
          imported++;
        } catch {}
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
