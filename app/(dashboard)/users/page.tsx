'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Plus, Edit2, Trash2, Users, ShieldCheck, Shield, User,
  CheckCircle, XCircle,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import UserModal from '@/components/users/UserModal';

export default function UsersPage() {
  const t = useTranslations('users');
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const currentUser = session?.user as any;

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (id === currentUser?.id) return alert('Δεν μπορείτε να διαγράψετε τον εαυτό σας');
    if (!confirm('Διαγραφή χρήστη;')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    loadUsers();
  }

  async function handleToggleActive(user: any) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    loadUsers();
  }

  const roleConfig: Record<string, { label: string; icon: any; color: string }> = {
    master_admin: { label: 'Κεντρ. Διαχ.', icon: ShieldCheck, color: 'text-purple-400' },
    business_admin: { label: 'Διαχειριστής', icon: Shield, color: 'text-blue-400' },
    user: { label: 'Χρήστης', icon: User, color: 'text-gray-400' },
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">{users.length} χρήστες</p>
        </div>
        {(currentUser?.role === 'master_admin' || currentUser?.role === 'business_admin') && (
          <button
            onClick={() => { setSelectedUser(null); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addUser')}</span>
          </button>
        )}
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
                  <th>Χρήστης</th>
                  <th>Ρόλος</th>
                  <th className="hidden md:table-cell">Επιχείρηση</th>
                  <th className="hidden sm:table-cell">2FA</th>
                  <th className="hidden lg:table-cell">Τελ. Σύνδεση</th>
                  <th>Κατάσταση</th>
                  <th className="text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Δεν υπάρχουν χρήστες</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const role = roleConfig[user.role] ?? roleConfig.user;
                    const Icon = role.icon;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex-shrink-0">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${role.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {role.label}
                          </span>
                        </td>
                        <td className="hidden md:table-cell text-sm text-muted-foreground">
                          {user.business?.name ?? '—'}
                        </td>
                        <td className="hidden sm:table-cell">
                          {user.twoFactorEnabled ? (
                            <span className="badge badge-success">Ενεργό</span>
                          ) : (
                            <span className="badge badge-neutral">Ανενεργό</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell text-xs text-muted-foreground">
                          {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Ποτέ'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={user.id === currentUser?.id}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                              user.isActive ? 'text-green-400' : 'text-red-400'
                            } disabled:opacity-50`}
                          >
                            {user.isActive ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span className="hidden sm:block">
                              {user.isActive ? 'Ενεργός' : 'Ανενεργός'}
                            </span>
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedUser(user); setShowModal(true); }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={selectedUser}
          currentUserRole={currentUser?.role}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadUsers(); }}
        />
      )}
    </div>
  );
}
