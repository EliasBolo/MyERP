'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Edit2, Trash2, TrendingDown, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-csv';
import { exportToPDF } from '@/lib/export-pdf';
import CostModal from '@/components/costs/CostModal';

const CATEGORY_COLORS: Record<string, string> = {
  payroll: '#3b82f6',
  rent: '#8b5cf6',
  utilities: '#f59e0b',
  marketing: '#10b981',
  operations: '#ef4444',
  other: '#6b7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  payroll: 'Μισθοδοσία',
  rent: 'Ενοίκιο',
  utilities: 'Λογαριασμοί',
  marketing: 'Marketing',
  operations: 'Λειτουργικά',
  other: 'Άλλα',
};

export default function CostsPage() {
  const t = useTranslations('costs');
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);

  useEffect(() => {
    loadCosts();
  }, []);

  async function loadCosts() {
    setLoading(true);
    const res = await fetch('/api/costs');
    const data = await res.json();
    setCosts(data.costs ?? []);
    setLoading(false);
  }

  const filtered = costs.filter((c) => {
    const matchSearch =
      !search ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      (c.vendor && c.vendor.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'all' || c.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const total = filtered.reduce((sum, c) => sum + c.amount, 0);

  const pieData = Object.entries(
    filtered.reduce((acc: Record<string, number>, c) => {
      acc[c.category] = (acc[c.category] || 0) + c.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value, key: name }));

  async function handleDelete(id: string) {
    if (!confirm('Διαγραφή εξόδου;')) return;
    await fetch(`/api/costs/${id}`, { method: 'DELETE' });
    loadCosts();
  }

  function handleExportCSV() {
    exportToCSV(filtered, [
      { header: 'Κατηγορία', key: 'categoryLabel' },
      { header: 'Περιγραφή', key: 'description' },
      { header: 'Ποσό', key: 'amount' },
      { header: 'Ημερομηνία', key: 'dateFmt' },
      { header: 'Επανάληψη', key: 'recurrence' },
      { header: 'Προμηθευτής', key: 'vendor' },
    ], 'costs');
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">
            Σύνολο: <span className="font-semibold text-red-400">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:block">CSV</span>
          </button>
          <button
            onClick={() => { setSelectedCost(null); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addCost')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Costs list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Αναζήτηση εξόδου..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Όλες οι κατηγορίες</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th>Κατηγορία</th>
                      <th>Περιγραφή</th>
                      <th className="hidden sm:table-cell">Ημερομηνία</th>
                      <th className="hidden md:table-cell">Επανάληψη</th>
                      <th className="text-right">Ποσό</th>
                      <th className="text-right">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>Δεν βρέθηκαν έξοδα</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((cost) => (
                        <tr key={cost.id}>
                          <td>
                            <span className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[cost.category] || '#6b7280' }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[cost.category] || cost.category}
                              </span>
                            </span>
                          </td>
                          <td>
                            <div>
                              <p className="text-sm font-medium text-foreground">{cost.description}</p>
                              {cost.vendor && (
                                <p className="text-xs text-muted-foreground">{cost.vendor}</p>
                              )}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDate(cost.date)}
                          </td>
                          <td className="hidden md:table-cell">
                            {cost.recurrence && cost.recurrence !== 'once' && (
                              <span className="badge badge-info text-xs">
                                {cost.recurrence === 'monthly' ? 'Μηνιαία' :
                                 cost.recurrence === 'quarterly' ? 'Τριμηνιαία' : 'Ετήσια'}
                              </span>
                            )}
                          </td>
                          <td className="text-right font-medium text-red-400">
                            {formatCurrency(cost.amount)}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedCost(cost); setShowModal(true); }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(cost.id)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('byCategoryChart')}</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={CATEGORY_COLORS[entry.key] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{
                      backgroundColor: 'hsl(222 47% 14%)',
                      border: '1px solid hsl(217 32% 22%)',
                      borderRadius: '8px',
                      color: 'hsl(213 31% 91%)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[entry.key] || '#6b7280' }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Δεν υπάρχουν δεδομένα
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CostModal
          cost={selectedCost}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadCosts(); }}
        />
      )}
    </div>
  );
}
