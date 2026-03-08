'use client';

import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';

interface ProductModalProps {
  product?: any;
  categories: any[];
  onClose: () => void;
  onSave: () => void;
}

const UNITS = ['τεμ', 'kg', 'lt', 'm', 'm²', 'm³', 'κιβ', 'ζεύγ', 'σετ'];
const VAT_RATES = [0, 6, 13, 24];

export default function ProductModal({ product, categories, onClose, onSave }: ProductModalProps) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    unit: product?.unit ?? 'τεμ',
    buyPrice: product?.buyPrice ?? 0,
    sellPrice: product?.sellPrice ?? 0,
    vatRate: product?.vatRate ?? 24,
    currentStock: product?.currentStock ?? 0,
    minStock: product?.minStock ?? 0,
    maxStock: product?.maxStock ?? '',
    barcode: product?.barcode ?? '',
    isActive: product?.isActive ?? true,
  });

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/inventory/products/${product.id}` : '/api/inventory/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-8 w-full max-w-2xl mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10">
                <Package className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Επεξεργασία Προϊόντος' : 'Νέο Προϊόν'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Όνομα Προϊόντος *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                  placeholder="π.χ. Τσιμέντο Portland 50kg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Κωδικός (SKU) *
                </label>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none transition-colors"
                  placeholder="π.χ. TSM-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Barcode
                </label>
                <input
                  value={form.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                  placeholder="EAN/UPC"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Κατηγορία
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Χωρίς κατηγορία</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Μονάδα Μέτρησης
                </label>
                <select
                  value={form.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Τιμή Αγοράς (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.buyPrice}
                  onChange={(e) => handleChange('buyPrice', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Τιμή Πώλησης (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellPrice}
                  onChange={(e) => handleChange('sellPrice', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Συντελεστής ΦΠΑ %
                </label>
                <select
                  value={form.vatRate}
                  onChange={(e) => handleChange('vatRate', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {VAT_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Τρέχον Απόθεμα
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.currentStock}
                  onChange={(e) => handleChange('currentStock', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Ελάχιστο Απόθεμα (για ειδοποιήσεις)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => handleChange('minStock', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Μέγιστο Απόθεμα (προαιρετικό)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) => handleChange('maxStock', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Περιγραφή
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors resize-none"
                  placeholder="Προαιρετική περιγραφή..."
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-sm text-foreground">
                  Ενεργό προϊόν
                </label>
              </div>
            </div>

            {/* Margin indicator */}
            {form.buyPrice > 0 && form.sellPrice > 0 && (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">Περιθώριο κέρδους: </span>
                <span className="font-medium text-green-400">
                  {(((form.sellPrice - form.buyPrice) / form.buyPrice) * 100).toFixed(1)}%
                </span>
                <span className="ml-3 text-muted-foreground">Κέρδος/τεμ: </span>
                <span className="font-medium text-foreground">
                  €{(form.sellPrice - form.buyPrice).toFixed(2)}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
                {isEdit ? 'Ενημέρωση' : 'Αποθήκευση'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
