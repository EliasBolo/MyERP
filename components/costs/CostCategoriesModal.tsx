'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Tag } from 'lucide-react';

interface CostCategory {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CostCategoriesModalProps {
  onClose: () => void;
  onCategoriesChange?: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

export default function CostCategoriesModal({ onClose, onCategoriesChange }: CostCategoriesModalProps) {
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-categories');
      const data = await res.json();
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/cost-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newColor }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Σφάλμα');
        return;
      }
      setNewName('');
      setNewColor('#6b7280');
      setShowAdd(false);
      await loadCategories();
      onCategoriesChange?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cost-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: editColor }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Σφάλμα');
        return;
      }
      setEditingId(null);
      await loadCategories();
      onCategoriesChange?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Διαγραφή κατηγορίας;')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cost-categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Δεν μπορεί να διαγραφεί');
        return;
      }
      await loadCategories();
      onCategoriesChange?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Tag className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Κατηγορίες εξόδων</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <span
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      {editingId === cat.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className="h-5 w-5 rounded-full border-2 border-transparent hover:border-white"
                                style={{ backgroundColor: c }}
                                onClick={() => setEditColor(c)}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => handleUpdate(cat.id)}
                            disabled={saving}
                            className="rounded px-2 py-1 text-xs bg-blue-600 text-white"
                          >
                            Αποθήκευση
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-2 py-1 text-xs text-muted-foreground"
                          >
                            Ακύρωση
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditName(cat.name);
                                setEditColor(cat.color);
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {showAdd ? (
                  <form onSubmit={handleCreate} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Όνομα κατηγορίας"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Χρώμα:</span>
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="h-6 w-6 rounded-full border-2 border-transparent hover:border-white"
                            style={{ backgroundColor: c }}
                            onClick={() => setNewColor(c)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowAdd(false); setNewName(''); }}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
                      >
                        Ακύρωση
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !newName.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Προσθήκη
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Νέα κατηγορία
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
