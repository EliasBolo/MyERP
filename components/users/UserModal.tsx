'use client';

import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface UserModalProps {
  user?: any;
  currentUserRole?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function UserModal({ user, currentUserRole, onClose, onSave }: UserModalProps) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    confirmPassword: '',
    role: user?.role ?? 'user',
    isActive: user?.isActive ?? true,
  });

  const availableRoles =
    currentUserRole === 'master_admin'
      ? [
          { value: 'master_admin', label: 'Κεντρικός Διαχειριστής' },
          { value: 'business_admin', label: 'Διαχειριστής Επιχείρησης' },
          { value: 'user', label: 'Χρήστης' },
        ]
      : [
          { value: 'business_admin', label: 'Διαχειριστής Επιχείρησης' },
          { value: 'user', label: 'Χρήστης' },
        ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isEdit && form.password !== form.confirmPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    if (!isEdit && form.password.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      const url = isEdit ? `/api/users/${user.id}` : '/api/users';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Επεξεργασία Χρήστη' : 'Νέος Χρήστης'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ονοματεπώνυμο *</label>
              <input required value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {isEdit ? 'Νέος Κωδικός (κενό = χωρίς αλλαγή)' : 'Κωδικός *'}
              </label>
              <input
                type="password"
                required={!isEdit}
                minLength={isEdit ? 0 : 8}
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={isEdit ? 'Αφήστε κενό για χωρίς αλλαγή' : 'Τουλάχιστον 8 χαρακτήρες'}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {(!isEdit || form.password) && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Επιβεβαίωση Κωδικού</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ρόλος</label>
              <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="userActive" checked={form.isActive}
                onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary" />
              <label htmlFor="userActive" className="text-sm text-foreground">Ενεργός χρήστης</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Ακύρωση
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isEdit ? 'Ενημέρωση' : 'Δημιουργία'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
