'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Download,
  Upload,
  Edit2,
  Trash2,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-csv';
import { exportToPDF } from '@/lib/export-pdf';
import ProductModal from '@/components/inventory/ProductModal';
import StockMovementModal from '@/components/inventory/StockMovementModal';

export default function InventoryPage() {
  const t = useTranslations('inventory');

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');

  // Tab state
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // Category editing state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [productsRes, categoriesRes] = await Promise.all([
      fetch('/api/inventory/products'),
      fetch('/api/inventory/categories'),
    ]);
    const [productsData, categoriesData] = await Promise.all([
      productsRes.json(),
      categoriesRes.json(),
    ]);
    setProducts(productsData.products ?? []);
    setCategories(categoriesData.categories ?? []);
    setLoading(false);
  }

  // ── Product helpers ──────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    const stock = getStockStatus(p.currentStock, p.minStock, p.maxStock);
    const matchStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && (stock === 'low' || stock === 'critical')) ||
      (stockFilter === 'ok' && stock === 'normal');
    return matchSearch && matchCategory && matchStock;
  });

  function handleEdit(product: any) {
    setSelectedProduct(product);
    setShowProductModal(true);
  }

  function handleMovement(product: any, type: 'IN' | 'OUT' | 'ADJUSTMENT') {
    setSelectedProduct(product);
    setMovementType(type);
    setShowMovementModal(true);
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Διαγραφή προϊόντος;')) return;
    await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
    loadData();
  }

  function handleExportCSV() {
    exportToCSV(filtered, [
      { header: 'Κωδικός', key: 'sku' },
      { header: 'Όνομα', key: 'name' },
      { header: 'Κατηγορία', key: 'categoryName' },
      { header: 'Απόθεμα', key: 'currentStock' },
      { header: 'Μονάδα', key: 'unit' },
      { header: 'Τιμή Αγοράς', key: 'buyPrice' },
      { header: 'Τιμή Πώλησης', key: 'sellPrice' },
      { header: 'ΦΠΑ %', key: 'vatRate' },
    ], 'inventory');
  }

  function handleExportPDF() {
    exportToPDF({
      title: 'Αναφορά Αποθήκης',
      columns: [
        { header: 'SKU', dataKey: 'sku' },
        { header: 'Προϊόν', dataKey: 'name' },
        { header: 'Απόθεμα', dataKey: 'currentStock' },
        { header: 'Μον.', dataKey: 'unit' },
        { header: 'Τιμή Αγοράς', dataKey: 'buyPriceFmt' },
        { header: 'Τιμή Πώλησης', dataKey: 'sellPriceFmt' },
      ],
      data: filtered.map((p) => ({
        ...p,
        buyPriceFmt: formatCurrency(p.buyPrice),
        sellPriceFmt: formatCurrency(p.sellPrice),
      })),
    });
  }

  const totalValue = filtered.reduce((sum, p) => sum + p.currentStock * p.buyPrice, 0);
  const lowStockCount = filtered.filter(
    (p) => getStockStatus(p.currentStock, p.minStock, p.maxStock) !== 'normal'
  ).length;

  // ── Category helpers ─────────────────────────────────────────────────────

  function productCountForCategory(catId: string) {
    return products.filter((p) => p.categoryId === catId).length;
  }

  function startEditCategory(cat: any) {
    setEditingCategory(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description ?? '');
    setCategoryError('');
  }

  function cancelEditCategory() {
    setEditingCategory(null);
    setEditName('');
    setEditDescription('');
    setCategoryError('');
  }

  async function saveEditCategory(id: string) {
    if (!editName.trim()) { setCategoryError('Το όνομα είναι υποχρεωτικό.'); return; }
    setCategorySaving(true);
    const res = await fetch(`/api/inventory/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || null }),
    });
    setCategorySaving(false);
    if (res.ok) {
      cancelEditCategory();
      loadData();
    } else {
      const data = await res.json();
      setCategoryError(data.error ?? 'Σφάλμα αποθήκευσης.');
    }
  }

  async function handleDeleteCategory(id: string) {
    const count = productCountForCategory(id);
    if (count > 0) {
      alert(`Δεν μπορείτε να διαγράψετε κατηγορία που χρησιμοποιείται από ${count} προϊόν(τα). Αλλάξτε πρώτα την κατηγορία των προϊόντων.`);
      return;
    }
    if (!confirm('Διαγραφή κατηγορίας;')) return;
    const res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? 'Σφάλμα διαγραφής.');
      return;
    }
    loadData();
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) { setCategoryError('Το όνομα είναι υποχρεωτικό.'); return; }
    setCategorySaving(true);
    const res = await fetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || null,
      }),
    });
    setCategorySaving(false);
    if (res.ok) {
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowNewCategoryForm(false);
      setCategoryError('');
      loadData();
    } else {
      const data = await res.json();
      setCategoryError(data.error ?? 'Σφάλμα δημιουργίας.');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">
            {activeTab === 'products' ? (
              <>
                {filtered.length} προϊόντα · Αξία: {formatCurrency(totalValue)}
                {lowStockCount > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {lowStockCount} χαμηλό απόθεμα
                  </span>
                )}
              </>
            ) : (
              <>{categories.length} κατηγορίες</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'products' ? (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:block">CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:block">PDF</span>
              </button>
              <button
                onClick={() => { setSelectedProduct(null); setShowProductModal(true); }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('addProduct')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => { setShowNewCategoryForm(true); setCategoryError(''); }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Νέα Κατηγορία</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Προϊόντα
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {products.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          Κατηγορίες
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {categories.length}
          </span>
        </button>
      </div>

      {/* ── PRODUCTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`${t('productName')} ή SKU...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Όλες οι κατηγορίες</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Όλα τα αποθέματα</option>
              <option value="low">Χαμηλό απόθεμα</option>
              <option value="ok">Κανονικό</option>
            </select>
          </div>

          {/* Products table */}
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
                      <th>SKU</th>
                      <th>Προϊόν</th>
                      <th className="hidden md:table-cell">Κατηγορία</th>
                      <th className="text-right">Απόθεμα</th>
                      <th className="hidden sm:table-cell text-right">Τιμή Αγοράς</th>
                      <th className="hidden sm:table-cell text-right">Τιμή Πώλησης</th>
                      <th>Κατάσταση</th>
                      <th className="text-right">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>Δεν βρέθηκαν προϊόντα</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((product) => {
                        const status = getStockStatus(
                          product.currentStock,
                          product.minStock,
                          product.maxStock
                        );
                        return (
                          <tr key={product.id}>
                            <td className="font-mono text-xs text-primary">{product.sku}</td>
                            <td>
                              <div>
                                <p className="text-sm font-medium text-foreground">{product.name}</p>
                                {product.barcode && (
                                  <p className="text-xs text-muted-foreground">{product.barcode}</p>
                                )}
                              </div>
                            </td>
                            <td className="hidden md:table-cell text-sm text-muted-foreground">
                              {product.category?.name || '—'}
                            </td>
                            <td className="text-right">
                              <span className="text-sm font-medium">
                                {product.currentStock} {product.unit}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell text-right text-sm">
                              {formatCurrency(product.buyPrice)}
                            </td>
                            <td className="hidden sm:table-cell text-right text-sm font-medium">
                              {formatCurrency(product.sellPrice)}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  status === 'critical'
                                    ? 'badge-danger'
                                    : status === 'low'
                                    ? 'badge-warning'
                                    : status === 'high'
                                    ? 'badge-info'
                                    : 'badge-success'
                                }`}
                              >
                                {status === 'critical'
                                  ? 'Κρίσιμο'
                                  : status === 'low'
                                  ? 'Χαμηλό'
                                  : status === 'high'
                                  ? 'Υψηλό'
                                  : 'Κανονικό'}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleMovement(product, 'IN')}
                                  title="Εισαγωγή στοκ"
                                  className="rounded p-1.5 text-green-400 hover:bg-green-400/10 transition-colors"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMovement(product, 'OUT')}
                                  title="Εξαγωγή στοκ"
                                  className="rounded p-1.5 text-orange-400 hover:bg-orange-400/10 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
        </>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">

          {/* Add new category form */}
          {showNewCategoryForm && (
            <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Νέα Κατηγορία</p>
              {categoryError && (
                <p className="text-xs text-red-400">{categoryError}</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Όνομα *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="π.χ. Ηλεκτρολογικά"
                    autoFocus
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Περιγραφή</label>
                  <input
                    type="text"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Προαιρετική περιγραφή..."
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    disabled={categorySaving}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Αποθήκευση
                  </button>
                  <button
                    onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(''); setNewCategoryDescription(''); setCategoryError(''); }}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Ακύρωση
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Tag className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Δεν υπάρχουν κατηγορίες ακόμα</p>
                <button
                  onClick={() => setShowNewCategoryForm(true)}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Προσθέστε την πρώτη κατηγορία
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr className="border-b border-border">
                    <th>Κατηγορία</th>
                    <th className="hidden sm:table-cell">Περιγραφή</th>
                    <th className="text-center">Προϊόντα</th>
                    <th className="text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const count = productCountForCategory(cat.id);
                    const isEditing = editingCategory === cat.id;

                    return (
                      <tr key={cat.id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                              className="w-full rounded-lg border border-primary bg-muted px-3 py-1.5 text-sm text-foreground focus:outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                <Tag className="h-3.5 w-3.5 text-primary" />
                              </span>
                              <span className="text-sm font-medium text-foreground">{cat.name}</span>
                            </div>
                          )}
                        </td>

                        <td className="hidden sm:table-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Περιγραφή..."
                              className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {cat.description || '—'}
                            </span>
                          )}
                        </td>

                        <td className="text-center">
                          <span className={`badge ${count > 0 ? 'badge-info' : 'badge-neutral'}`}>
                            {count} {count === 1 ? 'προϊόν' : 'προϊόντα'}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                {categoryError && editingCategory === cat.id && (
                                  <span className="mr-2 text-xs text-red-400">{categoryError}</span>
                                )}
                                <button
                                  onClick={() => saveEditCategory(cat.id)}
                                  disabled={categorySaving}
                                  title="Αποθήκευση"
                                  className="rounded p-1.5 text-green-400 hover:bg-green-400/10 disabled:opacity-50 transition-colors"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditCategory}
                                  title="Ακύρωση"
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditCategory(cat)}
                                  title="Επεξεργασία"
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  title={count > 0 ? `Χρησιμοποιείται από ${count} προϊόν(τα)` : 'Διαγραφή'}
                                  className={`rounded p-1.5 transition-colors ${
                                    count > 0
                                      ? 'cursor-not-allowed text-muted-foreground/30'
                                      : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Info note */}
          <p className="text-xs text-muted-foreground">
            💡 Κατηγορίες με προϊόντα δεν μπορούν να διαγραφούν. Αλλάξτε πρώτα την κατηγορία των προϊόντων.
          </p>
        </div>
      )}

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          onClose={() => setShowProductModal(false)}
          onSave={() => { setShowProductModal(false); loadData(); }}
        />
      )}

      {showMovementModal && selectedProduct && (
        <StockMovementModal
          product={selectedProduct}
          type={movementType}
          onClose={() => setShowMovementModal(false)}
          onSave={() => { setShowMovementModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
