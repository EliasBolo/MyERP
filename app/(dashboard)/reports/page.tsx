'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Download, Eye } from 'lucide-react';
import { exportToPDF } from '@/lib/export-pdf';
import { exportToCSV } from '@/lib/export-csv';
import { formatCurrency, formatDate } from '@/lib/utils';

const REPORT_TYPES = [
  { value: 'inventory', label: 'Αναφορά Αποθήκης', description: 'Προϊόντα, αποθέματα, αξίες' },
  { value: 'clients', label: 'Αναφορά Πελατών', description: 'Λίστα πελατών και υπόλοιπα' },
  { value: 'costs', label: 'Αναφορά Εξόδων', description: 'Έξοδα ανά κατηγορία και περίοδο' },
  { value: 'sales', label: 'Αναφορά Πωλήσεων', description: 'Τιμολόγια και πωλήσεις' },
  { value: 'financial', label: 'Οικονομική Αναφορά', description: 'Συνολική οικονομική επισκόπηση' },
];

export default function ReportsPage() {
  const t = useTranslations('reports');
  const [reportType, setReportType] = useState('inventory');
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function fetchReportData() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?type=${reportType}&from=${dateFrom}&to=${dateTo}`
      );
      const data = await res.json();
      setPreviewData(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    const data = await fetchReportData();
    setShowPreview(true);
  }

  async function handleExportCSV() {
    const data = await fetchReportData();
    if (!data?.rows) return;
    exportToCSV(data.rows, data.columns, `report-${reportType}`);
  }

  async function handleExportPDF() {
    const data = await fetchReportData();
    if (!data?.rows) return;
    exportToPDF({
      title: REPORT_TYPES.find((r) => r.value === reportType)?.label ?? 'Αναφορά',
      subtitle: `Περίοδος: ${formatDate(dateFrom)} - ${formatDate(dateTo)}`,
      columns: data.pdfColumns ?? data.columns?.map((c: any) => ({ header: c.header, dataKey: c.key })),
      data: data.rows,
    });
  }

  const selectedReport = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">Δημιουργία και εξαγωγή αναφορών σε CSV και PDF</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report configurator */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-sm font-semibold text-foreground">Ρυθμίσεις Αναφοράς</h2>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('type')}
              </label>
              <div className="space-y-2">
                {REPORT_TYPES.map((rt) => (
                  <label
                    key={rt.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      reportType === rt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={rt.value}
                      checked={reportType === rt.value}
                      onChange={() => setReportType(rt.value)}
                      className="mt-0.5 text-primary"
                    />
                    <div>
                      <p className="text-xs font-medium text-foreground">{rt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('from')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('to')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                {t('preview')}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {t('exportCSV')}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t('exportPDF')}
              </button>
            </div>
          </div>
        </div>

        {/* Preview area */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {showPreview && selectedReport ? selectedReport.label : 'Προεπισκόπηση Αναφοράς'}
                </h2>
              </div>
              {showPreview && previewData?.rows && (
                <span className="text-xs text-muted-foreground">
                  {previewData.rows.length} εγγραφές
                </span>
              )}
            </div>

            {!showPreview ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Επιλέξτε τύπο αναφοράς και πατήστε Προεπισκόπηση</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : previewData?.rows?.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Δεν υπάρχουν δεδομένα για την επιλεγμένη περίοδο
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="data-table">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
                    <tr className="border-b border-border">
                      {previewData?.columns?.map((col: any) => (
                        <th key={col.key}>{col.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData?.rows?.slice(0, 50).map((row: any, i: number) => (
                      <tr key={i}>
                        {previewData.columns.map((col: any) => (
                          <td key={col.key} className="text-sm">{row[col.key] ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData?.rows?.length > 50 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                    Εμφάνιση 50 από {previewData.rows.length} εγγραφές. Εξάγετε για πλήρη αναφορά.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
