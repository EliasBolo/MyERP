'use client';

import { useState } from 'react';
import { X, Users } from 'lucide-react';

interface ClientModalProps {
  client?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ClientModal({ client, onClose, onSave }: ClientModalProps) {
  const isEdit = !!client;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: client?.name ?? '',
    code: client?.code ?? '',
    vatNumber: client?.vatNumber ?? '',
    taxOffice: client?.taxOffice ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    postalCode: client?.postalCode ?? '',
    country: client?.country ?? 'GR',
    phone: client?.phone ?? '',
    mobile: client?.mobile ?? '',
    email: client?.email ?? '',
    contactName: client?.contactName ?? '',
    type: client?.type ?? 'customer',
    creditLimit: client?.creditLimit ?? '',
    notes: client?.notes ?? '',
    isActive: client?.isActive ?? true,
  });

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Επωνυμία *</label>
                <input required value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="Επωνυμία πελάτη/προμηθευτή" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Κωδικός *</label>
                <input required value={form.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Τύπος</label>
                <select value={form.type} onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                  <option value="customer">Πελάτης</option>
                  <option value="supplier">Προμηθευτής</option>
                  <option value="both">Και τα δύο</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">ΑΦΜ</label>
                <input value={form.vatNumber} onChange={(e) => handleChange('vatNumber', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="123456789" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">ΔΟΥ</label>
                <input value={form.taxOffice} onChange={(e) => handleChange('taxOffice', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Διεύθυνση</label>
                <input value={form.address} onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Πόλη</label>
                <input value={form.city} onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">ΤΚ</label>
                <input value={form.postalCode} onChange={(e) => handleChange('postalCode', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Τηλέφωνο</label>
                <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="210..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Κινητό</label>
                <input value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="69..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Υπεύθυνος</label>
                <input value={form.contactName} onChange={(e) => handleChange('contactName', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Πιστωτικό Όριο (€)</label>
                <input type="number" step="0.01" value={form.creditLimit}
                  onChange={(e) => handleChange('creditLimit', e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Σημειώσεις</label>
                <textarea rows={2} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)}
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
