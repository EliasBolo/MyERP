import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { startOfYear, endOfYear, subYears, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ totals: {}, monthly: [], topClients: [] });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'thisYear';

  const now = new Date();
  let dateFrom: Date;
  let dateTo: Date = now;

  switch (period) {
    case 'last30':
      dateFrom = subDays(now, 30);
      break;
    case 'last90':
      dateFrom = subDays(now, 90);
      break;
    case 'lastYear':
      dateFrom = startOfYear(subYears(now, 1));
      dateTo = endOfYear(subYears(now, 1));
      break;
    default:
      dateFrom = startOfYear(now);
  }

  try {
    const [invoices, costs] = await Promise.all([
      db.invoice.findMany({
        where: { businessId, status: 'paid', issueDate: { gte: dateFrom, lte: dateTo } },
        select: { total: true, issueDate: true, clientId: true, client: { select: { id: true, name: true } } },
      }),
      db.cost.findMany({
        where: { businessId, date: { gte: dateFrom, lte: dateTo } },
        select: { amount: true, date: true, category: true },
      }),
    ]);

    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
    const profit = revenue - totalCosts;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Monthly breakdown (last 6 months or period)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const month = d.toLocaleDateString('el-GR', { month: 'short' });

      const mRev = invoices
        .filter((inv) => {
          const date = new Date(inv.issueDate);
          return date >= start && date <= end;
        })
        .reduce((s, i) => s + i.total, 0);

      const mCosts = costs
        .filter((c) => {
          const date = new Date(c.date);
          return date >= start && date <= end;
        })
        .reduce((s, c) => s + c.amount, 0);

      monthlyData.push({ month, revenue: mRev, costs: mCosts, profit: mRev - mCosts });
    }

    // Top clients by revenue
    const clientRevenue: Record<string, { id: string; name: string; total: number }> = {};
    invoices.forEach((inv) => {
      if (!inv.client) return;
      if (!clientRevenue[inv.clientId]) {
        clientRevenue[inv.clientId] = { id: inv.clientId, name: inv.client.name, total: 0 };
      }
      clientRevenue[inv.clientId].total += inv.total;
    });

    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return NextResponse.json({
      totals: { revenue, costs: totalCosts, profit, margin },
      monthly: monthlyData,
      topClients,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
