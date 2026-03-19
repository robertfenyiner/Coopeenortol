'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ChevronRight, Package } from 'lucide-react';

interface CatalogRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  _count: { items: number };
}

interface CatalogDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  items: { id: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }[];
}

export default function CatalogosPage() {
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New item form
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/parametrizacion/catalogos?${params}`);
      const json = await res.json();
      if (json.success) setCatalogs(json.data.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCatalogs(); }, [fetchCatalogs]);

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    setShowNewItem(false);
    try {
      const res = await fetch(`/api/parametrizacion/catalogos/${id}`);
      const json = await res.json();
      if (json.success) setSelected(json.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parametrizacion/catalogos/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newItemCode, name: newItemName }),
      });
      const json = await res.json();
      if (json.success) {
        setNewItemCode('');
        setNewItemName('');
        setShowNewItem(false);
        loadDetail(selected.id);
        fetchCatalogs();
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogos</h1>
          <p className="page-subtitle">Tablas maestras y listas configurables del sistema</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
        {/* Catalog List */}
        <div className="card">
          <div className="table-toolbar">
            <div className="table-search" style={{ maxWidth: '100%' }}>
              <Search className="table-search-icon" size={16} />
              <input
                className="table-search-input"
                placeholder="Buscar catálogos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : (
            <div style={{ padding: '0 0.75rem 0.75rem' }}>
              {catalogs.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => loadDetail(cat.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    border: selected?.id === cat.id ? '1.5px solid var(--primary-500)' : '1.5px solid transparent',
                    background: selected?.id === cat.id ? 'var(--primary-50)' : 'transparent',
                    marginBottom: '0.25rem',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Package size={16} style={{ color: 'var(--accent-500)' }} />
                      <span className="font-semibold" style={{ fontSize: '0.85rem' }}>{cat.name}</span>
                      {cat.isSystem && <span className="badge badge-neutral">Sistema</span>}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.15rem', marginLeft: '1.5rem' }}>
                      {cat.code} · {cat._count.items} ítems
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {selected ? selected.name : 'Selecciona un catálogo'}
            </span>
            {selected && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewItem(!showNewItem)}>
                <Plus size={14} /> Agregar ítem
              </button>
            )}
          </div>
          <div className="card-body">
            {loadingDetail ? (
              <div className="loading-center"><div className="loading-spinner"></div></div>
            ) : !selected ? (
              <div className="empty-state">
                <div className="empty-state-title">Selecciona un catálogo</div>
                <div className="empty-state-text">Haz clic en un catálogo para ver sus ítems</div>
              </div>
            ) : (
              <>
                {showNewItem && (
                  <form onSubmit={handleAddItem} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Código</label>
                        <input className="form-input" value={newItemCode} onChange={(e) => setNewItemCode(e.target.value)} required placeholder="CODIGO" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nombre</label>
                        <input className="form-input" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required placeholder="Nombre del ítem" />
                      </div>
                      <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                        {saving ? '...' : 'Agregar'}
                      </button>
                    </div>
                  </form>
                )}

                {selected.items.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-text">Este catálogo no tiene ítems aún</div>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="text-muted">{idx + 1}</td>
                          <td><code style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{item.code}</code></td>
                          <td>{item.name}</td>
                          <td>
                            <span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>
                              <span className="badge-dot"></span>
                              {item.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
