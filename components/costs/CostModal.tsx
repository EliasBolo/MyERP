'use client';

import { useState, useEffect } from 'react';
import { X, TrendingDown, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CostCategory {
  id: string;
  name: string;
  color: string;
}

interface CostModalProps {
  cost?: any;
  categories: CostCategory[];
  onClose: () => void;
  onSave: () => void;
  onCategoriesChange?: () => void;
}

const RECURRENCES = [
  { value: 'once', label: 'Εφάπαξ' },
  { value: 'monthly', label: 'Μηνιαία' },
  { value: 'quarterly', label: 'Τριμηνιαία' },
  { value: 'yearly', label: 'Ετήσια' },
];

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280', '#ec4899', '#14b8a6'];

export default function CostModal({ cost, categories, onClose, onSave, onCategoriesChange }: CostModalProps) {
  const isEdit = !!cost;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6b7280');
  const [addingCategory, setAddingCategory] = useState(false);
  const defaultCategoryId = categories[0]?.id ?? '';
  const [form, setForm] = useState({
    costCategoryId: cost?.costCategoryId ?? cost?.costCategory?.id ?? defaultCategoryId,
    description: cost?.description ?? '',
    amount: cost?.amount ?? '',
    taxRate: cost?.taxRate != null ? String(cost.taxRate) : '',
    date: cost?.date ? cost.date.split('T')[0] : new Date().toISOString().split('T')[0],
    recurrence: cost?.recurrence ?? 'once',
    vendor: cost?.vendor ?? '',
    notes: cost?.notes ?? '',
  });

  useEffect(() => {
    if (form.costCategoryId || !categories.length) return;
    setForm((p) => ({ ...p, costCategoryId: categories[0].id }));
  }, [categories, form.costCategoryId]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    setError('');
    try {
      const res = await fetch('/api/cost-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newCategoryColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Σφάλμα');
        return;
      }
      setForm((p) => ({ ...p, costCategoryId: data.category?.id }));
      setNewCategoryName('');
      setNewCategoryColor('#6b7280');
      setShowNewCategory(false);
      onCategoriesChange?.();
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.costCategoryId) {
      setError('Επιλέξτε κατηγορία');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/costs/${cost.id}` : '/api/costs';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(String(form.amount)),
          taxRate: form.taxRate === '' ? null : form.taxRate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Σφάλμα αποθήκευσης');
        return;
      }
      onSave();
    } catch {
      setError('Σφάλμα σύνδεσης');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Επεξεργασία Εξόδου' : 'Νέο Έξοδο'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Περιγραφή *</label>
                <input required value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="π.χ. Ενοίκιο Ιανουαρίου" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Κατηγορία *</label>
                <select
                  value={form.costCategoryId}
                  onChange={(e) => setForm((p) => ({ ...p, costCategoryId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {!showNewCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Plus className="h-3 w-3" />
                    Νέα κατηγορία
                  </button>
                ) : (
                  <form onSubmit={handleAddCategory} className="mt-2 rounded-lg border border-border bg-muted/50 p-2 space-y-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Όνομα κατηγορίας"
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="h-5 w-5 rounded-full border-2 border-transparent hover:border-white"
                          style={{ backgroundColor: c }}
                          onClick={() => setNewCategoryColor(c)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="text-xs text-muted-foreground">
                        Ακύρωση
                      </button>
                      <button type="submit" disabled={addingCategory || !newCategoryName.trim()} className="text-xs text-blue-400 disabled:opacity-50">
                        Προσθήκη
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ποσό (€) *</label>
                <input required type="number" step="0.01" min="0" value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Φόρος (%) — προαιρετικό</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="π.χ. 24"
                  value={form.taxRate}
                  onChange={(e) => setForm((p) => ({ ...p, taxRate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                />
                {form.taxRate !== '' && (() => {
                  const amount = parseFloat(String(form.amount));
                  const rate = parseFloat(String(form.taxRate));
                  if (!Number.isNaN(amount) && amount >= 0 && !Number.isNaN(rate) && rate >= 0) {
                    const totalAfterTax = amount * (1 + rate / 100);
                    return (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Σύνολο με φόρο: <span className="font-medium text-foreground">{formatCurrency(totalAfterTax)}</span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ημερομηνία</label>
                <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Επανάληψη</label>
                <select value={form.recurrence} onChange={(e) => setForm(p => ({ ...p, recurrence: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                  {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Προμηθευτής/Πάροχος</label>
                <input value={form.vendor} onChange={(e) => setForm(p => ({ ...p, vendor: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Σημειώσεις</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Ακύρωση
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isEdit ? 'Ενημέρωση' : 'Αποθήκευση'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
