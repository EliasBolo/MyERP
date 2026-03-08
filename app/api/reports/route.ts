import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ rows: [], columns: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'inventory';
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

  try {
    switch (type) {
      case 'inventory': {
        const products = await db.product.findMany({
          where: { businessId },
          include: { category: true },
          orderBy: { name: 'asc' },
        });
        return NextResponse.json({
          columns: [
            { header: 'SKU', key: 'sku' },
            { header: 'Προϊόν', key: 'name' },
            { header: 'Κατηγορία', key: 'category' },
            { header: 'Απόθεμα', key: 'stock' },
            { header: 'Μονάδα', key: 'unit' },
            { header: 'Τιμή Αγοράς', key: 'buyPrice' },
            { header: 'Τιμή Πώλησης', key: 'sellPrice' },
            { header: 'Αξία Αποθ.', key: 'stockValue' },
          ],
          pdfColumns: [
            { header: 'SKU', dataKey: 'sku' },
            { header: 'Προϊόν', dataKey: 'name' },
            { header: 'Απόθεμα', dataKey: 'stock' },
            { header: 'Μον.', dataKey: 'unit' },
            { header: 'Τιμή Πώλησης', dataKey: 'sellPrice' },
            { header: 'Αξία', dataKey: 'stockValue' },
          ],
          rows: products.map((p) => ({
            sku: p.sku,
            name: p.name,
            category: p.category?.name ?? '—',
            stock: p.currentStock,
            unit: p.unit,
            buyPrice: formatCurrency(p.buyPrice),
            sellPrice: formatCurrency(p.sellPrice),
            stockValue: formatCurrency(p.currentStock * p.buyPrice),
          })),
        });
      }

      case 'clients': {
        const clients = await db.client.findMany({
          where: { businessId },
          orderBy: { name: 'asc' },
        });
        return NextResponse.json({
          columns: [
            { header: 'Κωδικός', key: 'code' },
            { header: 'Επωνυμία', key: 'name' },
            { header: 'ΑΦΜ', key: 'vatNumber' },
            { header: 'Τύπος', key: 'type' },
            { header: 'Email', key: 'email' },
            { header: 'Τηλ.', key: 'phone' },
            { header: 'Πόλη', key: 'city' },
          ],
          pdfColumns: [
            { header: 'Κωδικός', dataKey: 'code' },
            { header: 'Επωνυμία', dataKey: 'name' },
            { header: 'ΑΦΜ', dataKey: 'vatNumber' },
            { header: 'Email', dataKey: 'email' },
            { header: 'Τηλ.', dataKey: 'phone' },
          ],
          rows: clients.map((c) => ({
            code: c.code,
            name: c.name,
            vatNumber: c.vatNumber ?? '—',
            type: c.type === 'customer' ? 'Πελάτης' : c.type === 'supplier' ? 'Προμηθευτής' : 'Και τα δύο',
            email: c.email ?? '—',
            phone: c.phone ?? '—',
            city: c.city ?? '—',
          })),
        });
      }

      case 'costs': {
        const dateWhere = from && to ? { date: { gte: from, lte: to } } : {};
        const costs = await db.cost.findMany({
          where: { businessId, ...dateWhere },
          orderBy: { date: 'desc' },
        });
        const CATEGORIES: Record<string, string> = {
          payroll: 'Μισθοδοσία', rent: 'Ενοίκιο', utilities: 'Λογαριασμοί',
          marketing: 'Marketing', operations: 'Λειτουργικά', other: 'Άλλα',
        };
        return NextResponse.json({
          columns: [
            { header: 'Ημερομηνία', key: 'date' },
            { header: 'Κατηγορία', key: 'category' },
            { header: 'Περιγραφή', key: 'description' },
            { header: 'Προμηθευτής', key: 'vendor' },
            { header: 'Επανάληψη', key: 'recurrence' },
            { header: 'Ποσό', key: 'amount' },
          ],
          pdfColumns: [
            { header: 'Ημερομηνία', dataKey: 'date' },
            { header: 'Κατηγορία', dataKey: 'category' },
            { header: 'Περιγραφή', dataKey: 'description' },
            { header: 'Ποσό', dataKey: 'amount' },
          ],
          rows: costs.map((c) => ({
            date: formatDate(c.date),
            category: CATEGORIES[c.category] ?? c.category,
            description: c.description,
            vendor: c.vendor ?? '—',
            recurrence: c.recurrence ?? 'once',
            amount: formatCurrency(c.amount),
          })),
        });
      }

      case 'sales': {
        const dateWhere = from && to ? { issueDate: { gte: from, lte: to } } : {};
        const invoices = await db.invoice.findMany({
          where: { businessId, type: 'SALE', ...dateWhere },
          include: { client: { select: { name: true } } },
          orderBy: { issueDate: 'desc' },
        });
        const STATUS: Record<string, string> = {
          draft: 'Πρόχειρο', sent: 'Εστάλη', paid: 'Πληρώθηκε',
          overdue: 'Ληξιπρόθεσμο', cancelled: 'Ακυρώθηκε',
        };
        return NextResponse.json({
          columns: [
            { header: 'Αριθμός', key: 'number' },
            { header: 'Πελάτης', key: 'client' },
            { header: 'Ημ/νία', key: 'date' },
            { header: 'Κατάσταση', key: 'status' },
            { header: 'Υποσύνολο', key: 'subtotal' },
            { header: 'ΦΠΑ', key: 'vat' },
            { header: 'Σύνολο', key: 'total' },
          ],
          pdfColumns: [
            { header: 'Αριθμός', dataKey: 'number' },
            { header: 'Πελάτης', dataKey: 'client' },
            { header: 'Ημ/νία', dataKey: 'date' },
            { header: 'Κατάσταση', dataKey: 'status' },
            { header: 'Σύνολο', dataKey: 'total' },
          ],
          rows: invoices.map((inv) => ({
            number: inv.number,
            client: inv.client?.name ?? '—',
            date: formatDate(inv.issueDate),
            status: STATUS[inv.status] ?? inv.status,
            subtotal: formatCurrency(inv.subtotal),
            vat: formatCurrency(inv.vatAmount),
            total: formatCurrency(inv.total),
          })),
        });
      }

      case 'financial': {
        const dateWhere = from && to ? { gte: from, lte: to } : {};
        const [invoices, costs] = await Promise.all([
          db.invoice.findMany({
            where: { businessId, status: 'paid', ...(from && to ? { issueDate: dateWhere } : {}) },
            select: { total: true },
          }),
          db.cost.findMany({
            where: { businessId, ...(from && to ? { date: dateWhere } : {}) },
            select: { amount: true, category: true },
          }),
        ]);

        const revenue = invoices.reduce((s, i) => s + i.total, 0);
        const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

        return NextResponse.json({
          columns: [
            { header: 'Κατηγορία', key: 'label' },
            { header: 'Ποσό', key: 'amount' },
          ],
          pdfColumns: [
            { header: 'Κατηγορία', dataKey: 'label' },
            { header: 'Ποσό', dataKey: 'amount' },
          ],
          rows: [
            { label: 'Συνολικά Έσοδα', amount: formatCurrency(revenue) },
            { label: 'Συνολικά Έξοδα', amount: formatCurrency(totalCosts) },
            { label: 'Καθαρό Κέρδος', amount: formatCurrency(revenue - totalCosts) },
            { label: 'Περιθώριο Κέρδους', amount: revenue > 0 ? `${(((revenue - totalCosts) / revenue) * 100).toFixed(1)}%` : '0%' },
          ],
        });
      }

      default:
        return NextResponse.json({ rows: [], columns: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
