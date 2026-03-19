'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Settings } from 'lucide-react';

interface ConfigRow {
  id: string;
  key: string;
  value: string;
  type: string;
  module: string;
  description: string | null;
  isEditable: boolean;
}

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parametrizacion/config');
      const json = await res.json();
      if (json.success) setConfigs(json.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await fetch('/api/parametrizacion/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value: editValue }),
      });
      setEditingId(null);
      fetchConfigs();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Group by module
  const grouped = configs.reduce((acc, c) => {
    if (!acc[c.module]) acc[c.module] = [];
    acc[c.module].push(c);
    return acc;
  }, {} as Record<string, ConfigRow[]>);

  const moduleLabels: Record<string, string> = {
    general: 'General',
    credits: 'Créditos',
    portfolio: 'Cartera',
    contributions: 'Aportes',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración del Sistema</h1>
          <p className="page-subtitle">Parámetros globales y reglas de negocio configurables</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="loading-spinner"></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(grouped).map(([module, items]) => (
            <div key={module} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Settings size={18} style={{ color: 'var(--primary-500)' }} />
                  <span className="card-title">{moduleLabels[module] || module}</span>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Parámetro</th>
                      <th>Descripción</th>
                      <th style={{ width: '20%' }}>Valor</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <code style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{c.key}</code>
                        </td>
                        <td className="text-sm text-muted">{c.description}</td>
                        <td>
                          {editingId === c.id ? (
                            <input
                              className="form-input"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-sm">{c.value || '—'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {c.isEditable && (
                            editingId === c.id ? (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSave(c.id)}
                                disabled={saving}
                              >
                                <Save size={13} />
                              </button>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setEditingId(c.id); setEditValue(c.value); }}
                              >
                                Editar
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
