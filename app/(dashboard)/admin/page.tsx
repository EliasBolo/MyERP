'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Shield, Plus, Edit2, Trash2, Check, X,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Calendar, Layers, AlertTriangle, CheckCircle, Clock, Ban,
  UserPlus, Eye, EyeOff,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  production: 'Production',
};

const TIER_COLORS: Record<string, string> = {
  standard: 'badge-info',
  production: 'badge-warning',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ενεργό',
  inactive: 'Ανενεργό',
  trial: 'Δοκιμαστικό',
  expired: 'Ληγμένο',
};

const STATUS_ICONS: Record<string, any> = {
  active: CheckCircle,
  inactive: Ban,
  trial: Clock,
  expired: AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400',
  inactive: 'text-gray-400',
  trial: 'text-yellow-400',
  expired: 'text-red-400',
};

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'Εκκρεμεί',
  active: 'Ενεργή',
  completed: 'Ολοκληρώθηκε',
  cancelled: 'Ακυρώθηκε',
};

const PHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'badge-neutral',
  active: 'badge-success',
  completed: 'badge-info',
  cancelled: 'badge-danger',
};

interface Phase {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: string;
  order: number;
}

interface Business {
  id: string;
  name: string;
  email?: string;
  vatNumber?: string;
  phone?: string;
  isActive: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  licenseExpiresAt?: string;
  createdAt: string;
  subscriptionPhases: Phase[];
  _count: { users: number; invoices: number; clients: number; products: number };
}

const EMPTY_BIZ_FORM = {
  businessName: '',
  businessEmail: '',
  vatNumber: '',
  phone: '',
  address: '',
  subscriptionTier: 'standard',
  subscriptionStatus: 'active',
  licenseExpiresAt: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
};

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create business modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bizForm, setBizForm] = useState({ ...EMPTY_BIZ_FORM });
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{ businessName: string; adminEmail: string } | null>(null);

  // Subscription edit state
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ subscriptionTier: '', subscriptionStatus: '', licenseExpiresAt: '', isActive: true });
  const [subSaving, setSubSaving] = useState(false);

  // Phase form state
  const [showPhaseForm, setShowPhaseForm] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState({ name: '', description: '', startDate: '', endDate: '', status: 'pending' });
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [phaseEditForm, setPhaseEditForm] = useState<any>({});
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [phaseError, setPhaseError] = useState('');

  useEffect(() => { loadBusinesses(); }, []);

  async function loadBusinesses() {
    setLoading(true);
    const res = await fetch('/api/admin/businesses');
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setBizForm({ ...EMPTY_BIZ_FORM });
    setBizError('');
    setCreateSuccess(null);
    setShowPassword(false);
    setShowCreateModal(true);
  }

  async function submitCreateBusiness() {
    setBizError('');
    if (!bizForm.businessName.trim()) { setBizError('Το όνομα επιχείρησης είναι υποχρεωτικό'); return; }
    if (!bizForm.adminName.trim()) { setBizError('Το όνομα διαχειριστή είναι υποχρεωτικό'); return; }
    if (!bizForm.adminEmail.trim()) { setBizError('Το email διαχειριστή είναι υποχρεωτικό'); return; }
    if (!bizForm.adminPassword) { setBizError('Ο κωδικός είναι υποχρεωτικός'); return; }
    if (bizForm.adminPassword.length < 8) { setBizError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'); return; }
    if (bizForm.adminPassword !== bizForm.adminPasswordConfirm) { setBizError('Οι κωδικοί δεν ταιριάζουν'); return; }

    setBizSaving(true);
    const res = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: bizForm.businessName,
        businessEmail: bizForm.businessEmail,
        vatNumber: bizForm.vatNumber,
        phone: bizForm.phone,
        address: bizForm.address,
        subscriptionTier: bizForm.subscriptionTier,
        subscriptionStatus: bizForm.subscriptionStatus,
        licenseExpiresAt: bizForm.licenseExpiresAt || null,
        adminName: bizForm.adminName,
        adminEmail: bizForm.adminEmail,
        adminPassword: bizForm.adminPassword,
      }),
    });
    setBizSaving(false);

    if (res.ok) {
      setCreateSuccess({ businessName: bizForm.businessName, adminEmail: bizForm.adminEmail });
      loadBusinesses();
    } else {
      const d = await res.json();
      setBizError(d.error ?? 'Σφάλμα κατά τη δημιουργία');
    }
  }

  function startEditSub(b: Business) {
    setEditingSub(b.id);
    setSubForm({
      subscriptionTier: b.subscriptionTier,
      subscriptionStatus: b.subscriptionStatus,
      licenseExpiresAt: b.licenseExpiresAt ? b.licenseExpiresAt.split('T')[0] : '',
      isActive: b.isActive,
    });
  }

  async function saveSub(id: string) {
    setSubSaving(true);
    const res = await fetch(`/api/admin/businesses/${id}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...subForm,
        licenseExpiresAt: subForm.licenseExpiresAt || null,
      }),
    });
    setSubSaving(false);
    if (res.ok) {
      setEditingSub(null);
      loadBusinesses();
    }
  }

  // Quick-toggle license active/inactive
  async function toggleLicense(b: Business) {
    const newStatus = b.subscriptionStatus === 'active' ? 'inactive' : 'active';
    await fetch(`/api/admin/businesses/${b.id}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionStatus: newStatus }),
    });
    loadBusinesses();
  }

  async function addPhase(businessId: string) {
    if (!phaseForm.name || !phaseForm.startDate) { setPhaseError('Απαιτούνται Όνομα και Ημ. Έναρξης'); return; }
    setPhaseSaving(true);
    setPhaseError('');
    const res = await fetch(`/api/admin/businesses/${businessId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...phaseForm, endDate: phaseForm.endDate || null }),
    });
    setPhaseSaving(false);
    if (res.ok) {
      setShowPhaseForm(null);
      setPhaseForm({ name: '', description: '', startDate: '', endDate: '', status: 'pending' });
      loadBusinesses();
    } else {
      const d = await res.json();
      setPhaseError(d.error ?? 'Σφάλμα');
    }
  }

  async function savePhase(businessId: string, phaseId: string) {
    setPhaseSaving(true);
    const res = await fetch(`/api/admin/businesses/${businessId}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...phaseEditForm, endDate: phaseEditForm.endDate || null }),
    });
    setPhaseSaving(false);
    if (res.ok) { setEditingPhase(null); loadBusinesses(); }
  }

  async function deletePhase(businessId: string, phaseId: string) {
    if (!confirm('Διαγραφή φάσης;')) return;
    await fetch(`/api/admin/businesses/${businessId}/phases/${phaseId}`, { method: 'DELETE' });
    loadBusinesses();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <h1 className="page-title">Πίνακας Master Admin</h1>
          </div>
          <p className="page-subtitle">{businesses.length} επιχειρήσεις · Διαχείριση αδειών & συνδρομών</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus className="h-4 w-4" />
          Νέα Επιχείρηση
        </button>
      </div>

      {/* Tier legend */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-info">Standard</span>
            <span className="text-sm font-medium text-foreground">Βασική Συνδρομή</span>
          </div>
          <p className="text-xs text-muted-foreground">Ενιαίο πακέτο. Δεν υποστηρίζει φάσεις. Όλα τα modules ενεργά.</p>
        </div>
        <div className="w-px bg-border hidden sm:block" />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-warning">Production</span>
            <span className="text-sm font-medium text-foreground">Πλήρης Συνδρομή</span>
          </div>
          <p className="text-xs text-muted-foreground">Υποστηρίζει πολλαπλές φάσεις. Ο admin ορίζει χρονοδιάγραμμα υλοποίησης.</p>
        </div>
      </div>

      {/* Business list */}
      <div className="space-y-3">
        {businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-border bg-card text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Δεν βρέθηκαν επιχειρήσεις</p>
          </div>
        ) : (
          businesses.map((b) => {
            const isOpen = expanded === b.id;
            const isEditingThisSub = editingSub === b.id;
            const StatusIcon = STATUS_ICONS[b.subscriptionStatus] ?? CheckCircle;
            const isActive = b.subscriptionStatus === 'active';

            return (
              <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Business row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon + name */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{b.name}</p>
                      <span className={`badge ${TIER_COLORS[b.subscriptionTier] ?? 'badge-neutral'}`}>
                        {TIER_LABELS[b.subscriptionTier] ?? b.subscriptionTier}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLORS[b.subscriptionStatus] ?? 'text-muted-foreground'}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {STATUS_LABELS[b.subscriptionStatus] ?? b.subscriptionStatus}
                      </span>
                      {b.licenseExpiresAt && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Λήγει {formatDate(b.licenseExpiresAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {b.email && <span>{b.email}</span>}
                      <span>{b._count.users} χρήστες</span>
                      <span>{b._count.clients} πελάτες</span>
                      <span>{b._count.invoices} τιμολόγια</span>
                    </div>
                  </div>

                  {/* Quick toggle */}
                  <button
                    onClick={() => toggleLicense(b)}
                    title={isActive ? 'Απενεργοποίηση άδειας' : 'Ενεργοποίηση άδειας'}
                    className={`flex-shrink-0 transition-colors ${isActive ? 'text-green-400 hover:text-red-400' : 'text-gray-500 hover:text-green-400'}`}
                  >
                    {isActive
                      ? <ToggleRight className="h-7 w-7" />
                      : <ToggleLeft className="h-7 w-7" />
                    }
                  </button>

                  {/* Edit sub button */}
                  <button
                    onClick={() => isEditingThisSub ? setEditingSub(null) : startEditSub(b)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Επεξεργασία συνδρομής"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Inline subscription editor */}
                {isEditingThisSub && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Επεξεργασία Συνδρομής</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Tier</label>
                        <select
                          value={subForm.subscriptionTier}
                          onChange={(e) => setSubForm(p => ({ ...p, subscriptionTier: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="standard">Standard</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Κατάσταση</label>
                        <select
                          value={subForm.subscriptionStatus}
                          onChange={(e) => setSubForm(p => ({ ...p, subscriptionStatus: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="active">Ενεργό</option>
                          <option value="trial">Δοκιμαστικό</option>
                          <option value="inactive">Ανενεργό</option>
                          <option value="expired">Ληγμένο</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Λήξη Άδειας</label>
                        <input
                          type="date"
                          value={subForm.licenseExpiresAt}
                          onChange={(e) => setSubForm(p => ({ ...p, licenseExpiresAt: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Επιχείρηση</label>
                        <select
                          value={subForm.isActive ? 'true' : 'false'}
                          onChange={(e) => setSubForm(p => ({ ...p, isActive: e.target.value === 'true' }))}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="true">Ενεργή</option>
                          <option value="false">Ανενεργή</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => saveSub(b.id)}
                        disabled={subSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Αποθήκευση
                      </button>
                      <button
                        onClick={() => setEditingSub(null)}
                        className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Ακύρωση
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded: phases panel */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Φάσεις Συνδρομής</span>
                        {b.subscriptionTier !== 'production' && (
                          <span className="text-xs text-yellow-400 ml-2">
                            ⚠ Απαιτείται Production tier
                          </span>
                        )}
                      </div>
                      {b.subscriptionTier === 'production' && (
                        <button
                          onClick={() => { setShowPhaseForm(b.id); setPhaseError(''); setPhaseForm({ name: '', description: '', startDate: '', endDate: '', status: 'pending' }); }}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Νέα Φάση
                        </button>
                      )}
                    </div>

                    {/* Add phase form */}
                    {showPhaseForm === b.id && (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                        {phaseError && <p className="text-xs text-red-400">{phaseError}</p>}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs text-muted-foreground">Όνομα Φάσης *</label>
                            <input
                              type="text"
                              value={phaseForm.name}
                              onChange={(e) => setPhaseForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="π.χ. Φάση 1 – Onboarding"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs text-muted-foreground">Περιγραφή</label>
                            <input
                              type="text"
                              value={phaseForm.description}
                              onChange={(e) => setPhaseForm(p => ({ ...p, description: e.target.value }))}
                              placeholder="Προαιρετική περιγραφή..."
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Ημ. Έναρξης *</label>
                            <input
                              type="date"
                              value={phaseForm.startDate}
                              onChange={(e) => setPhaseForm(p => ({ ...p, startDate: e.target.value }))}
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Ημ. Λήξης</label>
                            <input
                              type="date"
                              value={phaseForm.endDate}
                              onChange={(e) => setPhaseForm(p => ({ ...p, endDate: e.target.value }))}
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Κατάσταση</label>
                            <select
                              value={phaseForm.status}
                              onChange={(e) => setPhaseForm(p => ({ ...p, status: e.target.value }))}
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            >
                              <option value="pending">Εκκρεμεί</option>
                              <option value="active">Ενεργή</option>
                              <option value="completed">Ολοκληρώθηκε</option>
                              <option value="cancelled">Ακυρώθηκε</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addPhase(b.id)}
                            disabled={phaseSaving}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Αποθήκευση
                          </button>
                          <button
                            onClick={() => setShowPhaseForm(null)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                          >
                            Ακύρωση
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Phases list */}
                    {b.subscriptionPhases.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        {b.subscriptionTier === 'production'
                          ? 'Δεν έχουν οριστεί φάσεις ακόμα.'
                          : 'Αλλάξτε σε Production tier για να διαχειριστείτε φάσεις.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {b.subscriptionPhases.map((phase, idx) => {
                          const isEditingThisPhase = editingPhase === phase.id;
                          return (
                            <div key={phase.id} className="rounded-lg border border-border bg-card px-4 py-3">
                              {isEditingThisPhase ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div>
                                      <label className="text-xs text-muted-foreground">Όνομα</label>
                                      <input
                                        type="text"
                                        value={phaseEditForm.name ?? ''}
                                        onChange={(e) => setPhaseEditForm((p: any) => ({ ...p, name: e.target.value }))}
                                        className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Κατάσταση</label>
                                      <select
                                        value={phaseEditForm.status ?? 'pending'}
                                        onChange={(e) => setPhaseEditForm((p: any) => ({ ...p, status: e.target.value }))}
                                        className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                                      >
                                        <option value="pending">Εκκρεμεί</option>
                                        <option value="active">Ενεργή</option>
                                        <option value="completed">Ολοκληρώθηκε</option>
                                        <option value="cancelled">Ακυρώθηκε</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Έναρξη</label>
                                      <input
                                        type="date"
                                        value={phaseEditForm.startDate?.split('T')[0] ?? ''}
                                        onChange={(e) => setPhaseEditForm((p: any) => ({ ...p, startDate: e.target.value }))}
                                        className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Λήξη</label>
                                      <input
                                        type="date"
                                        value={phaseEditForm.endDate?.split('T')[0] ?? ''}
                                        onChange={(e) => setPhaseEditForm((p: any) => ({ ...p, endDate: e.target.value }))}
                                        className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="text-xs text-muted-foreground">Περιγραφή</label>
                                      <input
                                        type="text"
                                        value={phaseEditForm.description ?? ''}
                                        onChange={(e) => setPhaseEditForm((p: any) => ({ ...p, description: e.target.value }))}
                                        className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => savePhase(b.id, phase.id)} disabled={phaseSaving}
                                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                                      <Check className="h-3.5 w-3.5" /> Αποθήκευση
                                    </button>
                                    <button onClick={() => setEditingPhase(null)}
                                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                      Ακύρωση
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{phase.name}</p>
                                      {phase.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {formatDate(phase.startDate)}
                                          {phase.endDate && ` → ${formatDate(phase.endDate)}`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`badge ${PHASE_STATUS_COLORS[phase.status] ?? 'badge-neutral'} text-xs`}>
                                      {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
                                    </span>
                                    <button
                                      onClick={() => { setEditingPhase(phase.id); setPhaseEditForm({ ...phase }); }}
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => deletePhase(b.id, phase.id)}
                                      className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Business Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
                  <Building2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Νέα Επιχείρηση</h2>
                  <p className="text-xs text-muted-foreground">Δημιουργία επιχείρησης & διαχειριστή</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success state */}
            {createSuccess ? (
              <div className="px-6 py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Δημιουργήθηκε!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Η επιχείρηση <span className="font-medium text-foreground">{createSuccess.businessName}</span> και ο διαχειριστής{' '}
                    <span className="font-medium text-foreground">{createSuccess.adminEmail}</span> δημιουργήθηκαν επιτυχώς.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => { setBizForm({ ...EMPTY_BIZ_FORM }); setBizError(''); setCreateSuccess(null); }}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Νέα Επιχείρηση
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
                  >
                    Κλείσιμο
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[75vh]">
                <div className="px-6 py-5 space-y-5">
                  {/* Error */}
                  {bizError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {bizError}
                    </div>
                  )}

                  {/* Section 1: Business Info */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Στοιχεία Επιχείρησης
                    </p>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Επωνυμία *</label>
                      <input
                        type="text"
                        value={bizForm.businessName}
                        onChange={(e) => setBizForm(p => ({ ...p, businessName: e.target.value }))}
                        placeholder="π.χ. Εταιρεία ΑΕ"
                        className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email Επιχείρησης</label>
                        <input
                          type="email"
                          value={bizForm.businessEmail}
                          onChange={(e) => setBizForm(p => ({ ...p, businessEmail: e.target.value }))}
                          placeholder="info@company.gr"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">ΑΦΜ</label>
                        <input
                          type="text"
                          value={bizForm.vatNumber}
                          onChange={(e) => setBizForm(p => ({ ...p, vatNumber: e.target.value }))}
                          placeholder="123456789"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Τηλέφωνο</label>
                        <input
                          type="text"
                          value={bizForm.phone}
                          onChange={(e) => setBizForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="210 0000000"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Διεύθυνση</label>
                        <input
                          type="text"
                          value={bizForm.address}
                          onChange={(e) => setBizForm(p => ({ ...p, address: e.target.value }))}
                          placeholder="Αθήνα, Αττική"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Συνδρομή Tier</label>
                        <select
                          value={bizForm.subscriptionTier}
                          onChange={(e) => setBizForm(p => ({ ...p, subscriptionTier: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="standard">Standard</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Κατάσταση</label>
                        <select
                          value={bizForm.subscriptionStatus}
                          onChange={(e) => setBizForm(p => ({ ...p, subscriptionStatus: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="active">Ενεργό</option>
                          <option value="trial">Δοκιμαστικό</option>
                          <option value="inactive">Ανενεργό</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">Λήξη Άδειας (προαιρετικό)</label>
                        <input
                          type="date"
                          value={bizForm.licenseExpiresAt}
                          onChange={(e) => setBizForm(p => ({ ...p, licenseExpiresAt: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Section 2: Admin Credentials */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5" />
                      Στοιχεία Διαχειριστή (Business Admin)
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Όνομα *</label>
                        <input
                          type="text"
                          value={bizForm.adminName}
                          onChange={(e) => setBizForm(p => ({ ...p, adminName: e.target.value }))}
                          placeholder="Γιάννης Παπαδόπουλος"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email *</label>
                        <input
                          type="email"
                          value={bizForm.adminEmail}
                          onChange={(e) => setBizForm(p => ({ ...p, adminEmail: e.target.value }))}
                          placeholder="admin@company.gr"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Κωδικός *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={bizForm.adminPassword}
                          onChange={(e) => setBizForm(p => ({ ...p, adminPassword: e.target.value }))}
                          placeholder="Τουλάχιστον 8 χαρακτήρες"
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Επιβεβαίωση Κωδικού *</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={bizForm.adminPasswordConfirm}
                        onChange={(e) => setBizForm(p => ({ ...p, adminPasswordConfirm: e.target.value }))}
                        placeholder="Επαναλάβετε τον κωδικό"
                        className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Ακύρωση
                  </button>
                  <button
                    onClick={submitCreateBusiness}
                    disabled={bizSaving}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                  >
                    {bizSaving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Δημιουργία
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
