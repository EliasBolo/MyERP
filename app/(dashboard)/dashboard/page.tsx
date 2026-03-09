'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardStats {
  revenue: { value: number; change: number };
  costs: { value: number; change: number };
  clients: { value: number; change: number };
  products: { value: number; lowStock: number };
  pendingInvoices: { value: number; amount: number };
  profit: { value: number; margin: number };
  monthlyData: Array<{ month: string; revenue: number; costs: number; profit: number }>;
  recentInvoices: Array<any>;
  lowStockProducts: Array<any>;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{ name?: string; vatNumber?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/settings/business')
      .then((r) => r.json())
      .then((data) => setBusinessInfo(data.business ?? null))
      .catch(() => setBusinessInfo(null));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: t('totalRevenue'),
      value: formatCurrency(stats?.revenue.value ?? 0),
      change: stats?.revenue.change ?? 0,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      title: t('totalCosts'),
      value: formatCurrency(stats?.costs.value ?? 0),
      change: stats?.costs.change ?? 0,
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      invertChange: true,
    },
    {
      title: t('totalClients'),
      value: String(stats?.clients.value ?? 0),
      change: stats?.clients.change ?? 0,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      title: t('totalProducts'),
      value: String(stats?.products.value ?? 0),
      change: 0,
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      subtitle: stats?.products.lowStock
        ? `${stats.products.lowStock} χαμηλό απόθεμα`
        : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">Επισκόπηση δραστηριότητας επιχείρησης</p>
        </div>
        <div className="rounded-lg border border-border bg-card/70 px-3 py-2 lg:min-w-[260px]">
          <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <div className="text-muted-foreground">Επιχείρηση</div>
            <div className="text-muted-foreground">ΑΦΜ</div>
            <div className="text-muted-foreground">Χρήστης</div>
            <div className="truncate font-medium text-foreground">
              {businessInfo?.name || '—'}
            </div>
            <div className="truncate font-medium text-foreground">
              {businessInfo?.vatNumber || '—'}
            </div>
            <div className="truncate font-medium text-foreground">
              {(session?.user as any)?.name || (session?.user as any)?.email || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isPositive = card.invertChange ? card.change <= 0 : card.change >= 0;
          return (
            <div key={card.title} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
                  {card.subtitle && (
                    <p className="mt-1 text-xs text-yellow-400">{card.subtitle}</p>
                  )}
                  {card.change !== 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {isPositive ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span
                        className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {Math.abs(card.change).toFixed(1)}% {t('vsLastMonth')}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`rounded-xl p-2.5 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profit card + pending invoices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">{t('profit')}</p>
            <span className="badge badge-success">
              {stats?.profit.margin.toFixed(1)}% margin
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(stats?.profit.value ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('thisMonth')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">{t('pendingInvoices')}</p>
            <Receipt className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-foreground">{stats?.pendingInvoices.value ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Αξία: {formatCurrency(stats?.pendingInvoices.amount ?? 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue vs Costs chart */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('revenueVsCosts')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats?.monthlyData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 22%)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(215 16% 57%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(215 16% 57%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{
                  backgroundColor: 'hsl(222 47% 14%)',
                  border: '1px solid hsl(217 32% 22%)',
                  borderRadius: '8px',
                  color: 'hsl(213 31% 91%)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Έσοδα"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="costs"
                name="Έξοδα"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Κέρδος"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock alerts */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-foreground">{t('lowStock')}</h3>
          </div>
          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.lowStockProducts.slice(0, 6).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="flex-shrink-0 ml-2 text-right">
                    <span
                      className={`badge ${
                        product.currentStock <= 0
                          ? 'badge-danger'
                          : product.currentStock <= product.minStock
                          ? 'badge-warning'
                          : 'badge-neutral'
                      }`}
                    >
                      {product.currentStock} {product.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Όλα τα προϊόντα σε επαρκές απόθεμα ✓
            </p>
          )}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Πρόσφατα Τιμολόγια</h3>
          <a href="/invoices" className="text-xs text-primary hover:underline">
            Προβολή όλων →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th>Αριθμός</th>
                <th>Πελάτης</th>
                <th>Ημερομηνία</th>
                <th>Κατάσταση</th>
                <th className="text-right">Ποσό</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                stats.recentInvoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs text-primary">#{inv.number}</td>
                    <td className="text-sm">{inv.client?.name}</td>
                    <td className="text-sm text-muted-foreground">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          inv.status === 'paid'
                            ? 'badge-success'
                            : inv.status === 'overdue'
                            ? 'badge-danger'
                            : inv.status === 'sent'
                            ? 'badge-info'
                            : 'badge-neutral'
                        }`}
                      >
                        {inv.status === 'paid'
                          ? 'Πληρώθηκε'
                          : inv.status === 'overdue'
                          ? 'Ληξιπρόθεσμο'
                          : inv.status === 'sent'
                          ? 'Εστάλη'
                          : 'Πρόχειρο'}
                      </span>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(inv.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Δεν υπάρχουν τιμολόγια
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
