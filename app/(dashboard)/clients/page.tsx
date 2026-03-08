'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Edit2, Trash2, Users, Download, Phone, Mail, Building } from 'lucide-react';
import { exportToCSV } from '@/lib/export-csv';
import { exportToPDF } from '@/lib/export-pdf';
import ClientModal from '@/components/clients/ClientModal';

export default function ClientsPage() {
  const t = useTranslations('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.vatNumber && c.vatNumber.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchType;
  });

  async function handleDelete(id: string) {
    if (!confirm('Διαγραφή πελάτη;')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    loadClients();
  }

  function handleExportCSV() {
    exportToCSV(filtered, [
      { header: 'Κωδικός', key: 'code' },
      { header: 'Επωνυμία', key: 'name' },
      { header: 'ΑΦΜ', key: 'vatNumber' },
      { header: 'Τύπος', key: 'type' },
      { header: 'Email', key: 'email' },
      { header: 'Τηλέφωνο', key: 'phone' },
      { header: 'Πόλη', key: 'city' },
    ], 'clients');
  }

  function handleExportPDF() {
    exportToPDF({
      title: 'Αναφορά Πελατών',
      columns: [
        { header: 'Κωδικός', dataKey: 'code' },
        { header: 'Επωνυμία', dataKey: 'name' },
        { header: 'ΑΦΜ', dataKey: 'vatNumber' },
        { header: 'Τύπος', dataKey: 'typeLabel' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Τηλέφωνο', dataKey: 'phone' },
      ],
      data: filtered.map((c) => ({
        ...c,
        typeLabel: c.type === 'customer' ? 'Πελάτης' : c.type === 'supplier' ? 'Προμηθευτής' : 'Και τα δύο',
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">{filtered.length} εγγραφές</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:block">CSV</span>
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:block">PDF</span>
          </button>
          <button
            onClick={() => { setSelectedClient(null); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addClient')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Αναζήτηση πελάτη..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">Όλοι οι τύποι</option>
          <option value="customer">Πελάτες</option>
          <option value="supplier">Προμηθευτές</option>
          <option value="both">Και τα δύο</option>
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
                  <th>Κωδικός</th>
                  <th>Επωνυμία</th>
                  <th className="hidden md:table-cell">ΑΦΜ</th>
                  <th>Τύπος</th>
                  <th className="hidden lg:table-cell">Επικοινωνία</th>
                  <th className="hidden xl:table-cell">Πόλη</th>
                  <th className="text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Δεν βρέθηκαν πελάτες</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr key={client.id}>
                      <td className="font-mono text-xs text-primary">{client.code}</td>
                      <td>
                        <div>
                          <p className="text-sm font-medium text-foreground">{client.name}</p>
                          {client.contactName && (
                            <p className="text-xs text-muted-foreground">{client.contactName}</p>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">{client.vatNumber || '—'}</td>
                      <td>
                        <span className={`badge ${
                          client.type === 'customer' ? 'badge-info' :
                          client.type === 'supplier' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {client.type === 'customer' ? 'Πελάτης' :
                           client.type === 'supplier' ? 'Προμηθ.' : 'Και τα δύο'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {client.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell text-sm text-muted-foreground">
                        {client.city || '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedClient(client); setShowModal(true); }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
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
        <ClientModal
          client={selectedClient}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadClients(); }}
        />
      )}
    </div>
  );
}
