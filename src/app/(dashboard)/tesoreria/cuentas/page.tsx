'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, Edit2, Search } from 'lucide-react';

interface BankAccount {
  id: string; code: string; bankName: string; accountNumber: string;
  accountType: string; currency: string; currentBalance: number; isActive: boolean;
  contactName?: string | null; contactPhone?: string | null;
  contactEmail?: string | null; observations?: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', bankName: '', accountNumber: '', accountType: 'CORRIENTE', currency: 'COP', contactName: '', contactPhone: '', contactEmail: '', observations: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) p.set('search', search);
      const res = await fetch(`/api/tesoreria?${p}`);
      const json = await res.json();
      if (json.success) { setAccounts(json.data.data); setTotal(json.data.total); }
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ code: '', bankName: '', accountNumber: '', accountType: 'CORRIENTE', currency: 'COP', contactName: '', contactPhone: '', contactEmail: '', observations: '' }); setEditId(null); setError(''); };

  const handleEdit = (a: BankAccount) => {
    setEditId(a.id);
    setForm({ code: a.code, bankName: a.bankName, accountNumber: a.accountNumber, accountType: a.accountType, currency: a.currency, contactName: a.contactName || '', contactPhone: a.contactPhone || '', contactEmail: a.contactEmail || '', observations: a.observations || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const url = editId ? `/api/tesoreria/${editId}` : '/api/tesoreria';
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Error'); return; }
      setShowForm(false); resetForm(); load();
    } catch { setError('Error de conexión'); } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Cuentas Bancarias</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Nueva Cuenta
        </button>
      </div>
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '2.5rem' }} />
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : accounts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}><Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} /><p>No se encontraron cuentas</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Código</th><th>Banco</th><th>Número</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Saldo</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acc.</th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.code}</td>
                    <td>{a.bankName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{a.accountNumber}</td>
                    <td><span className="badge">{a.accountType}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Number(a.currentBalance))}</td>
                    <td><span className="badge" style={{ color: a.isActive ? 'var(--success)' : 'var(--danger)' }}>{a.isActive ? 'Activa' : 'Inactiva'}</span></td>
                    <td style={{ textAlign: 'center' }}><button className="btn btn-ghost btn-sm" onClick={() => handleEdit(a)}><Edit2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > 20 && <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Ant</button>
          <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>Pág {page}</span>
          <button className="btn btn-ghost btn-sm" disabled={accounts.length < 20} onClick={() => setPage(page + 1)}>Sig →</button>
        </div>}
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>{editId ? 'Editar' : 'Nueva'} Cuenta Bancaria</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Código *</label><input className="form-input" value={form.code} disabled={!!editId} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
                  <div className="form-group"><label className="form-label">Tipo *</label><select className="form-input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}><option value="CORRIENTE">Corriente</option><option value="AHORROS">Ahorros</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Banco *</label><input className="form-input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Nro. Cuenta *</label><input className="form-input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Moneda</label><input className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
