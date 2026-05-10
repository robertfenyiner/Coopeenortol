'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Vault, DoorOpen, DoorClosed, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface CashReg { id: string; code: string; name: string; location?: string; status: string; currentBalance: number; openingBalance: number; isActive: boolean; openedAt?: string; movements?: Mov[]; }
interface Mov { id: string; movementNumber: string; movementType: string; concept: string; amount: number; previousBalance: number; newBalance: number; performedAt: string; }
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtDt = (d: string) => new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const typeIcon: Record<string, { icon: typeof ArrowDownLeft; color: string }> = { INGRESO: { icon: ArrowDownLeft, color: 'var(--success)' }, EGRESO: { icon: ArrowUpRight, color: 'var(--danger)' }, APERTURA: { icon: DoorOpen, color: 'var(--info)' }, CIERRE: { icon: DoorClosed, color: 'var(--gray-400)' } };

export default function CajasPage() {
  const [regs, setRegs] = useState<CashReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CashReg | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showOpen, setShowOpen] = useState<string | null>(null);
  const [showMov, setShowMov] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ code: '', name: '', location: '' });
  const [openForm, setOpenForm] = useState({ openingBalance: '' });
  const [movForm, setMovForm] = useState({ movementType: 'INGRESO', concept: '', amount: '', reference: '', thirdPartyName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tesoreria/cajas');
      const json = await res.json();
      if (json.success) setRegs(json.data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: string) => {
    const res = await fetch(`/api/tesoreria/cajas?id=${id}`);
    const json = await res.json();
    if (json.success) setSelected(json.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm) });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      setShowCreate(false); setCreateForm({ code: '', name: '', location: '' }); load();
    } catch { setError('Error'); } finally { setSaving(false); }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showOpen) return; setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', id: showOpen, openingBalance: parseFloat(openForm.openingBalance) }) });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      setShowOpen(null); load();
    } catch { setError('Error'); } finally { setSaving(false); }
  };

  const handleClose = async (id: string) => {
    if (!confirm('¿Cerrar esta caja?')) return;
    const res = await fetch('/api/tesoreria/cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', id }) });
    const json = await res.json();
    if (json.success) load(); else alert(json.error);
  };

  const handleMov = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showMov) return; setSaving(true); setError('');
    try {
      const res = await fetch('/api/tesoreria/cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cashRegisterId: showMov, ...movForm, amount: parseFloat(movForm.amount) }) });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      setShowMov(null); setMovForm({ movementType: 'INGRESO', concept: '', amount: '', reference: '', thirdPartyName: '' }); load();
    } catch { setError('Error'); } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Cajas</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> Nueva Caja</button>
      </div>

      {/* Cash Register Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {loading ? <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> :
          regs.length === 0 ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Vault size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} /><p>No hay cajas registradas</p></div> :
          regs.map((r) => (
            <div key={r.id} className="card" style={{ cursor: 'pointer' }} onClick={() => loadDetail(r.id)}>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{r.code}{r.location ? ` • ${r.location}` : ''}</div>
                  </div>
                  <span className="badge" style={{ color: r.status === 'ABIERTA' ? 'var(--success)' : 'var(--gray-400)', background: r.status === 'ABIERTA' ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)' }}>{r.status}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>{fmt(Number(r.currentBalance))}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {r.status === 'CERRADA' && <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setShowOpen(r.id); setOpenForm({ openingBalance: '' }); }}><DoorOpen size={14} /> Abrir</button>}
                  {r.status === 'ABIERTA' && <>
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setShowMov(r.id); }}><Plus size={14} /> Movimiento</button>
                    <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); handleClose(r.id); }}><DoorClosed size={14} /> Cerrar</button>
                  </>}
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Movimientos - {selected.name}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {!selected.movements?.length ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin movimientos</div> : (
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Nro</th><th>Tipo</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
                <tbody>
                  {selected.movements.map((m) => {
                    const ti = typeIcon[m.movementType] || { icon: ArrowDownLeft, color: 'var(--gray-400)' };
                    const Icon = ti.icon;
                    return (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{fmtDt(m.performedAt)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.movementNumber}</td>
                        <td><Icon size={16} style={{ color: ti.color }} /></td>
                        <td>{m.concept}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: ti.color }}>{fmt(Number(m.amount))}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(Number(m.newBalance))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Nueva Caja</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group"><label className="form-label">Código *</label><input className="form-input" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} required /></div>
                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Ubicación</label><input className="form-input" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Open Modal */}
      {showOpen && (
        <div className="modal-overlay" onClick={() => setShowOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Abrir Caja</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowOpen(null)}>✕</button></div>
            <form onSubmit={handleOpen}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group"><label className="form-label">Saldo de Apertura *</label><input type="number" step="0.01" className="form-input" value={openForm.openingBalance} onChange={(e) => setOpenForm({ openingBalance: e.target.value })} required /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowOpen(null)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Abriendo...' : 'Abrir Caja'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMov && (
        <div className="modal-overlay" onClick={() => setShowMov(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header"><h3 style={{ margin: 0 }}>Nuevo Movimiento de Caja</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowMov(null)}>✕</button></div>
            <form onSubmit={handleMov}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group"><label className="form-label">Tipo *</label><select className="form-input" value={movForm.movementType} onChange={(e) => setMovForm({ ...movForm, movementType: e.target.value })}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></div>
                  <div className="form-group"><label className="form-label">Monto *</label><input type="number" step="0.01" className="form-input" value={movForm.amount} onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Concepto *</label><input className="form-input" value={movForm.concept} onChange={(e) => setMovForm({ ...movForm, concept: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Referencia</label><input className="form-input" value={movForm.reference} onChange={(e) => setMovForm({ ...movForm, reference: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Tercero</label><input className="form-input" value={movForm.thirdPartyName} onChange={(e) => setMovForm({ ...movForm, thirdPartyName: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowMov(null)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
