'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, FileCheck, CheckCircle } from 'lucide-react';

interface Rec { id: string; reconciliationNumber: string; status: string; periodYear: number; periodMonth: number; bankBalance: number; bookBalance: number; difference: number; matchedItems: number; unmatchedItems: number; totalItems: number; bankAccount: { code: string; bankName: string; accountNumber: string }; }
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const months = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const sc: Record<string, string> = { EN_PROCESO: 'var(--warning)', COMPLETADA: 'var(--success)', CANCELADA: 'var(--danger)' };

export default function ConciliacionPage() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; code: string; bankName: string }>>([]);
  const now = new Date();
  const [form, setForm] = useState({ bankAccountId: '', periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, bankBalance: '', bookBalance: '', observations: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tesoreria/conciliacion');
      const json = await res.json();
      if (json.success) setRecs(json.data.data);
    } finally { setLoading(false); }
  }, []);

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/tesoreria?activeOnly=true');
    const json = await res.json();
    if (json.success) setAccounts(json.data.data.map((a: { id: string; code: string; bankName: string }) => ({ id: a.id, code: a.code, bankName: a.bankName })));
  }, []);

  useEffect(() => { load(); loadAccounts(); }, [load, loadAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/conciliacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, bankBalance: parseFloat(form.bankBalance as string), bookBalance: parseFloat(form.bookBalance as string) }) });
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Error'); return; }
      setShowForm(false); load();
    } catch { setError('Error de conexión'); } finally { setSaving(false); }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('¿Completar esta conciliación?')) return;
    const res = await fetch('/api/tesoreria/conciliacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', id }) });
    const json = await res.json();
    if (json.success) load(); else alert(json.error);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Conciliación Bancaria</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> Nueva Conciliación</button>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : recs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}><FileCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} /><p>No hay conciliaciones</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Número</th><th>Banco</th><th>Período</th><th style={{ textAlign: 'right' }}>Saldo Banco</th><th style={{ textAlign: 'right' }}>Saldo Libros</th><th style={{ textAlign: 'right' }}>Diferencia</th><th style={{ textAlign: 'center' }}>Items</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acc.</th></tr></thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.reconciliationNumber}</td>
                    <td>{r.bankAccount.bankName}</td>
                    <td>{months[r.periodMonth]} {r.periodYear}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Number(r.bankBalance))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Number(r.bookBalance))}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: Number(r.difference) === 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(Number(r.difference))}</td>
                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{r.matchedItems}/{r.totalItems}</td>
                    <td><span className="badge" style={{ color: sc[r.status] }}>{r.status.replace('_', ' ')}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {r.status === 'EN_PROCESO' && <button className="btn btn-ghost btn-sm" onClick={() => handleComplete(r.id)} title="Completar"><CheckCircle size={16} style={{ color: 'var(--success)' }} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Nueva Conciliación</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group"><label className="form-label">Cuenta Bancaria *</label><select className="form-input" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} required><option value="">Seleccione...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({a.code})</option>)}</select></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Año *</label><input type="number" className="form-input" value={form.periodYear} onChange={(e) => setForm({ ...form, periodYear: parseInt(e.target.value) })} required /></div>
                  <div className="form-group"><label className="form-label">Mes *</label><select className="form-input" value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: parseInt(e.target.value) })}>{months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Saldo Banco *</label><input type="number" step="0.01" className="form-input" value={form.bankBalance} onChange={(e) => setForm({ ...form, bankBalance: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Saldo Libros *</label><input type="number" step="0.01" className="form-input" value={form.bookBalance} onChange={(e) => setForm({ ...form, bookBalance: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
