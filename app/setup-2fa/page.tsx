'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ShieldCheck, Copy, Check } from 'lucide-react';

export default function Setup2FAPage() {
  const { update } = useSession();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetch('/api/auth/setup-2fa')
      .then((r) => r.json())
      .then((data) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      });
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Μη έγκυρος κωδικός');
        setLoading(false);
        return;
      }

      await update({ twoFactorEnabled: true, twoFactorVerified: true });
      window.location.href = '/dashboard';
    } catch {
      setError('Σφάλμα ρύθμισης');
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Εγκατάσταση 2FA</h1>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Βήμα 1: Εγκαταστήστε Google Authenticator
              </h3>
              <p className="text-xs text-muted-foreground">
                Κατεβάστε την εφαρμογή Google Authenticator ή Authy στο κινητό σας.
              </p>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-xs text-amber-200">
                <strong>Επαναφορά 2FA;</strong> Διαγράψτε την παλιά καταχώρηση MyERP από το authenticator σας πριν σαρώσετε τον νέο QR κώδικα.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Βήμα 2: Σαρώστε τον νέο QR κώδικα
              </h3>
              {qrCode ? (
                <div className="flex justify-center">
                  <div className="rounded-lg bg-white p-3">
                    <img src={qrCode} alt="QR Code" className="h-40 w-40" />
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                </div>
              )}

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Ή εισάγετε τον κωδικό χειροκίνητα:
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <code className="flex-1 text-xs font-mono text-foreground break-all">{secret}</code>
                  <button
                    onClick={copySecret}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleEnable} className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Βήμα 3: Επαληθεύστε τον κωδικό
                </h3>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center text-xl font-mono tracking-[0.4em] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Ενεργοποίηση 2FA
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
