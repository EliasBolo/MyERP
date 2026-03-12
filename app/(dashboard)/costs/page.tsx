'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Edit2, Trash2, TrendingDown, Download, Tag, FileUp, FileText, RefreshCw, Printer, BarChart3, BarChart2Off } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-csv';
import CostModal from '@/components/costs/CostModal';
import CostCategoriesModal from '@/components/costs/CostCategoriesModal';

function getCostCategoryKey(cost: any): string {
  return cost.costCategoryId ?? cost.costCategory?.id ?? cost.category ?? 'other';
}

function getCostCategoryLabel(cost: any): string {
  return cost.costCategory?.name ?? cost.category ?? '—';
}

function getCostCategoryColor(cost: any, categoryMap: Map<string, { name: string; color: string }>): string {
  const key = cost.costCategoryId ?? cost.costCategory?.id;
  if (key && categoryMap.has(key)) return categoryMap.get(key)!.color;
  return '#6b7280';
}

export default function CostsPage() {
  const t = useTranslations('costs');
  const [costs, setCosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [uploadingCostId, setUploadingCostId] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [showChart, setShowChart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryMap = new Map(categories.map((c) => [c.id, { name: c.name, color: c.color }]));

  useEffect(() => {
    loadCosts();
    loadCategories();
  }, []);

  async function loadCosts() {
    setLoading(true);
    const res = await fetch('/api/costs');
    const data = await res.json();
    setCosts(data.costs ?? []);
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch('/api/cost-categories');
    const data = await res.json();
    setCategories(data.categories ?? []);
  }

  const filtered = costs.filter((c) => {
    const matchSearch =
      !search ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      (c.vendor && c.vendor.toLowerCase().includes(search.toLowerCase()));
    const catKey = getCostCategoryKey(c);
    const matchCat = categoryFilter === 'all' || catKey === categoryFilter;
    return matchSearch && matchCat;
  });

  const total = filtered.reduce((sum, c) => sum + c.amount, 0);
  const totalAfterTax = filtered.reduce(
    (sum, c) => sum + (c.taxRate != null ? c.amount * (1 + c.taxRate / 100) : c.amount),
    0
  );
  const hasAnyTax = filtered.some((c) => c.taxRate != null);

  const now = new Date();
  const chartFiltered =
    chartPeriod === 'all'
      ? filtered
      : chartPeriod === 'month'
        ? filtered.filter((c) => {
            const d = new Date(c.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          })
        : filtered.filter((c) => new Date(c.date).getFullYear() === now.getFullYear());

  const amountWithTax = (c: { amount: number; taxRate?: number | null }) =>
    c.taxRate != null ? c.amount * (1 + c.taxRate / 100) : c.amount;

  const pieByKey = chartFiltered.reduce((acc: Record<string, { amount: number; label: string }>, c) => {
    const key = getCostCategoryKey(c);
    const label = getCostCategoryLabel(c);
    if (!acc[key]) acc[key] = { amount: 0, label };
    acc[key].amount += amountWithTax(c);
    return acc;
  }, {});
  const pieData = Object.entries(pieByKey).map(([key, { amount, label }]) => ({ name: label, value: amount, key }));
  const getPieColor = (entry: { key: string }) => categoryMap.get(entry.key)?.color ?? '#6b7280';

  const uploadTargetRef = useRef<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('Διαγραφή εξόδου;')) return;
    await fetch(`/api/costs/${id}`, { method: 'DELETE' });
    loadCosts();
  }

  function triggerInvoiceUpload(costId: string) {
    uploadTargetRef.current = costId;
    fileInputRef.current?.click();
  }

  async function onInvoiceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const costId = uploadTargetRef.current;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!costId || !file) return;
    uploadTargetRef.current = null;
    setUploadingCostId(costId);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch(`/api/costs/${costId}/invoice`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Αποτυχία ανεβάσματος');
      } else {
        await loadCosts();
      }
    } finally {
      setUploadingCostId(null);
    }
  }

  function viewInvoice(costId: string) {
    window.open(`/api/costs/${costId}/invoice`, '_blank', 'noopener');
  }

  function printInvoice(costId: string) {
    const w = window.open(`/api/costs/${costId}/invoice`, '_blank', 'noopener');
    if (w) w.onload = () => { w.print(); };
  }

  function handleExportCSV() {
    const rows = filtered.map((c) => ({
      ...c,
      categoryLabel: getCostCategoryLabel(c),
      dateFmt: c.date ? formatDate(c.date) : '',
      recurrence: c.recurrence === 'monthly' ? 'Μηνιαία' : c.recurrence === 'quarterly' ? 'Τριμηνιαία' : c.recurrence === 'yearly' ? 'Ετήσια' : 'Εφάπαξ',
      taxPct: c.taxRate != null ? `${c.taxRate}%` : '',
      taxAmount: c.taxRate != null ? (c.amount * c.taxRate) / 100 : '',
    }));
    exportToCSV(rows, [
      { header: 'Κατηγορία', key: 'categoryLabel' },
      { header: 'Περιγραφή', key: 'description' },
      { header: 'Ποσό', key: 'amount' },
      { header: 'Φόρος %', key: 'taxPct' },
      { header: 'Φόρος (€)', key: 'taxAmount' },
      { header: 'Ημερομηνία', key: 'dateFmt' },
      { header: 'Επανάληψη', key: 'recurrence' },
      { header: 'Προμηθευτής', key: 'vendor' },
    ], 'costs');
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onInvoiceFileSelected}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">
            Σύνολο: <span className="font-semibold text-red-400">{formatCurrency(total)}</span>
            {hasAnyTax && (
              <>
                {' · '}
                Σύνολο με φόρο: <span className="font-semibold text-red-400">{formatCurrency(totalAfterTax)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Tag className="h-4 w-4" />
            <span className="hidden sm:block">Κατηγορίες</span>
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:block">CSV</span>
          </button>
          <button
            onClick={() => setShowChart((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={showChart ? 'Απόκρυψη γραφήματος' : 'Εμφάνιση γραφήματος'}
          >
            {showChart ? <BarChart2Off className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            <span className="hidden sm:block">{showChart ? 'Απόκρυψη γραφήματος' : 'Γράφημα'}</span>
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

      {/* Costs by category — between header and search, toggleable (default hidden) */}
      {showChart && (
        <div className="rounded-xl border border-border bg-card p-4 max-w-md w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-foreground">{t('byCategoryChart')}</h3>
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as 'all' | 'month' | 'year')}
              className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              title="Περίοδος για το γράφημα"
            >
              <option value="all">Όλα</option>
              <option value="month">Αυτό το μήνα</option>
              <option value="year">Φέτος</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Ποσά ανά κατηγορία</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={getPieColor(entry)} />
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
              <div className="space-y-1.5 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: getPieColor(entry) }}
                      />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                    </div>
                    <span className="font-medium text-foreground flex-shrink-0 ml-2">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Δεν υπάρχουν δεδομένα {chartPeriod !== 'all' && 'για την επιλεγμένη περίοδο'}
            </div>
          )}
        </div>
      )}

      {/* Costs list — full width so table doesn't need horizontal scroll */}
      <div className="space-y-4">
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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th>Κατηγορία</th>
                      <th>Περιγραφή</th>
                      <th className="hidden sm:table-cell">Ημερομηνία</th>
                      <th className="hidden md:table-cell">Επανάληψη</th>
                      <th className="text-right">Ποσό</th>
                      <th className="w-0">Απόδειξη</th>
                      <th className="text-right">Φόρος</th>
                      <th className="text-right">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
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
                                style={{ backgroundColor: getCostCategoryColor(cost, categoryMap) }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {getCostCategoryLabel(cost)}
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
                            <div>
                              {formatCurrency(cost.amount)}
                              {cost.taxRate != null && (
                                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                                  Σύνολο: {formatCurrency(cost.amount * (1 + cost.taxRate / 100))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="w-0">
                            <div className="flex items-center justify-center gap-0.5">
                              {cost.invoiceFile ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => viewInvoice(cost.id)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="Προβολή"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => triggerInvoiceUpload(cost.id)}
                                    disabled={uploadingCostId === cost.id}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                                    title="Αντικατάσταση"
                                  >
                                    {uploadingCostId === cost.id ? (
                                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => printInvoice(cost.id)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="Εκτύπωση"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerInvoiceUpload(cost.id)}
                                  disabled={uploadingCostId === cost.id}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400 transition-colors disabled:opacity-50"
                                  title="Ανέβασμα απόδειξης"
                                >
                                  {uploadingCostId === cost.id ? (
                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  ) : (
                                    <FileUp className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="text-right text-sm text-muted-foreground">
                            {cost.taxRate != null ? (
                              <span title={`${formatCurrency((cost.amount * cost.taxRate) / 100)}`}>
                                {cost.taxRate}% ({formatCurrency((cost.amount * cost.taxRate) / 100)})
                              </span>
                            ) : '—'}
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

      {showModal && (
        <CostModal
          cost={selectedCost}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadCosts(); }}
          onCategoriesChange={loadCategories}
        />
      )}

      {showCategoriesModal && (
        <CostCategoriesModal
          onClose={() => setShowCategoriesModal(false)}
          onCategoriesChange={loadCategories}
        />
      )}
    </div>
  );
}
