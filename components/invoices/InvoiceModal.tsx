'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InvoiceItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

interface InvoiceModalProps {
  invoice?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function InvoiceModal({ invoice, onClose, onSave }: InvoiceModalProps) {
  const isEdit = !!invoice;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({
    number: invoice?.number ?? '',
    type: invoice?.type ?? 'SALE',
    clientId: invoice?.clientId ?? '',
    issueDate: invoice?.issueDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate?.split('T')[0] ?? '',
    notes: invoice?.notes ?? '',
    paymentTerms: invoice?.paymentTerms ?? '',
  });
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items?.length
      ? invoice.items
      : [{ description: '', quantity: 1, unitPrice: 0, vatRate: 24, vatAmount: 0, total: 0 }]
  );

  useEffect(() => {
    Promise.all([fetch('/api/clients'), fetch('/api/inventory/products')]).then(
      async ([cr, pr]) => {
        const [cd, pd] = await Promise.all([cr.json(), pr.json()]);
        setClients(cd.clients ?? []);
        setProducts(pd.products ?? []);
      }
    );

    if (!isEdit) {
      fetch('/api/invoices/next-number')
        .then(r => r.json())
        .then(d => setForm(p => ({ ...p, number: d.number ?? '' })));
    }
  }, []);

  function updateItem(index: number, field: keyof InvoiceItem, value: any) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice' || field === 'vatRate') {
        const subtotal = item.quantity * item.unitPrice;
        item.vatAmount = subtotal * (item.vatRate / 100);
        item.total = subtotal + item.vatAmount;
      }

      updated[index] = item;
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, vatRate: 24, vatAmount: 0, total: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => {
      const updated = [...prev];
      const qty = updated[index].quantity;
      const subtotal = qty * product.sellPrice;
      const vatAmount = subtotal * (product.vatRate / 100);
      updated[index] = {
        ...updated[index],
        productId,
        description: product.name,
        unitPrice: product.sellPrice,
        vatRate: product.vatRate,
        vatAmount,
        total: subtotal + vatAmount,
      };
      return updated;
    });
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vatAmount = items.reduce((s, i) => s + i.vatAmount, 0);
  const total = subtotal + vatAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || !items[0].description) {
      setError('Προσθέστε τουλάχιστον ένα είδος');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/invoices/${invoice.id}` : '/api/invoices';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, subtotal, vatAmount, total }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Σφάλμα αποθήκευσης');
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
      <div className="relative z-10 my-8 w-full max-w-4xl mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10">
                <Receipt className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Επεξεργασία Τιμολογίου' : 'Νέο Τιμολόγιο'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Αριθμός *</label>
                <input required value={form.number} onChange={(e) => setForm(p => ({ ...p, number: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Τύπος</label>
                <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                  <option value="SALE">Πώλησης</option>
                  <option value="PURCHASE">Αγοράς</option>
                  <option value="CREDIT_NOTE">Πιστωτικό</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ημ/νία Έκδοσης</label>
                <input type="date" value={form.issueDate} onChange={(e) => setForm(p => ({ ...p, issueDate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ημ/νία Λήξης</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Πελάτης/Προμηθευτής *</label>
              <select required value={form.clientId} onChange={(e) => setForm(p => ({ ...p, clientId: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="">Επιλέξτε...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-muted-foreground">Είδη</label>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Προσθήκη Είδους
                </button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="px-3 py-2 text-left text-muted-foreground">Προϊόν</th>
                        <th className="px-3 py-2 text-left text-muted-foreground">Περιγραφή</th>
                        <th className="px-3 py-2 text-center text-muted-foreground w-20">Ποσ.</th>
                        <th className="px-3 py-2 text-right text-muted-foreground w-24">Τιμή</th>
                        <th className="px-3 py-2 text-center text-muted-foreground w-16">ΦΠΑ%</th>
                        <th className="px-3 py-2 text-right text-muted-foreground w-24">Σύνολο</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            <select value={item.productId || ''} onChange={(e) => selectProduct(i, e.target.value)}
                              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                              <option value="">—</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                              required
                              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                              placeholder="Περιγραφή" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0.01" step="0.01" value={item.quantity}
                              onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-right text-foreground focus:border-primary focus:outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" min="0" value={item.unitPrice}
                              onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-right text-foreground focus:border-primary focus:outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={item.vatRate} onChange={(e) => updateItem(i, 'vatRate', parseInt(e.target.value))}
                              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                              {[0, 6, 13, 24].map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(i)}
                              className="text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="space-y-1.5 text-sm min-w-[200px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Υποσύνολο:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ΦΠΑ:</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
                    <span>Σύνολο:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Σημειώσεις</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none" />
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
