'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Building2, Lock, Mail, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import SupportContactModal from '@/components/auth/SupportContactModal';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  // Honeypot: hidden from users, bots often fill it
  const [hpWebsite, setHpWebsite] = useState('');
  const [hpPhone, setHpPhone] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hpWebsite || hpPhone) {
      setError(t('auth.invalidCredentials'));
      return;
    }
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t('auth.invalidCredentials'));
      setLoading(false);
      return;
    }

    // Check if 2FA needed - middleware will handle redirect
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/25">
              <Building2 className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">MyERP</h1>
          <p className="text-blue-200 text-lg max-w-sm">
            Ολοκληρωμένο σύστημα διαχείρισης επιχείρησης
          </p>
          <div className="mt-12 space-y-4 text-left">
            {[
              { icon: '📦', text: 'Διαχείριση Αποθήκης & Αποθεμάτων' },
              { icon: '👥', text: 'Διαχείριση Πελατών & Προμηθευτών' },
              { icon: '📊', text: 'Οικονομικά Αναλυτικά & Αναφορές' },
              { icon: '🔒', text: 'Ασφαλής Πρόσβαση με 2FA' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-blue-100">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="ml-3 text-2xl font-bold text-foreground">MyERP</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">{t('auth.loginTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-border bg-muted pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            {/* Honeypot fields - hidden from view, bots fill them */}
            <div
              className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden"
              aria-hidden="true"
            >
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
              />
              <input
                type="text"
                name="phone"
                tabIndex={-1}
                autoComplete="off"
                value={hpPhone}
                onChange={(e) => setHpPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-muted pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              {loading ? t('common.loading') : t('auth.login')}
            </button>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <HelpCircle className="h-4 w-4" />
                {t('auth.forgotPassword')}
              </button>
            </div>
          </form>

          {showSupportModal && (
            <SupportContactModal
              onClose={() => setShowSupportModal(false)}
              title={t('auth.requestPasswordChange')}
              message={t('auth.requestPasswordChangeMessage')}
            />
          )}

          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>Ασφαλής σύνδεση με κρυπτογράφηση SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
