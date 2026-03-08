'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Edit2, Trash2, Receipt, Download, Eye } from 'lucide-react';
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils';
import { exportInvoicePDF } from '@/lib/export-pdf';
import InvoiceModal from '@/components/invoices/InvoiceModal';

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    const res = await fetch('/api/invoices');
    const data = await res.json();
    setInvoices(data.invoices ?? []);
    setLoading(false);
  }

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.number.includes(search) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalAmount = filtered.reduce((s, i) => s + i.total, 0);
  const paidAmount = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Πρόχειρο', sent: 'Εστάλη', paid: 'Πληρώθηκε',
    overdue: 'Ληξιπρόθεσμο', cancelled: 'Ακυρώθηκε',
  };

  async function handleDelete(id: string) {
    if (!confirm('Διαγραφή τιμολογίου;')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    loadInvoices();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadInvoices();
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">
            Σύνολο: {formatCurrency(totalAmount)} ·
            Εισπραγμένο: <span className="text-green-400">{formatCurrency(paidAmount)}</span>
          </p>
        </div>
        <button
          onClick={() => { setSelectedInvoice(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t('addInvoice')}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Αριθμός ή πελάτης..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
          <option value="all">Όλες οι καταστάσεις</option>
          <option value="draft">Πρόχειρο</option>
          <option value="sent">Εστάλη</option>
          <option value="paid">Πληρώθηκε</option>
          <option value="overdue">Ληξιπρόθεσμο</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
          <option value="all">Όλοι οι τύποι</option>
          <option value="SALE">Πωλήσεων</option>
          <option value="PURCHASE">Αγοράς</option>
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
                  <th>Αριθμός</th>
                  <th>Πελάτης</th>
                  <th>Τύπος</th>
                  <th className="hidden sm:table-cell">Ημ/νία</th>
                  <th className="hidden md:table-cell">Λήξη</th>
                  <th>Κατάσταση</th>
                  <th className="text-right">Σύνολο</th>
                  <th className="text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Δεν βρέθηκαν τιμολόγια</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs text-primary font-bold">#{inv.number}</td>
                      <td className="text-sm font-medium">{inv.client?.name}</td>
                      <td>
                        <span className={`badge ${inv.type === 'SALE' ? 'badge-info' : 'badge-warning'}`}>
                          {inv.type === 'SALE' ? 'Πώληση' : 'Αγορά'}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </td>
                      <td>
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                          className={`rounded px-2 py-1 text-xs font-medium border-0 bg-transparent cursor-pointer focus:outline-none ${getInvoiceStatusColor(inv.status)}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k} className="bg-card text-foreground">{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right font-bold">{formatCurrency(inv.total)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => exportInvoicePDF(inv, {})}
                            title="PDF"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedInvoice(inv); setShowModal(true); }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
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

      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadInvoices(); }}
        />
      )}
    </div>
  );
}
