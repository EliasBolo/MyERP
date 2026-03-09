'use client';

import { useEffect, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';

interface LotQrModalProps {
  lotId: string;
  lotNumber: string;
  onClose: () => void;
  t: (key: string) => string;
}

export default function LotQrModal({ lotId, lotNumber, onClose, t }: LotQrModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/production-tools/lots/${lotId}/qr`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load QR');
          return;
        }
        if (!cancelled) setDataUrl(data.dataUrl);
      } catch {
        if (!cancelled) setError('Failed to load QR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lotId]);

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `lot-qr-${lotNumber}.png`;
    link.click();
  }

  function handlePrint() {
    if (!dataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>QR - ${lotNumber}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <p style="font-size:18px;margin-bottom:16px;">${lotNumber}</p>
          <img src="${dataUrl}" alt="QR ${lotNumber}" style="width:300px;height:300px;" />
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('qrCode')} – {lotNumber}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          )}
          {error && <p className="text-destructive text-sm py-4">{error}</p>}
          {dataUrl && !loading && (
            <>
              <div className="flex justify-center bg-muted/30 rounded-xl p-4 mb-4">
                <img src={dataUrl} alt={`QR ${lotNumber}`} className="w-48 h-48" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  {t('downloadQr')}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Printer className="h-4 w-4" />
                  {t('printQr')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
