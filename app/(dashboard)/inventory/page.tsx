'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Download,
  Upload,
  Edit2,
  Trash2,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-csv';
import { exportToPDF } from '@/lib/export-pdf';
import ProductModal from '@/components/inventory/ProductModal';
import StockMovementModal from '@/components/inventory/StockMovementModal';

export default function InventoryPage() {
  const t = useTranslations('inventory');
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
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

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

  async function handleDelete(id: string) {
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

  const totalValue = filtered.reduce(
    (sum, p) => sum + p.currentStock * p.buyPrice,
    0
  );
  const lowStockCount = filtered.filter(
    (p) => getStockStatus(p.currentStock, p.minStock, p.maxStock) !== 'normal'
  ).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">
            {filtered.length} προϊόντα · Αξία: {formatCurrency(totalValue)}
            {lowStockCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {lowStockCount} χαμηλό απόθεμα
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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
                              onClick={() => handleDelete(product.id)}
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
