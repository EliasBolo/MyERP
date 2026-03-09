'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  UserCircle2,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* create modal */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  /* change password modal */
  const [pwTarget, setPwTarget] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  /* delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── fetch only master_admin users ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users?scope=admin');
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── filtered list ── */
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  /* ── create admin user ── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        scope: 'admin',
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error ?? 'Σφάλμα'); return; }
    setCreateSuccess(`Ο διαχειριστής ${data.user.name} δημιουργήθηκε επιτυχώς!`);
    setCreateForm({ name: '', email: '', password: '', confirmPassword: '' });
    await loadData();
  }

  /* ── toggle active ── */
  async function toggleActive(u: AdminUser) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
  }

  /* ── change password ── */
  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmNewPw) { setPwError('Οι κωδικοί δεν ταιριάζουν'); return; }
    setPwSaving(true);
    const res = await fetch(`/api/admin/users/${pwTarget!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwError(data.error ?? 'Σφάλμα'); return; }
    setPwTarget(null); setNewPw(''); setConfirmNewPw('');
  }

  /* ── delete ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    setDeleteTarget(null);
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
  }

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30">
            <Shield className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Διαχειριστές Admin</h1>
            <p className="text-sm text-muted-foreground">
              Χρήστες με πρόσβαση στο Master Admin panel
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateSuccess(''); setCreateError(''); }}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Νέος Διαχειριστής
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Σύνολο', value: users.length, color: 'text-foreground' },
          { label: 'Ενεργοί', value: users.filter(u => u.isActive).length, color: 'text-green-400' },
          { label: 'Ανενεργοί', value: users.filter(u => !u.isActive).length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Αναζήτηση διαχειριστή…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <UserCircle2 className="h-12 w-12 opacity-30" />
          <p className="text-sm">Δεν βρέθηκαν διαχειριστές</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Διαχειριστής</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Εγγραφή</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Κατάσταση</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-semibold text-xs flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('el-GR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(u)} title={u.isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}>
                      {u.isActive
                        ? <ToggleRight className="h-6 w-6 text-green-400 mx-auto" />
                        : <ToggleLeft className="h-6 w-6 text-muted-foreground mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => { setPwTarget(u); setNewPw(''); setConfirmNewPw(''); setPwError(''); setShowNewPw(false); }}
                        title="Αλλαγή κωδικού"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        title="Διαγραφή"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Admin User Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Νέος Διαχειριστής Admin</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Πλήρης πρόσβαση στο Master Admin panel</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {createSuccess ? (
              <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-400" />
                <p className="font-medium text-foreground">{createSuccess}</p>
                <div className="flex gap-3">
                  <button onClick={() => setCreateSuccess('')}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    Νέος Διαχειριστής
                  </button>
                  <button onClick={() => { setShowCreate(false); setCreateSuccess(''); }}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500 transition-colors">
                    Κλείσιμο
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                {createError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {createError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Όνομα <span className="text-red-400">*</span></label>
                  <input value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
                    required placeholder="Ονοματεπώνυμο"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email <span className="text-red-400">*</span></label>
                  <input type="email" value={createForm.email} onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                    required placeholder="admin@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Κωδικός <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={createForm.password}
                        onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                        required placeholder="min 8 χαρακτήρες"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Επιβεβαίωση <span className="text-red-400">*</span></label>
                    <input type={showPw ? 'text' : 'password'} value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      required placeholder="Επανάληψη"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    Άκυρο
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50">
                    {creating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus className="h-4 w-4" />}
                    Δημιουργία
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Αλλαγή Κωδικού</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{pwTarget.name} · {pwTarget.email}</p>
              </div>
              <button onClick={() => setPwTarget(null)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleChangePw} className="px-6 py-5 space-y-4">
              {pwError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{pwError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Νέος Κωδικός <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    required placeholder="min 8 χαρακτήρες"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Επιβεβαίωση <span className="text-red-400">*</span></label>
                <input type={showNewPw ? 'text' : 'password'} value={confirmNewPw} onChange={(e) => setConfirmNewPw(e.target.value)}
                  required placeholder="Επανάληψη νέου κωδικού"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPwTarget(null)} className="flex-1 rounded-xl border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors">Άκυρο</button>
                <button type="submit" disabled={pwSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                  {pwSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <KeyRound className="h-4 w-4" />}
                  Αποθήκευση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mx-auto">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-foreground">Διαγραφή Διαχειριστή</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Διαγραφή του <span className="font-medium text-foreground">{deleteTarget.name}</span>; Θα χάσει την πρόσβαση στο Admin panel.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors">Άκυρο</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
                {deleting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                Διαγραφή
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
