'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowUpDown, Search, Upload, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Tx { id: string; transactionDate: string; reference?: string; description: string; transactionType: string; amount: number; reconciliationStatus: string; isManual: boolean; thirdPartyName?: string; bankAccount: { code: string; bankName: string }; }
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO');
const statusColor: Record<string, string> = { PENDIENTE: 'var(--warning)', CONCILIADO: 'var(--success)', NO_APLICA: 'var(--gray-400)' };

export default function MovimientosPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; code: string; bankName: string }>>([]);
  const [form, setForm] = useState({ bankAccountId: '', transactionDate: new Date().toISOString().split('T')[0], reference: '', description: '', transactionType: 'CREDITO', amount: '', thirdPartyName: '' });
  const [importForm, setImportForm] = useState({ bankAccountId: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (search) p.set('search', search);
      const res = await fetch(`/api/tesoreria/movimientos?${p}`);
      const json = await res.json();
      if (json.success) { setTxs(json.data.data); setTotal(json.data.total); }
    } finally { setLoading(false); }
  }, [page, search]);

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/tesoreria?activeOnly=true');
    const json = await res.json();
    if (json.success) setAccounts(json.data.data.map((a: { id: string; code: string; bankName: string }) => ({ id: a.id, code: a.code, bankName: a.bankName })));
  }, []);

  useEffect(() => { load(); loadAccounts(); }, [load, loadAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/movimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount as string) }) });
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Error'); return; }
      setShowForm(false); load();
    } catch { setError('Error de conexión'); } finally { setSaving(false); }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/movimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...importForm, format: 'csv' }) });
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Error'); return; }
      setShowImport(false); load();
      alert(`Se importaron ${json.data.imported} movimientos`);
    } catch { setError('Error de conexión'); } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Movimientos Bancarios</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Upload size={16} /> Importar CSV</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> Registrar</button>
        </div>
      </div>
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" placeholder="Buscar por descripción, referencia..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '2.5rem' }} />
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : txs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}><ArrowUpDown size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} /><p>No hay movimientos</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Banco</th><th>Descripción</th><th>Ref.</th><th style={{ textAlign: 'center' }}>Tipo</th><th style={{ textAlign: 'right' }}>Monto</th><th>Conciliación</th></tr></thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.transactionDate)}</td>
                    <td>{t.bankAccount.bankName}</td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{t.reference || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {t.transactionType === 'CREDITO' ? <ArrowDownLeft size={16} style={{ color: 'var(--success)' }} /> : <ArrowUpRight size={16} style={{ color: 'var(--danger)' }} />}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.transactionType === 'CREDITO' ? 'var(--success)' : 'var(--danger)' }}>{t.transactionType === 'CREDITO' ? '+' : '-'}{fmt(Number(t.amount))}</td>
                    <td><span className="badge" style={{ color: statusColor[t.reconciliationStatus] }}>{t.reconciliationStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > 30 && <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Ant</button>
          <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>Pág {page}</span>
          <button className="btn btn-ghost btn-sm" disabled={txs.length < 30} onClick={() => setPage(page + 1)}>Sig →</button>
        </div>}
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Registrar Movimiento</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group"><label className="form-label">Cuenta *</label><select className="form-input" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} required><option value="">Seleccione...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({a.code})</option>)}</select></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Fecha *</label><input type="date" className="form-input" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Tipo *</label><select className="form-input" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}><option value="CREDITO">Crédito (Ingreso)</option><option value="DEBITO">Débito (Egreso)</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Monto *</label><input type="number" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Descripción *</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Referencia</label><input className="form-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Importar Movimientos CSV</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}>✕</button></div>
            <form onSubmit={handleImport}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group"><label className="form-label">Cuenta *</label><select className="form-input" value={importForm.bankAccountId} onChange={(e) => setImportForm({ ...importForm, bankAccountId: e.target.value })} required><option value="">Seleccione...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({a.code})</option>)}</select></div>
                <div className="form-group"><label className="form-label">Formato: fecha;referencia;descripcion;tipo;monto;tercero</label><textarea className="form-input" rows={6} placeholder="2026-01-15;REF001;Pago nómina;DEBITO;5000000;Empresa S.A." value={importForm.content} onChange={(e) => setImportForm({ ...importForm, content: e.target.value })} required /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowImport(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Importando...' : 'Importar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
