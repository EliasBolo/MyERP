'use client';

import { useState } from 'react';
import { X, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

interface StockMovementModalProps {
  product: any;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  onClose: () => void;
  onSave: () => void;
}

export default function StockMovementModal({
  product,
  type,
  onClose,
  onSave,
}: StockMovementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    quantity: '',
    unitPrice: type === 'IN' ? product.buyPrice : product.sellPrice,
    reference: '',
    notes: '',
  });

  const typeConfig = {
    IN: { label: 'Εισαγωγή Αποθέματος', icon: ArrowDown, color: 'text-green-400', bg: 'bg-green-400/10' },
    OUT: { label: 'Εξαγωγή Αποθέματος', icon: ArrowUp, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    ADJUSTMENT: { label: 'Προσαρμογή Αποθέματος', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      setError('Εισάγετε έγκυρη ποσότητα');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity: parseFloat(form.quantity),
          unitPrice: parseFloat(String(form.unitPrice)) || 0,
          reference: form.reference,
          notes: form.notes,
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
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.bg}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <h2 className="text-base font-semibold text-foreground">{config.label}</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Product info */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Προϊόν</p>
              <p className="text-sm font-medium text-foreground">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Τρέχον απόθεμα: <span className="text-foreground font-medium">{product.currentStock} {product.unit}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Ποσότητα ({product.unit}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                autoFocus
                required
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Τιμή Μονάδας (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={(e) => setForm((p) => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Αναφορά (αριθμός παραστατικού κ.λπ.)
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                placeholder="π.χ. ΤΙΜ-001"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Σημειώσεις
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Preview */}
            {form.quantity && parseFloat(form.quantity) > 0 && (
              <div className="rounded-lg bg-muted p-3 text-xs">
                <span className="text-muted-foreground">Νέο απόθεμα: </span>
                <span className="font-medium text-foreground">
                  {type === 'IN'
                    ? product.currentStock + parseFloat(form.quantity)
                    : type === 'OUT'
                    ? Math.max(0, product.currentStock - parseFloat(form.quantity))
                    : parseFloat(form.quantity)}{' '}
                  {product.unit}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Ακύρωση
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Καταχώριση
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
