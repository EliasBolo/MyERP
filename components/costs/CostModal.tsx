'use client';

import { useState } from 'react';
import { X, TrendingDown } from 'lucide-react';

interface CostModalProps {
  cost?: any;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORIES = [
  { value: 'payroll', label: 'Μισθοδοσία' },
  { value: 'rent', label: 'Ενοίκιο' },
  { value: 'utilities', label: 'Λογαριασμοί/Κοινόχρηστα' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Λειτουργικά' },
  { value: 'other', label: 'Άλλα' },
];

const RECURRENCES = [
  { value: 'once', label: 'Εφάπαξ' },
  { value: 'monthly', label: 'Μηνιαία' },
  { value: 'quarterly', label: 'Τριμηνιαία' },
  { value: 'yearly', label: 'Ετήσια' },
];

export default function CostModal({ cost, onClose, onSave }: CostModalProps) {
  const isEdit = !!cost;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    category: cost?.category ?? 'other',
    description: cost?.description ?? '',
    amount: cost?.amount ?? '',
    date: cost?.date ? cost.date.split('T')[0] : new Date().toISOString().split('T')[0],
    recurrence: cost?.recurrence ?? 'once',
    vendor: cost?.vendor ?? '',
    notes: cost?.notes ?? '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/costs/${cost.id}` : '/api/costs';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(String(form.amount)) }),
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Κατηγορία</label>
                <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ποσό (€) *</label>
                <input required type="number" step="0.01" min="0" value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
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
