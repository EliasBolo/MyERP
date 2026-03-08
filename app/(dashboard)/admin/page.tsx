'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Shield, Plus, Edit2, Trash2, Check, X,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Calendar, Layers, AlertTriangle, CheckCircle, Clock, Ban,
  UserPlus, Eye, EyeOff, CreditCard, RefreshCw, User, Phone,
  Mail, MapPin, Hash, FileText, DollarSign, Save,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Label maps ──────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = { standard: 'Standard', production: 'Production' };
const TIER_COLORS: Record<string, string> = { standard: 'badge-info', production: 'badge-warning' };

const STATUS_LABELS: Record<string, string> = {
  active: 'Ενεργό', inactive: 'Ανενεργό', trial: 'Δοκιμαστικό', expired: 'Ληγμένο',
};
const STATUS_ICONS: Record<string, any> = {
  active: CheckCircle, inactive: Ban, trial: Clock, expired: AlertTriangle,
};
const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400', inactive: 'text-gray-400', trial: 'text-yellow-400', expired: 'text-red-400',
};

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'Εκκρεμεί', active: 'Ενεργή', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε',
};
const PHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'badge-neutral', active: 'badge-success', completed: 'badge-info', cancelled: 'badge-danger',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Μετρητά', bank: 'Τραπεζική', card: 'Κάρτα', other: 'Άλλο',
};
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'text-green-400', pending: 'text-yellow-400', failed: 'text-red-400',
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Εξοφλήθηκε', pending: 'Εκκρεμεί', failed: 'Απέτυχε',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Phase {
  id: string; name: string; description?: string;
  startDate: string; endDate?: string; status: string; order: number;
}
interface LicenseRenewal {
  id: string; renewedAt: string; tierFrom?: string; tierTo: string;
  statusFrom?: string; statusTo: string; amountPaid?: number; currency: string; notes?: string;
}
interface CustomerPayment {
  id: string; amount: number; currency: string; method: string; status: string;
  reference?: string; notes?: string; paidAt: string;
}
interface BusinessUser {
  id: string; name: string; email: string; role: string; isActive: boolean;
  lastLogin?: string; createdAt: string;
}
interface BusinessDetail {
  id: string; name: string; email?: string; vatNumber?: string; phone?: string;
  address?: string; contactPerson?: string; notes?: string;
  isActive: boolean; subscriptionTier: string; subscriptionStatus: string;
  licenseExpiresAt?: string; createdAt: string;
  subscriptionPhases: Phase[];
  licenseRenewals: LicenseRenewal[];
  customerPayments: CustomerPayment[];
  users: BusinessUser[];
  _count: { users: number; invoices: number; clients: number; products: number };
}
interface BusinessSummary {
  id: string; name: string; email?: string; contactPerson?: string;
  isActive: boolean; subscriptionTier: string; subscriptionStatus: string;
  licenseExpiresAt?: string; createdAt: string;
  _count: { users: number; invoices: number; clients: number; products: number };
}

// ── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_BIZ_FORM = {
  businessName: '', businessEmail: '', vatNumber: '', phone: '',
  address: '', contactPerson: '', notes: '',
  subscriptionTier: 'standard', subscriptionStatus: 'active', licenseExpiresAt: '',
  adminName: '', adminEmail: '', adminPassword: '', adminPasswordConfirm: '',
};

const EMPTY_PAYMENT_FORM = {
  amount: '', currency: 'EUR', method: 'bank', status: 'paid',
  reference: '', notes: '', paidAt: new Date().toISOString().split('T')[0],
};

const EMPTY_RENEWAL_FORM = {
  tierTo: 'standard', statusTo: 'active', amountPaid: '', currency: 'EUR',
  notes: '', renewedAt: new Date().toISOString().split('T')[0], applyToSubscription: true,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Expansion & tabs
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [detailData, setDetailData] = useState<Record<string, BusinessDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Create business modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bizForm, setBizForm] = useState({ ...EMPTY_BIZ_FORM });
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{ businessName: string; adminEmail: string } | null>(null);

  // Details edit
  const [editingDetails, setEditingDetails] = useState<string | null>(null);
  const [detailForm, setDetailForm] = useState<any>({});
  const [detailSaving, setDetailSaving] = useState(false);

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ ...EMPTY_PAYMENT_FORM });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Renewal form
  const [showRenewalForm, setShowRenewalForm] = useState<string | null>(null);
  const [renewalForm, setRenewalForm] = useState({ ...EMPTY_RENEWAL_FORM });
  const [renewalSaving, setRenewalSaving] = useState(false);
  const [renewalError, setRenewalError] = useState('');

  // Phase form (existing)
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

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(id);
    const res = await fetch(`/api/admin/businesses/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetailData(prev => ({ ...prev, [id]: data.business }));
    }
    setDetailLoading(null);
  }, []);

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!activeTab[id]) setActiveTab(prev => ({ ...prev, [id]: 'details' }));
      loadDetail(id);
    }
  }

  function setTab(id: string, tab: string) {
    setActiveTab(prev => ({ ...prev, [id]: tab }));
  }

  // ── Quick toggle ────────────────────────────────────────────────────────────
  async function toggleLicense(b: BusinessSummary) {
    const newStatus = b.subscriptionStatus === 'active' ? 'inactive' : 'active';
    await fetch(`/api/admin/businesses/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionStatus: newStatus }),
    });
    loadBusinesses();
    if (detailData[b.id]) loadDetail(b.id);
  }

  // ── Create business ─────────────────────────────────────────────────────────
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
        businessName: bizForm.businessName, businessEmail: bizForm.businessEmail,
        vatNumber: bizForm.vatNumber, phone: bizForm.phone,
        address: bizForm.address, contactPerson: bizForm.contactPerson, notes: bizForm.notes,
        subscriptionTier: bizForm.subscriptionTier, subscriptionStatus: bizForm.subscriptionStatus,
        licenseExpiresAt: bizForm.licenseExpiresAt || null,
        adminName: bizForm.adminName, adminEmail: bizForm.adminEmail, adminPassword: bizForm.adminPassword,
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

  // ── Edit details ────────────────────────────────────────────────────────────
  function startEditDetails(b: BusinessDetail) {
    setEditingDetails(b.id);
    setDetailForm({
      name: b.name, email: b.email ?? '', vatNumber: b.vatNumber ?? '',
      phone: b.phone ?? '', address: b.address ?? '',
      contactPerson: b.contactPerson ?? '', notes: b.notes ?? '',
      subscriptionTier: b.subscriptionTier, subscriptionStatus: b.subscriptionStatus,
      licenseExpiresAt: b.licenseExpiresAt ? b.licenseExpiresAt.split('T')[0] : '',
      isActive: b.isActive,
    });
  }

  async function saveDetails(id: string) {
    setDetailSaving(true);
    const res = await fetch(`/api/admin/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...detailForm, licenseExpiresAt: detailForm.licenseExpiresAt || null }),
    });
    setDetailSaving(false);
    if (res.ok) {
      setEditingDetails(null);
      loadBusinesses();
      loadDetail(id);
    }
  }

  // ── Payments ────────────────────────────────────────────────────────────────
  async function submitPayment(businessId: string) {
    setPaymentError('');
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentError('Εισάγετε έγκυρο ποσό'); return;
    }
    setPaymentSaving(true);
    const res = await fetch(`/api/admin/businesses/${businessId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...paymentForm, amount: Number(paymentForm.amount) }),
    });
    setPaymentSaving(false);
    if (res.ok) {
      setShowPaymentForm(null);
      setPaymentForm({ ...EMPTY_PAYMENT_FORM });
      loadDetail(businessId);
    } else {
      const d = await res.json();
      setPaymentError(d.error ?? 'Σφάλμα');
    }
  }

  async function deletePayment(businessId: string, paymentId: string) {
    if (!confirm('Διαγραφή πληρωμής;')) return;
    await fetch(`/api/admin/businesses/${businessId}/payments/${paymentId}`, { method: 'DELETE' });
    loadDetail(businessId);
  }

  // ── Renewals ────────────────────────────────────────────────────────────────
  async function submitRenewal(businessId: string) {
    setRenewalError('');
    const b = detailData[businessId];
    setRenewalSaving(true);
    const res = await fetch(`/api/admin/businesses/${businessId}/renewals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...renewalForm,
        tierFrom: b?.subscriptionTier,
        statusFrom: b?.subscriptionStatus,
        amountPaid: renewalForm.amountPaid ? Number(renewalForm.amountPaid) : null,
      }),
    });
    setRenewalSaving(false);
    if (res.ok) {
      setShowRenewalForm(null);
      setRenewalForm({ ...EMPTY_RENEWAL_FORM });
      loadBusinesses();
      loadDetail(businessId);
    } else {
      const d = await res.json();
      setRenewalError(d.error ?? 'Σφάλμα');
    }
  }

  async function deleteRenewal(businessId: string, renewalId: string) {
    if (!confirm('Διαγραφή ανανέωσης;')) return;
    await fetch(`/api/admin/businesses/${businessId}/renewals/${renewalId}`, { method: 'DELETE' });
    loadDetail(businessId);
  }

  // ── Phases ──────────────────────────────────────────────────────────────────
  async function addPhase(businessId: string) {
    if (!phaseForm.name || !phaseForm.startDate) { setPhaseError('Απαιτούνται Όνομα και Ημ. Έναρξης'); return; }
    setPhaseSaving(true); setPhaseError('');
    const res = await fetch(`/api/admin/businesses/${businessId}/phases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...phaseForm, endDate: phaseForm.endDate || null }),
    });
    setPhaseSaving(false);
    if (res.ok) {
      setShowPhaseForm(null);
      setPhaseForm({ name: '', description: '', startDate: '', endDate: '', status: 'pending' });
      loadDetail(businessId);
    } else { const d = await res.json(); setPhaseError(d.error ?? 'Σφάλμα'); }
  }

  async function savePhase(businessId: string, phaseId: string) {
    setPhaseSaving(true);
    const res = await fetch(`/api/admin/businesses/${businessId}/phases/${phaseId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...phaseEditForm, endDate: phaseEditForm.endDate || null }),
    });
    setPhaseSaving(false);
    if (res.ok) { setEditingPhase(null); loadDetail(businessId); }
  }

  async function deletePhase(businessId: string, phaseId: string) {
    if (!confirm('Διαγραφή φάσης;')) return;
    await fetch(`/api/admin/businesses/${businessId}/phases/${phaseId}`, { method: 'DELETE' });
    loadDetail(businessId);
  }

  // ── Input helpers ────────────────────────────────────────────────────────────
  const inputCls = 'w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none';
  const selectCls = 'w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';
  const labelCls = 'block text-xs text-muted-foreground mb-1';

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
          <p className="page-subtitle">{businesses.length} επιχειρήσεις · Διαχείριση πελατών & συνδρομών</p>
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
            const StatusIcon = STATUS_ICONS[b.subscriptionStatus] ?? CheckCircle;
            const isActive = b.subscriptionStatus === 'active';
            const tab = activeTab[b.id] ?? 'details';
            const detail = detailData[b.id];
            const isLoadingDetail = detailLoading === b.id;

            return (
              <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Business card row */}
                <div className="flex items-center gap-3 px-5 py-4">
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
                      {b.contactPerson && <span className="flex items-center gap-1"><User className="h-3 w-3" />{b.contactPerson}</span>}
                      {b.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.email}</span>}
                      <span>{b._count.users} χρήστες</span>
                      <span>{b._count.invoices} τιμολόγια</span>
                    </div>
                  </div>

                  {/* Quick license toggle */}
                  <button
                    onClick={() => toggleLicense(b)}
                    title={isActive ? 'Απενεργοποίηση άδειας' : 'Ενεργοποίηση άδειας'}
                    className={`flex-shrink-0 transition-colors ${isActive ? 'text-green-400 hover:text-red-400' : 'text-gray-500 hover:text-green-400'}`}
                  >
                    {isActive ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>

                  {/* Expand button */}
                  <button
                    onClick={() => toggleExpand(b.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Tab bar */}
                    <div className="flex border-b border-border bg-muted/20 px-5 overflow-x-auto">
                      {[
                        { key: 'details', label: 'Στοιχεία', icon: Building2 },
                        { key: 'payments', label: 'Πληρωμές', icon: CreditCard },
                        { key: 'renewals', label: 'Ανανεώσεις', icon: RefreshCw },
                        { key: 'phases', label: 'Φάσεις', icon: Layers },
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setTab(b.id, key)}
                          className={cn(
                            'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                            tab === key
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                          {key === 'payments' && detail?.customerPayments?.length
                            ? <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{detail.customerPayments.length}</span>
                            : null}
                          {key === 'renewals' && detail?.licenseRenewals?.length
                            ? <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{detail.licenseRenewals.length}</span>
                            : null}
                          {key === 'phases' && detail?.subscriptionPhases?.length
                            ? <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{detail.subscriptionPhases.length}</span>
                            : null}
                        </button>
                      ))}
                    </div>

                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                      </div>
                    ) : (
                      <div className="px-5 py-4">

                        {/* ── TAB: Στοιχεία ─────────────────────────────── */}
                        {tab === 'details' && detail && (
                          <div className="space-y-5">
                            {editingDetails === b.id ? (
                              <>
                                {/* Edit form */}
                                <div className="space-y-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Στοιχεία Επιχείρησης</p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                      <label className={labelCls}>Επωνυμία *</label>
                                      <input type="text" className={inputCls} value={detailForm.name}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Email</label>
                                      <input type="email" className={inputCls} value={detailForm.email}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, email: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>ΑΦΜ</label>
                                      <input type="text" className={inputCls} value={detailForm.vatNumber}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, vatNumber: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Τηλέφωνο</label>
                                      <input type="text" className={inputCls} value={detailForm.phone}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, phone: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Υπεύθυνος Επικοινωνίας</label>
                                      <input type="text" className={inputCls} value={detailForm.contactPerson}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, contactPerson: e.target.value }))} />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className={labelCls}>Διεύθυνση</label>
                                      <input type="text" className={inputCls} value={detailForm.address}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, address: e.target.value }))} />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className={labelCls}>Σημειώσεις (εσωτερικές)</label>
                                      <textarea rows={2} className={inputCls + ' resize-none'} value={detailForm.notes}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, notes: e.target.value }))} />
                                    </div>
                                  </div>

                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pt-2">Συνδρομή</p>
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div>
                                      <label className={labelCls}>Tier</label>
                                      <select className={selectCls} value={detailForm.subscriptionTier}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, subscriptionTier: e.target.value }))}>
                                        <option value="standard">Standard</option>
                                        <option value="production">Production</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Κατάσταση</label>
                                      <select className={selectCls} value={detailForm.subscriptionStatus}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, subscriptionStatus: e.target.value }))}>
                                        <option value="active">Ενεργό</option>
                                        <option value="trial">Δοκιμαστικό</option>
                                        <option value="inactive">Ανενεργό</option>
                                        <option value="expired">Ληγμένο</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Λήξη Άδειας</label>
                                      <input type="date" className={inputCls} value={detailForm.licenseExpiresAt}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, licenseExpiresAt: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Κατάσταση</label>
                                      <select className={selectCls} value={detailForm.isActive ? 'true' : 'false'}
                                        onChange={e => setDetailForm((p: any) => ({ ...p, isActive: e.target.value === 'true' }))}>
                                        <option value="true">Ενεργή</option>
                                        <option value="false">Ανενεργή</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveDetails(b.id)} disabled={detailSaving}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                                    <Save className="h-4 w-4" /> Αποθήκευση
                                  </button>
                                  <button onClick={() => setEditingDetails(null)}
                                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                                    Ακύρωση
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Read view */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  {[
                                    { icon: Building2, label: 'Επωνυμία', value: detail.name },
                                    { icon: Mail, label: 'Email', value: detail.email },
                                    { icon: User, label: 'Υπεύθυνος', value: detail.contactPerson },
                                    { icon: Phone, label: 'Τηλέφωνο', value: detail.phone },
                                    { icon: Hash, label: 'ΑΦΜ', value: detail.vatNumber },
                                    { icon: MapPin, label: 'Διεύθυνση', value: detail.address },
                                  ].map(({ icon: Icon, label, value }) => value ? (
                                    <div key={label} className="flex items-start gap-2.5">
                                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <p className="text-sm text-foreground">{value}</p>
                                      </div>
                                    </div>
                                  ) : null)}
                                  {detail.notes && (
                                    <div className="sm:col-span-2 flex items-start gap-2.5">
                                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Σημειώσεις</p>
                                        <p className="text-sm text-foreground whitespace-pre-line">{detail.notes}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Subscription summary */}
                                <div className="rounded-xl border border-border bg-muted/20 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Συνδρομή</p>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Tier</p>
                                      <span className={`badge mt-1 ${TIER_COLORS[detail.subscriptionTier] ?? 'badge-neutral'}`}>
                                        {TIER_LABELS[detail.subscriptionTier] ?? detail.subscriptionTier}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Κατάσταση</p>
                                      <p className={`text-sm font-medium mt-1 ${STATUS_COLORS[detail.subscriptionStatus]}`}>
                                        {STATUS_LABELS[detail.subscriptionStatus]}
                                      </p>
                                    </div>
                                    {detail.licenseExpiresAt && (
                                      <div>
                                        <p className="text-xs text-muted-foreground">Λήξη Άδειας</p>
                                        <p className="text-sm text-foreground mt-1">{formatDate(detail.licenseExpiresAt)}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-muted-foreground">Εγγραφή</p>
                                      <p className="text-sm text-foreground mt-1">{formatDate(detail.createdAt)}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Users */}
                                {detail.users.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Χρήστες</p>
                                    <div className="space-y-1.5">
                                      {detail.users.map(u => (
                                        <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                                            <User className="h-3.5 w-3.5 text-primary" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                          </div>
                                          <div className="flex-shrink-0 text-right">
                                            <span className={`badge text-xs ${u.role === 'business_admin' ? 'badge-warning' : 'badge-neutral'}`}>
                                              {u.role === 'business_admin' ? 'Admin' : 'User'}
                                            </span>
                                            {u.lastLogin && <p className="text-xs text-muted-foreground mt-0.5">Τελ. σύνδ. {formatDate(u.lastLogin)}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end">
                                  <button onClick={() => startEditDetails(detail)}
                                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                    <Edit2 className="h-3.5 w-3.5" /> Επεξεργασία
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* ── TAB: Πληρωμές ─────────────────────────────── */}
                        {tab === 'payments' && detail && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">Ιστορικό Πληρωμών</p>
                                {detail.customerPayments.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Σύνολο:{' '}
                                    <span className="font-medium text-green-400">
                                      €{detail.customerPayments
                                        .filter(p => p.status === 'paid')
                                        .reduce((s, p) => s + p.amount, 0)
                                        .toFixed(2)}
                                    </span>
                                    {' '}εξοφλημένο
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => { setShowPaymentForm(b.id); setPaymentError(''); setPaymentForm({ ...EMPTY_PAYMENT_FORM }); }}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" /> Νέα Πληρωμή
                              </button>
                            </div>

                            {/* Add payment form */}
                            {showPaymentForm === b.id && (
                              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                                {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className={labelCls}>Ποσό (€) *</label>
                                    <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00"
                                      value={paymentForm.amount}
                                      onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Μέθοδος</label>
                                    <select className={selectCls} value={paymentForm.method}
                                      onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}>
                                      <option value="bank">Τραπεζική</option>
                                      <option value="cash">Μετρητά</option>
                                      <option value="card">Κάρτα</option>
                                      <option value="other">Άλλο</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelCls}>Κατάσταση</label>
                                    <select className={selectCls} value={paymentForm.status}
                                      onChange={e => setPaymentForm(p => ({ ...p, status: e.target.value }))}>
                                      <option value="paid">Εξοφλήθηκε</option>
                                      <option value="pending">Εκκρεμεί</option>
                                      <option value="failed">Απέτυχε</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelCls}>Ημερομηνία</label>
                                    <input type="date" className={inputCls} value={paymentForm.paidAt}
                                      onChange={e => setPaymentForm(p => ({ ...p, paidAt: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Αριθμός Αναφοράς</label>
                                    <input type="text" className={inputCls} placeholder="INV-001"
                                      value={paymentForm.reference}
                                      onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Σημειώσεις</label>
                                    <input type="text" className={inputCls} placeholder="Προαιρετικά..."
                                      value={paymentForm.notes}
                                      onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => submitPayment(b.id)} disabled={paymentSaving}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                                    <Check className="h-3.5 w-3.5" /> Αποθήκευση
                                  </button>
                                  <button onClick={() => setShowPaymentForm(null)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                    Ακύρωση
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Payments list */}
                            {detail.customerPayments.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic py-4 text-center">Δεν υπάρχουν πληρωμές ακόμα.</p>
                            ) : (
                              <div className="space-y-2">
                                {detail.customerPayments.map(p => (
                                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                      <DollarSign className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">€{p.amount.toFixed(2)}</span>
                                        <span className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? 'text-muted-foreground'}`}>
                                          {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                                        <span><Calendar className="h-3 w-3 inline mr-0.5" />{formatDate(p.paidAt)}</span>
                                        {p.reference && <span>Αναφ: {p.reference}</span>}
                                        {p.notes && <span>{p.notes}</span>}
                                      </div>
                                    </div>
                                    <button onClick={() => deletePayment(b.id, p.id)}
                                      className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── TAB: Ανανεώσεις ────────────────────────────── */}
                        {tab === 'renewals' && detail && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">Ιστορικό Ανανεώσεων</p>
                              <button
                                onClick={() => {
                                  setShowRenewalForm(b.id); setRenewalError('');
                                  setRenewalForm({
                                    ...EMPTY_RENEWAL_FORM,
                                    tierTo: detail.subscriptionTier,
                                    statusTo: detail.subscriptionStatus,
                                  });
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" /> Νέα Ανανέωση
                              </button>
                            </div>

                            {/* Add renewal form */}
                            {showRenewalForm === b.id && (
                              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                                {renewalError && <p className="text-xs text-red-400">{renewalError}</p>}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className={labelCls}>Νέο Tier *</label>
                                    <select className={selectCls} value={renewalForm.tierTo}
                                      onChange={e => setRenewalForm(p => ({ ...p, tierTo: e.target.value }))}>
                                      <option value="standard">Standard</option>
                                      <option value="production">Production</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelCls}>Νέα Κατάσταση *</label>
                                    <select className={selectCls} value={renewalForm.statusTo}
                                      onChange={e => setRenewalForm(p => ({ ...p, statusTo: e.target.value }))}>
                                      <option value="active">Ενεργό</option>
                                      <option value="trial">Δοκιμαστικό</option>
                                      <option value="inactive">Ανενεργό</option>
                                      <option value="expired">Ληγμένο</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelCls}>Ημερομηνία</label>
                                    <input type="date" className={inputCls} value={renewalForm.renewedAt}
                                      onChange={e => setRenewalForm(p => ({ ...p, renewedAt: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Ποσό Πληρωμής (€)</label>
                                    <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00"
                                      value={renewalForm.amountPaid}
                                      onChange={e => setRenewalForm(p => ({ ...p, amountPaid: e.target.value }))} />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className={labelCls}>Σημειώσεις</label>
                                    <input type="text" className={inputCls} placeholder="Ετήσια ανανέωση, upgrade, κ.λπ."
                                      value={renewalForm.notes}
                                      onChange={e => setRenewalForm(p => ({ ...p, notes: e.target.value }))} />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                  <input type="checkbox" checked={renewalForm.applyToSubscription}
                                    onChange={e => setRenewalForm(p => ({ ...p, applyToSubscription: e.target.checked }))}
                                    className="rounded border-border" />
                                  Εφαρμογή tier & κατάστασης στη συνδρομή αμέσως
                                </label>
                                <div className="flex gap-2">
                                  <button onClick={() => submitRenewal(b.id)} disabled={renewalSaving}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                                    <Check className="h-3.5 w-3.5" /> Αποθήκευση
                                  </button>
                                  <button onClick={() => setShowRenewalForm(null)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                    Ακύρωση
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Renewals list */}
                            {detail.licenseRenewals.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic py-4 text-center">Δεν υπάρχουν ανανεώσεις ακόμα.</p>
                            ) : (
                              <div className="space-y-2">
                                {detail.licenseRenewals.map(r => (
                                  <div key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                                      <RefreshCw className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {r.tierFrom && r.tierFrom !== r.tierTo ? (
                                          <span className="text-xs text-muted-foreground">
                                            <span className={`badge ${TIER_COLORS[r.tierFrom] ?? 'badge-neutral'} mr-1`}>{TIER_LABELS[r.tierFrom]}</span>
                                            →
                                            <span className={`badge ${TIER_COLORS[r.tierTo] ?? 'badge-neutral'} ml-1`}>{TIER_LABELS[r.tierTo]}</span>
                                          </span>
                                        ) : (
                                          <span className={`badge ${TIER_COLORS[r.tierTo] ?? 'badge-neutral'}`}>{TIER_LABELS[r.tierTo]}</span>
                                        )}
                                        <span className={`text-xs font-medium ${STATUS_COLORS[r.statusTo] ?? 'text-muted-foreground'}`}>
                                          {STATUS_LABELS[r.statusTo]}
                                        </span>
                                        {r.amountPaid != null && (
                                          <span className="text-xs font-medium text-green-400">€{r.amountPaid.toFixed(2)}</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                                        <span><Calendar className="h-3 w-3 inline mr-0.5" />{formatDate(r.renewedAt)}</span>
                                        {r.notes && <span>{r.notes}</span>}
                                      </div>
                                    </div>
                                    <button onClick={() => deleteRenewal(b.id, r.id)}
                                      className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── TAB: Φάσεις ───────────────────────────────── */}
                        {tab === 'phases' && detail && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">Φάσεις Συνδρομής</span>
                                {detail.subscriptionTier !== 'production' && (
                                  <span className="text-xs text-yellow-400">⚠ Απαιτείται Production tier</span>
                                )}
                              </div>
                              {detail.subscriptionTier === 'production' && (
                                <button
                                  onClick={() => { setShowPhaseForm(b.id); setPhaseError(''); setPhaseForm({ name: '', description: '', startDate: '', endDate: '', status: 'pending' }); }}
                                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Νέα Φάση
                                </button>
                              )}
                            </div>

                            {showPhaseForm === b.id && (
                              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                                {phaseError && <p className="text-xs text-red-400">{phaseError}</p>}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="sm:col-span-2">
                                    <label className={labelCls}>Όνομα Φάσης *</label>
                                    <input type="text" className={inputCls} value={phaseForm.name}
                                      onChange={e => setPhaseForm(p => ({ ...p, name: e.target.value }))}
                                      placeholder="π.χ. Φάση 1 – Onboarding" />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className={labelCls}>Περιγραφή</label>
                                    <input type="text" className={inputCls} value={phaseForm.description}
                                      onChange={e => setPhaseForm(p => ({ ...p, description: e.target.value }))}
                                      placeholder="Προαιρετική περιγραφή..." />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Ημ. Έναρξης *</label>
                                    <input type="date" className={inputCls} value={phaseForm.startDate}
                                      onChange={e => setPhaseForm(p => ({ ...p, startDate: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Ημ. Λήξης</label>
                                    <input type="date" className={inputCls} value={phaseForm.endDate}
                                      onChange={e => setPhaseForm(p => ({ ...p, endDate: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Κατάσταση</label>
                                    <select className={selectCls} value={phaseForm.status}
                                      onChange={e => setPhaseForm(p => ({ ...p, status: e.target.value }))}>
                                      <option value="pending">Εκκρεμεί</option>
                                      <option value="active">Ενεργή</option>
                                      <option value="completed">Ολοκληρώθηκε</option>
                                      <option value="cancelled">Ακυρώθηκε</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => addPhase(b.id)} disabled={phaseSaving}
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                                    <Check className="h-3.5 w-3.5" /> Αποθήκευση
                                  </button>
                                  <button onClick={() => setShowPhaseForm(null)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                    Ακύρωση
                                  </button>
                                </div>
                              </div>
                            )}

                            {detail.subscriptionPhases.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic py-4 text-center">
                                {detail.subscriptionTier === 'production'
                                  ? 'Δεν έχουν οριστεί φάσεις ακόμα.'
                                  : 'Αλλάξτε σε Production tier για να διαχειριστείτε φάσεις.'}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {detail.subscriptionPhases.map((phase, idx) => (
                                  <div key={phase.id} className="rounded-lg border border-border bg-card px-4 py-3">
                                    {editingPhase === phase.id ? (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div>
                                            <label className={labelCls}>Όνομα</label>
                                            <input type="text" className={inputCls} value={phaseEditForm.name ?? ''}
                                              onChange={e => setPhaseEditForm((p: any) => ({ ...p, name: e.target.value }))} />
                                          </div>
                                          <div>
                                            <label className={labelCls}>Κατάσταση</label>
                                            <select className={selectCls} value={phaseEditForm.status ?? 'pending'}
                                              onChange={e => setPhaseEditForm((p: any) => ({ ...p, status: e.target.value }))}>
                                              <option value="pending">Εκκρεμεί</option>
                                              <option value="active">Ενεργή</option>
                                              <option value="completed">Ολοκληρώθηκε</option>
                                              <option value="cancelled">Ακυρώθηκε</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className={labelCls}>Έναρξη</label>
                                            <input type="date" className={inputCls} value={phaseEditForm.startDate?.split('T')[0] ?? ''}
                                              onChange={e => setPhaseEditForm((p: any) => ({ ...p, startDate: e.target.value }))} />
                                          </div>
                                          <div>
                                            <label className={labelCls}>Λήξη</label>
                                            <input type="date" className={inputCls} value={phaseEditForm.endDate?.split('T')[0] ?? ''}
                                              onChange={e => setPhaseEditForm((p: any) => ({ ...p, endDate: e.target.value }))} />
                                          </div>
                                          <div className="sm:col-span-2">
                                            <label className={labelCls}>Περιγραφή</label>
                                            <input type="text" className={inputCls} value={phaseEditForm.description ?? ''}
                                              onChange={e => setPhaseEditForm((p: any) => ({ ...p, description: e.target.value }))} />
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
                                            {phase.description && <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>}
                                            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(phase.startDate)}{phase.endDate && ` → ${formatDate(phase.endDate)}`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`badge ${PHASE_STATUS_COLORS[phase.status] ?? 'badge-neutral'} text-xs`}>
                                            {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
                                          </span>
                                          <button onClick={() => { setEditingPhase(phase.id); setPhaseEditForm({ ...phase }); }}
                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button onClick={() => deletePhase(b.id, phase.id)}
                                            className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Business Modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
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
              <button onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

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
                    Η επιχείρηση <span className="font-medium text-foreground">{createSuccess.businessName}</span> και ο
                    διαχειριστής <span className="font-medium text-foreground">{createSuccess.adminEmail}</span> δημιουργήθηκαν επιτυχώς.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={() => { setBizForm({ ...EMPTY_BIZ_FORM }); setBizError(''); setCreateSuccess(null); }}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                    Νέα Επιχείρηση
                  </button>
                  <button onClick={() => setShowCreateModal(false)}
                    className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors">
                    Κλείσιμο
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[75vh]">
                <div className="px-6 py-5 space-y-5">
                  {bizError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {bizError}
                    </div>
                  )}

                  {/* Business info section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" /> Στοιχεία Επιχείρησης
                    </p>
                    <div>
                      <label className={labelCls}>Επωνυμία *</label>
                      <input type="text" className={inputCls} placeholder="π.χ. Εταιρεία ΑΕ"
                        value={bizForm.businessName} onChange={e => setBizForm(p => ({ ...p, businessName: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Email Επιχείρησης</label>
                        <input type="email" className={inputCls} placeholder="info@company.gr"
                          value={bizForm.businessEmail} onChange={e => setBizForm(p => ({ ...p, businessEmail: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Υπεύθυνος Επικοινωνίας</label>
                        <input type="text" className={inputCls} placeholder="Γιάννης Π."
                          value={bizForm.contactPerson} onChange={e => setBizForm(p => ({ ...p, contactPerson: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>ΑΦΜ</label>
                        <input type="text" className={inputCls} placeholder="123456789"
                          value={bizForm.vatNumber} onChange={e => setBizForm(p => ({ ...p, vatNumber: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Τηλέφωνο</label>
                        <input type="text" className={inputCls} placeholder="210 0000000"
                          value={bizForm.phone} onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Διεύθυνση</label>
                        <input type="text" className={inputCls} placeholder="Αθήνα, Αττική"
                          value={bizForm.address} onChange={e => setBizForm(p => ({ ...p, address: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Σημειώσεις (εσωτερικές)</label>
                        <textarea rows={2} className={inputCls + ' resize-none'} placeholder="Εσωτερικές σημειώσεις για αυτόν τον πελάτη..."
                          value={bizForm.notes} onChange={e => setBizForm(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Tier Συνδρομής</label>
                        <select className={selectCls} value={bizForm.subscriptionTier}
                          onChange={e => setBizForm(p => ({ ...p, subscriptionTier: e.target.value }))}>
                          <option value="standard">Standard</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Κατάσταση</label>
                        <select className={selectCls} value={bizForm.subscriptionStatus}
                          onChange={e => setBizForm(p => ({ ...p, subscriptionStatus: e.target.value }))}>
                          <option value="active">Ενεργό</option>
                          <option value="trial">Δοκιμαστικό</option>
                          <option value="inactive">Ανενεργό</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Λήξη Άδειας (προαιρετικό)</label>
                        <input type="date" className={inputCls} value={bizForm.licenseExpiresAt}
                          onChange={e => setBizForm(p => ({ ...p, licenseExpiresAt: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Admin credentials section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5" /> Στοιχεία Διαχειριστή (Business Admin)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Όνομα *</label>
                        <input type="text" className={inputCls} placeholder="Γιάννης Παπαδόπουλος"
                          value={bizForm.adminName} onChange={e => setBizForm(p => ({ ...p, adminName: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input type="email" className={inputCls} placeholder="admin@company.gr"
                          value={bizForm.adminEmail} onChange={e => setBizForm(p => ({ ...p, adminEmail: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Κωδικός *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} className={inputCls + ' pr-10'}
                          placeholder="Τουλάχιστον 8 χαρακτήρες"
                          value={bizForm.adminPassword} onChange={e => setBizForm(p => ({ ...p, adminPassword: e.target.value }))} />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Επιβεβαίωση Κωδικού *</label>
                      <input type={showPassword ? 'text' : 'password'} className={inputCls}
                        placeholder="Επαναλάβετε τον κωδικό"
                        value={bizForm.adminPasswordConfirm} onChange={e => setBizForm(p => ({ ...p, adminPasswordConfirm: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
                  <button onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                    Ακύρωση
                  </button>
                  <button onClick={submitCreateBusiness} disabled={bizSaving}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors">
                    {bizSaving
                      ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <Plus className="h-4 w-4" />}
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
