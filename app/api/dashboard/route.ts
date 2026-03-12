import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const businessId = user.businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  try {
    // Revenue (paid invoices this month)
    const [thisMonthInvoices, lastMonthInvoices] = await Promise.all([
      db.invoice.findMany({
        where: { businessId, status: 'paid', issueDate: { gte: thisMonthStart } },
        select: { total: true },
      }),
      db.invoice.findMany({
        where: { businessId, status: 'paid', issueDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        select: { total: true },
      }),
    ]);

    const thisRevenue = thisMonthInvoices.reduce((s, i) => s + i.total, 0);
    const lastRevenue = lastMonthInvoices.reduce((s, i) => s + i.total, 0);
    const revenueChange = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Costs
    const [thisMonthCosts, lastMonthCosts] = await Promise.all([
      db.cost.findMany({
        where: { businessId, date: { gte: thisMonthStart } },
        select: { amount: true, taxRate: true },
      }),
      db.cost.findMany({
        where: { businessId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
        select: { amount: true, taxRate: true },
      }),
    ]);

    const thisCosts = thisMonthCosts.reduce((s, c) => s + c.amount, 0);
    const lastCosts = lastMonthCosts.reduce((s, c) => s + c.amount, 0);
    const costsChange = lastCosts > 0 ? ((thisCosts - lastCosts) / lastCosts) * 100 : 0;

    // Taxes (from costs that have taxRate set)
    const thisMonthTaxes = thisMonthCosts.reduce(
      (s, c) => s + (c.taxRate != null ? c.amount * (c.taxRate / 100) : 0),
      0
    );
    const lastMonthTaxes = lastMonthCosts.reduce(
      (s, c) => s + (c.taxRate != null ? c.amount * (c.taxRate / 100) : 0),
      0
    );

    // Clients
    const [clientCount, newClients] = await Promise.all([
      db.client.count({ where: { businessId, isActive: true } }),
      db.client.count({ where: { businessId, createdAt: { gte: thisMonthStart } } }),
    ]);

    // Products
    const products = await db.product.findMany({
      where: { businessId, isActive: true },
      select: { currentStock: true, minStock: true },
    });
    const lowStockProducts = await db.product.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, sku: true, currentStock: true, minStock: true, unit: true },
      orderBy: { currentStock: 'asc' },
      take: 8,
    });

    // Pending invoices
    const pendingInvoices = await db.invoice.findMany({
      where: { businessId, status: { in: ['sent', 'overdue'] } },
      select: { total: true },
    });

    // Recent invoices
    const recentInvoices = await db.invoice.findMany({
      where: { businessId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    // Monthly data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const month = d.toLocaleDateString('el-GR', { month: 'short' });

      const [mRevInvoices, mCosts] = await Promise.all([
        db.invoice.findMany({
          where: { businessId, status: 'paid', issueDate: { gte: start, lte: end } },
          select: { total: true },
        }),
        db.cost.findMany({
          where: { businessId, date: { gte: start, lte: end } },
          select: { amount: true },
        }),
      ]);

      const revenue = mRevInvoices.reduce((s, i) => s + i.total, 0);
      const costs = mCosts.reduce((s, c) => s + c.amount, 0);
      monthlyData.push({ month, revenue, costs, profit: revenue - costs });
    }

    const profit = thisRevenue - thisCosts;
    const margin = thisRevenue > 0 ? (profit / thisRevenue) * 100 : 0;

    return NextResponse.json({
      revenue: { value: thisRevenue, change: revenueChange },
      costs: { value: thisCosts, change: costsChange },
      taxes: {
        thisMonth: thisMonthTaxes,
        lastMonth: lastMonthTaxes,
        change: lastMonthTaxes > 0 ? ((thisMonthTaxes - lastMonthTaxes) / lastMonthTaxes) * 100 : 0,
      },
      clients: { value: clientCount, change: newClients },
      products: {
        value: products.length,
        lowStock: lowStockProducts.filter((p) => p.currentStock <= p.minStock).length,
      },
      pendingInvoices: {
        value: pendingInvoices.length,
        amount: pendingInvoices.reduce((s, i) => s + i.total, 0),
      },
      profit: { value: profit, margin },
      monthlyData,
      recentInvoices,
      lowStockProducts: lowStockProducts.filter((p) => p.currentStock <= p.minStock),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
