'use client';

import { useEffect, useMemo, useState } from 'react';
import { Factory, Plus, Trash2, Download, CheckCircle2 } from 'lucide-react';
import { exportToCSV } from '@/lib/export-csv';
import { exportToPDF } from '@/lib/export-pdf';
import { formatCurrency } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  buyPrice: number;
  currentStock: number;
};

type PhaseItemForm = {
  id: string;
  productId: string;
  plannedQty: string;
  actualQty: string;
};

type PhaseForm = {
  id: string;
  name: string;
  laborCost: string;
  overheadCost: string;
  notes: string;
  items: PhaseItemForm[];
};

export default function ProductionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    outputProductId: '',
    outputQuantity: '1',
    notes: '',
    phases: [
      {
        id: crypto.randomUUID(),
        name: 'Φάση 1',
        laborCost: '0',
        overheadCost: '0',
        notes: '',
        items: [{ id: crypto.randomUUID(), productId: '', plannedQty: '0', actualQty: '' }],
      },
    ] as PhaseForm[],
  });

  async function loadProducts() {
    const res = await fetch('/api/inventory/products');
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  async function loadOrders() {
    setLoading(true);
    const res = await fetch(
      `/api/production/orders?period=${period}&year=${year}&month=${month}${statusFilter ? `&status=${statusFilter}` : ''}`
    );
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [period, year, month, statusFilter]);

  function updatePhase(phaseId: string, patch: Partial<PhaseForm>) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...patch } : phase)),
    }));
  }

  function addPhase() {
    setForm((prev) => ({
      ...prev,
      phases: [
        ...prev.phases,
        {
          id: crypto.randomUUID(),
          name: `Φάση ${prev.phases.length + 1}`,
          laborCost: '0',
          overheadCost: '0',
          notes: '',
          items: [{ id: crypto.randomUUID(), productId: '', plannedQty: '0', actualQty: '' }],
        },
      ],
    }));
  }

  function removePhase(phaseId: string) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.length > 1 ? prev.phases.filter((phase) => phase.id !== phaseId) : prev.phases,
    }));
  }

  function addPhaseItem(phaseId: string) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              items: [...phase.items, { id: crypto.randomUUID(), productId: '', plannedQty: '0', actualQty: '' }],
            }
          : phase
      ),
    }));
  }

  function updatePhaseItem(phaseId: string, itemId: string, patch: Partial<PhaseItemForm>) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              items: phase.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : phase
      ),
    }));
  }

  function removePhaseItem(phaseId: string, itemId: string) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.id === phaseId && phase.items.length > 1
          ? { ...phase, items: phase.items.filter((item) => item.id !== itemId) }
          : phase
      ),
    }));
  }

  const estimatedTotals = useMemo(() => {
    let materials = 0;
    let labor = 0;
    let overhead = 0;
    for (const phase of form.phases) {
      labor += Number(phase.laborCost || 0);
      overhead += Number(phase.overheadCost || 0);
      for (const item of phase.items) {
        const product = products.find((p) => p.id === item.productId);
        materials += Number(item.plannedQty || 0) * Number(product?.buyPrice || 0);
      }
    }
    return { materials, labor, overhead, grand: materials + labor + overhead };
  }, [form.phases, products]);

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          outputProductId: form.outputProductId,
          outputQuantity: Number(form.outputQuantity || 0),
          notes: form.notes || undefined,
          phases: form.phases.map((phase) => ({
            name: phase.name,
            laborCost: Number(phase.laborCost || 0),
            overheadCost: Number(phase.overheadCost || 0),
            notes: phase.notes || undefined,
            items: phase.items
              .filter((item) => item.productId)
              .map((item) => ({
                productId: item.productId,
                plannedQty: Number(item.plannedQty || 0),
                actualQty: item.actualQty ? Number(item.actualQty) : undefined,
              })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Σφάλμα αποθήκευσης');
        setSaving(false);
        return;
      }
      setShowCreate(false);
      setForm({
        title: '',
        outputProductId: '',
        outputQuantity: '1',
        notes: '',
        phases: [
          {
            id: crypto.randomUUID(),
            name: 'Φάση 1',
            laborCost: '0',
            overheadCost: '0',
            notes: '',
            items: [{ id: crypto.randomUUID(), productId: '', plannedQty: '0', actualQty: '' }],
          },
        ],
      });
      await loadOrders();
    } catch {
      setError('Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  }

  async function completeOrder(orderId: string) {
    if (!confirm('Ολοκλήρωση παραγωγής; Θα ενημερωθούν αυτόματα τα αποθέματα.')) return;
    const res = await fetch(`/api/production/orders/${orderId}/complete`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Σφάλμα ολοκλήρωσης');
      return;
    }
    loadOrders();
  }

  async function exportReport(kind: 'csv' | 'pdf') {
    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/production/reports?period=${period}&year=${year}&month=${month}${statusFilter ? `&status=${statusFilter}` : ''}`
      );
      const data = await res.json();
      if (!data?.rows) return;
      if (kind === 'csv') {
        exportToCSV(data.rows, data.columns, 'production-report');
      } else {
        exportToPDF({
          title: 'Production Report',
          subtitle: period === 'month' ? `Month: ${month}/${year}` : `Year: ${year}`,
          columns: data.pdfColumns,
          data: data.rows,
        });
      }
    } finally {
      setReportLoading(false);
    }
  }

  const kpis = {
    active: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    totalCost: orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Factory className="h-7 w-7" />
          Παραγωγή
        </h1>
        <p className="text-muted-foreground mt-1">
          Δημιουργία παραγωγών με πολλαπλές φάσεις, κόστος και αυτόματη ενημέρωση αποθήκης.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ενεργές Παραγωγές</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{kpis.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ολοκληρωμένες</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{kpis.completed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Συνολικό Κόστος</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(kpis.totalCost)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'year')}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="month">Μηνιαία</option>
              <option value="year">Ετήσια</option>
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
            {period === 'month' && (
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">Όλες οι καταστάσεις</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportReport('csv')}
              disabled={reportLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportReport('pdf')}
              disabled={reportLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Νέα Παραγωγή
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Δεν υπάρχουν παραγωγές για τα τρέχοντα φίλτρα.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {order.code} - {order.title}
                    </h3>
                    <span className="badge badge-neutral text-xs">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Τελικό προϊόν: {order.outputProduct?.name} | Ποσότητα: {order.outputQuantity}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Υλικά: {formatCurrency(order.materialsTotal)} | Εργασία: {formatCurrency(order.laborTotal)} | Γενικά: {formatCurrency(order.overheadTotal)} | Σύνολο: {formatCurrency(order.grandTotal)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Ολοκλήρωση
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {(order.phases || []).map((phase: any) => (
                  <div key={phase.id} className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">
                        {phase.sequence}. {phase.name}
                      </p>
                      <span className="text-[11px] text-muted-foreground">{phase.status}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(phase.items || []).map((item: any) => (
                        <p key={item.id} className="text-[11px] text-muted-foreground">
                          {item.product?.name} - {item.actualQty ?? item.plannedQty} {item.product?.unit}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6">
          <div className="mx-auto max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Νέα Παραγωγή</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Κλείσιμο
              </button>
            </div>
            <form onSubmit={createOrder} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Τίτλος Παραγωγής</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Τελικό Προϊόν</label>
                  <select
                    value={form.outputProductId}
                    onChange={(e) => setForm((prev) => ({ ...prev, outputProductId: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  >
                    <option value="">Επιλογή προϊόντος</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Ποσότητα Παραγωγής</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.outputQuantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, outputQuantity: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Σημειώσεις</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {form.phases.map((phase, idx) => (
                  <div key={phase.id} className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Φάση {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removePhase(phase.id)}
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Αφαίρεση Φάσης
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        value={phase.name}
                        onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                        placeholder="Όνομα φάσης"
                        className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={phase.laborCost}
                        onChange={(e) => updatePhase(phase.id, { laborCost: e.target.value })}
                        placeholder="Κόστος εργασίας"
                        className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={phase.overheadCost}
                        onChange={(e) => updatePhase(phase.id, { overheadCost: e.target.value })}
                        placeholder="Γενικά έξοδα"
                        className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-2 space-y-2">
                      {phase.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <select
                            value={item.productId}
                            onChange={(e) => updatePhaseItem(phase.id, item.id, { productId: e.target.value })}
                            className="sm:col-span-6 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                          >
                            <option value="">Επιλογή υλικού</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.currentStock} {p.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={item.plannedQty}
                            onChange={(e) => updatePhaseItem(phase.id, item.id, { plannedQty: e.target.value })}
                            placeholder="Προβλ. ποσότητα"
                            className="sm:col-span-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={item.actualQty}
                            onChange={(e) => updatePhaseItem(phase.id, item.id, { actualQty: e.target.value })}
                            placeholder="Πραγμ. ποσότητα"
                            className="sm:col-span-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removePhaseItem(phase.id, item.id)}
                            className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-xs hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Διαγραφή
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addPhaseItem(phase.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Προσθήκη Υλικού
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3">
                <button
                  type="button"
                  onClick={addPhase}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Προσθήκη Φάσης
                </button>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Υλικά: {formatCurrency(estimatedTotals.materials)}</p>
                  <p>Εργασία: {formatCurrency(estimatedTotals.labor)}</p>
                  <p>Γενικά: {formatCurrency(estimatedTotals.overhead)}</p>
                  <p className="font-semibold text-foreground">Σύνολο: {formatCurrency(estimatedTotals.grand)}</p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Αποθήκευση...' : 'Αποθήκευση Παραγωγής'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="h-8" />
    </div>
  );
}
