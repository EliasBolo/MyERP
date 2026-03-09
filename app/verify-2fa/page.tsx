'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, KeyRound } from 'lucide-react';

export default function Verify2FAPage() {
  const { data: session, update } = useSession();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [password, setPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const isMasterAdmin = (session?.user as any)?.role === 'master_admin';

  async function handleResetWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/reset-2fa-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Invalid password');
        setResetLoading(false);
        return;
      }
      await update({ twoFactorEnabled: false, twoFactorVerified: true });
      window.location.href = '/setup-2fa';
    } catch {
      setResetError('Error');
      setResetLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-2fa', {
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

      await update({ twoFactorVerified: true });
      window.location.href = '/dashboard';
    } catch {
      setError('Σφάλμα επαλήθευσης');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/25">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Επαλήθευση 2FA</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ανοίξτε την εφαρμογή authenticator και εισάγετε τον κωδικό
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-center">
              Κωδικός Επαλήθευσης
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            Επαλήθευση
          </button>

          {isMasterAdmin && (
            <div className="mt-6 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Χάσατε τον κωδικό; Επαναφορά με κωδικό πρόσβασης
              </button>
              {showPasswordReset && (
                <form onSubmit={handleResetWithPassword} className="mt-3 space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Κωδικός πρόσβασης"
                    className="w-full rounded-lg border border-border bg-muted px-4 py-2 text-sm"
                  />
                  {resetError && <p className="text-xs text-red-400">{resetError}</p>}
                  <button
                    type="submit"
                    disabled={resetLoading || !password}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {resetLoading ? '...' : 'Επαναφορά 2FA'}
                  </button>
                </form>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
