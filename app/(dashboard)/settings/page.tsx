'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Settings, Building, Shield, Database, Download, Upload,
  Eye, EyeOff, Check, QrCode,
} from 'lucide-react';
import { exportToCSV } from '@/lib/export-csv';

type Tab = 'business' | 'security' | 'data';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const user = session?.user as any;

  // Business settings
  const [business, setBusiness] = useState({
    name: '', vatNumber: '', address: '', phone: '', email: '', currency: 'EUR',
  });

  // Security
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [setting2fa, setSetting2fa] = useState(false);

  useEffect(() => {
    if (user?.businessId) {
      fetch('/api/settings/business')
        .then(r => r.json())
        .then(data => {
          if (data.business) setBusiness({
            name: data.business.name ?? '',
            vatNumber: data.business.vatNumber ?? '',
            address: data.business.address ?? '',
            phone: data.business.phone ?? '',
            email: data.business.email ?? '',
            currency: data.business.currency ?? 'EUR',
          });
        });
    }
  }, [user?.businessId]);

  function showMsg(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/settings/business', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(business),
    });
    setLoading(false);
    if (res.ok) showMsg('success', 'Αποθηκεύτηκε επιτυχώς');
    else showMsg('error', 'Σφάλμα αποθήκευσης');
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      showMsg('error', 'Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    if (pwForm.newPw.length < 8) {
      showMsg('error', 'Τουλάχιστον 8 χαρακτήρες');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/settings/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: pwForm.current, newPassword: pwForm.newPw }),
    });
    setLoading(false);
    if (res.ok) {
      showMsg('success', 'Κωδικός αλλάχτηκε επιτυχώς');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } else {
      const d = await res.json();
      showMsg('error', d.error || 'Σφάλμα');
    }
  }

  async function setup2FA() {
    const res = await fetch('/api/auth/setup-2fa');
    const data = await res.json();
    setQrCode(data.qrCode);
    setSetting2fa(true);
  }

  async function enable2FA() {
    const res = await fetch('/api/auth/setup-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    });
    if (res.ok) {
      await update({ twoFactorEnabled: true });
      setSetting2fa(false);
      showMsg('success', 'Το 2FA ενεργοποιήθηκε');
    } else showMsg('error', 'Μη έγκυρος κωδικός');
  }

  async function disable2FA() {
    if (!confirm('Απενεργοποίηση 2FA;')) return;
    const res = await fetch('/api/auth/setup-2fa', { method: 'DELETE' });
    if (res.ok) {
      await update({ twoFactorEnabled: false });
      showMsg('success', '2FA απενεργοποιήθηκε');
    }
  }

  async function exportData(type: 'all' | 'clients' | 'storage' | 'financial') {
    const res = await fetch(`/api/settings/export?type=${type}`);
    const data = await res.json();
    if (!data.rows) return;
    exportToCSV(data.rows, data.columns, `export-${type}`);
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const confirmed = confirm(t('importWarning'));
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch('/api/settings/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: text, filename: file.name }),
    });
    setLoading(false);
    if (res.ok) showMsg('success', 'Δεδομένα εισήχθησαν επιτυχώς');
    else showMsg('error', 'Σφάλμα εισαγωγής');
    e.target.value = '';
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'business', label: 'Επιχείρηση', icon: Building },
    { id: 'security', label: 'Ασφάλεια', icon: Shield },
    { id: 'data', label: 'Δεδομένα', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">Διαχείριση ρυθμίσεων εφαρμογής και λογαριασμού</p>
      </div>

      {(success || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm ${success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {success || error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Business settings */}
      {activeTab === 'business' && user?.businessId && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-5">Στοιχεία Επιχείρησης</h2>
          <form onSubmit={saveBusiness} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Επωνυμία *</label>
                <input required value={business.name} onChange={(e) => setBusiness(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">ΑΦΜ</label>
                <input value={business.vatNumber} onChange={(e) => setBusiness(p => ({ ...p, vatNumber: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Τηλέφωνο</label>
                <input value={business.phone} onChange={(e) => setBusiness(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Διεύθυνση</label>
                <input value={business.address} onChange={(e) => setBusiness(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input type="email" value={business.email} onChange={(e) => setBusiness(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Νόμισμα</label>
                <select value={business.currency} onChange={(e) => setBusiness(p => ({ ...p, currency: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Αποθήκευση
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Change password */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5">Αλλαγή Κωδικού</h2>
            <form onSubmit={changePassword} className="space-y-4 max-w-sm">
              {['current', 'newPw', 'confirm'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {field === 'current' ? 'Τρέχων Κωδικός' : field === 'newPw' ? 'Νέος Κωδικός' : 'Επιβεβαίωση'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={(pwForm as any)[field]}
                      onChange={(e) => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 pr-10 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Αλλαγή Κωδικού
              </button>
            </form>
          </div>

          {/* 2FA */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Επαλήθευση 2 Παραγόντων (2FA)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.twoFactorEnabled ? 'Το 2FA είναι ενεργό για τον λογαριασμό σας' : 'Προσθέστε επιπλέον ασφάλεια στον λογαριασμό σας'}
                </p>
              </div>
              <span className={`badge ${user?.twoFactorEnabled ? 'badge-success' : 'badge-neutral'}`}>
                {user?.twoFactorEnabled ? 'Ενεργό' : 'Ανενεργό'}
              </span>
            </div>

            {setting2fa && qrCode ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-white p-3 inline-block">
                  <img src={qrCode} alt="QR Code" className="h-36 w-36" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Κωδικός Επαλήθευσης</label>
                  <div className="flex gap-2">
                    <input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      className="w-32 rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm text-foreground focus:border-primary focus:outline-none" />
                    <button onClick={enable2FA} disabled={totpCode.length !== 6}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50">
                      <Check className="h-4 w-4" />
                      Επαλήθευση
                    </button>
                    <button onClick={() => setSetting2fa(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                      Ακύρωση
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {!user?.twoFactorEnabled ? (
                  <button onClick={setup2FA}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                    <QrCode className="h-4 w-4" />
                    Ενεργοποίηση 2FA
                  </button>
                ) : (
                  <button onClick={disable2FA}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20">
                    Απενεργοποίηση 2FA
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data management */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Εξαγωγή Δεδομένων</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Εξάγετε τα δεδομένα σας σε CSV αρχείο
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { type: 'all', label: 'Όλα τα δεδομένα', icon: '📦' },
                { type: 'clients', label: 'Πελάτες', icon: '👥' },
                { type: 'storage', label: 'Αποθήκη', icon: '🏭' },
                { type: 'financial', label: 'Οικονομικά', icon: '💰' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => exportData(item.type as any)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center hover:bg-muted hover:border-border/80 transition-colors"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Εισαγωγή Δεδομένων</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Εισάγετε δεδομένα από CSV αρχείο (εξαγμένο από MyERP)
            </p>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">Σύρετε ή επιλέξτε CSV αρχείο</p>
              <label className="cursor-pointer">
                <span className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Επιλογή αρχείου
                </span>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={importData}
                />
              </label>
            </div>
            <div className="mt-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3">
              <p className="text-xs text-yellow-400">
                ⚠️ {t('importWarning')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
