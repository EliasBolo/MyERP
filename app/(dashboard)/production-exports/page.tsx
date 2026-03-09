'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown, QrCode, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import LotQrModal from '@/components/production-tools/LotQrModal';

export default function ProductionExportsPage() {
  const t = useTranslations('productionExports');
  const tCommon = useTranslations('common');
  const [clients, setClients] = useState<{ id: string; name: string; code: string }[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [customLotNumber, setCustomLotNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [qrLot, setQrLot] = useState<{ id: string; lotNumber: string } | null>(null);

  useEffect(() => {
    loadClients();
    loadLots();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadInvoices(clientId);
    } else {
      setInvoices([]);
      setInvoiceId('');
    }
  }, [clientId]);

  async function loadClients() {
    setLoading(true);
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }

  async function loadInvoices(clientIdParam: string) {
    const res = await fetch(`/api/invoices?clientId=${encodeURIComponent(clientIdParam)}`);
    const data = await res.json();
    setInvoices(data.invoices ?? []);
    setInvoiceId('');
  }

  async function loadLots() {
    setLotsLoading(true);
    const res = await fetch('/api/production-tools/lots');
    const data = await res.json();
    setLots(data.lots ?? []);
    setLotsLoading(false);
  }

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/production-tools/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          lotNumber: customLotNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || t('errorCreatingLot'));
        return;
      }
      setInvoiceId('');
      setCustomLotNumber('');
      loadLots();
    } catch {
      setCreateError(t('errorCreatingLot'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileDown className="h-7 w-7" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('comingSoon')}</p>
      </div>

      {/* Create lot number */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {t('createLot')}
        </h2>
        <form onSubmit={handleCreateLot} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('selectCustomer')}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">— {tCommon('all')} —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
            {!loading && clients.length === 0 && (
              <p className="text-muted-foreground text-sm mt-1">{t('noCustomers')}</p>
            )}
          </div>
          {clientId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('selectInvoice')}</label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">—</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} · {inv.client?.name} · {formatDate(inv.issueDate)}
                  </option>
                ))}
              </select>
              {invoices.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">{t('noInvoices')}</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('customLotNumber')}</label>
            <input
              type="text"
              value={customLotNumber}
              onChange={(e) => setCustomLotNumber(e.target.value)}
              placeholder="e.g. LOT-2025-0001"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          {createError && <p className="text-destructive text-sm">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !invoiceId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? tCommon('loading') : t('create')}
          </button>
        </form>
      </section>

      {/* Your lot numbers */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <h2 className="text-lg font-semibold text-foreground p-4 border-b border-border">{t('yourLots')}</h2>
        {lotsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : lots.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{tCommon('noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-foreground p-3">{t('lotNumber')}</th>
                  <th className="text-left font-medium text-foreground p-3">{t('invoice')}</th>
                  <th className="text-left font-medium text-foreground p-3">{t('customer')}</th>
                  <th className="text-left font-medium text-foreground p-3">{t('createdAt')}</th>
                  <th className="text-right font-medium text-foreground p-3">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-foreground">{lot.lotNumber}</td>
                    <td className="p-3 text-foreground">{lot.invoice?.number}</td>
                    <td className="p-3 text-foreground">{lot.invoice?.client?.name}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(lot.createdAt)}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setQrLot({ id: lot.id, lotNumber: lot.lotNumber })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                      >
                        <QrCode className="h-4 w-4" />
                        {t('qrCode')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {qrLot && (
        <LotQrModal
          lotId={qrLot.id}
          lotNumber={qrLot.lotNumber}
          onClose={() => setQrLot(null)}
          t={t}
        />
      )}
    </div>
  );
}
