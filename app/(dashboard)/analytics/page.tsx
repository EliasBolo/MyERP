'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('thisYear');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const tooltipStyle = {
    backgroundColor: 'hsl(222 47% 14%)',
    border: '1px solid hsl(217 32% 22%)',
    borderRadius: '8px',
    color: 'hsl(213 31% 91%)',
    fontSize: '12px',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">Οικονομική επισκόπηση και τάσεις</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="last30">Τελευταίες 30 ημέρες</option>
          <option value="last90">Τελευταίες 90 ημέρες</option>
          <option value="thisYear">Φέτος</option>
          <option value="lastYear">Πέρυσι</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: t('revenue'),
            value: formatCurrency(data?.totals?.revenue ?? 0),
            icon: TrendingUp,
            color: 'text-green-400',
            bg: 'bg-green-400/10',
          },
          {
            label: t('costs'),
            value: formatCurrency(data?.totals?.costs ?? 0),
            icon: TrendingDown,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
          },
          {
            label: t('netProfit'),
            value: formatCurrency(data?.totals?.profit ?? 0),
            icon: DollarSign,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
          },
          {
            label: t('profitMargin'),
            value: `${(data?.totals?.margin ?? 0).toFixed(1)}%`,
            icon: Percent,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue vs Costs chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Έσοδα vs Έξοδα vs Κέρδος</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data?.monthly ?? []}>
            <defs>
              <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="costs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 22%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 16% 57%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 57%)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="revenue" name="Έσοδα" stroke="#3b82f6" fill="url(#revenue)" strokeWidth={2} />
            <Area type="monotone" dataKey="costs" name="Έξοδα" stroke="#ef4444" fill="url(#costs)" strokeWidth={2} />
            <Area type="monotone" dataKey="profit" name="Κέρδος" stroke="#22c55e" fill="url(#profit)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top clients */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('topClients')}</h3>
          {data?.topClients?.length > 0 ? (
            <div className="space-y-3">
              {data.topClients.map((client: any, i: number) => (
                <div key={client.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs font-bold text-foreground ml-2 flex-shrink-0">
                        {formatCurrency(client.total)}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${(client.total / (data.topClients[0]?.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Δεν υπάρχουν δεδομένα</p>
          )}
        </div>

        {/* Monthly bar chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Μηνιαία Σύγκριση</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 22%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215 16% 57%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215 16% 57%)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" name="Έσοδα" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="costs" name="Έξοδα" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
