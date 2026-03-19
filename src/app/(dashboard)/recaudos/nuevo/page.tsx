'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Search, Receipt, DollarSign, UserPlus } from 'lucide-react';

interface AssociateOption {
  id: string;
  associateNumber: string;
  status: string;
  person: { firstName: string; lastName: string; documentNumber: string };
}

interface ContributionRow {
  key: number;
  associateId: string;
  associateName: string;
  associateNumber: string;
  type: string;
  amount: number;
}

const CONTRIBUTION_TYPES = [
  { value: 'ORDINARIO', label: 'Ordinario' },
  { value: 'EXTRAORDINARIO', label: 'Extraordinario' },
  { value: 'CUOTA_INGRESO', label: 'Cuota de Ingreso' },
];

export default function NuevoRecaudoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [reference, setReference] = useState('');
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  let _nextKey = 1;

  // Búsqueda de asociados
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AssociateOption[]>([]);
  const [searching, setSearching] = useState(false);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.875rem' };
  const fmt = (v: number) => `$ ${v.toLocaleString('es-CO')}`;

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  // Buscar asociados
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/asociados?search=${encodeURIComponent(searchTerm)}&pageSize=10&status=ACTIVO`);
        const json = await res.json();
        if (json.success) setSearchResults(json.data?.data || []);
      } catch (e) { console.error(e); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const addAssociate = (associate: AssociateOption) => {
    const key = _nextKey++;
    setRows([...rows, {
      key,
      associateId: associate.id,
      associateName: `${associate.person.firstName} ${associate.person.lastName}`,
      associateNumber: associate.associateNumber,
      type: 'ORDINARIO',
      amount: 0,
    }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const updateRow = (key: number, field: string, value: string | number) => {
    setRows(rows.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const removeRow = (key: number) => {
    setRows(rows.filter(r => r.key !== key));
  };

  const handleSubmit = async () => {
    setError('');
    if (rows.length === 0) { setError('Agregue al menos un aporte'); return; }
    if (rows.some(r => r.amount <= 0)) { setError('Todos los montos deben ser mayores a 0'); return; }

    setSubmitting(true);
    try {
      const body = {
        contributions: rows.map(r => ({
          associateId: r.associateId,
          type: r.type,
          amount: r.amount,
        })),
        paymentMethod,
        reference: reference || null,
        observations: observations || null,
      };

      const res = await fetch('/api/recaudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/recaudos/${json.data.id}`);
      } else {
        setError(json.error || 'Error al procesar recaudo');
      }
    } catch (e) {
      console.error(e);
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/recaudos')}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Nuevo Recaudo en Lote</h1>
            <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>Registre aportes de múltiples asociados en un solo recibo</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', color: 'var(--danger-700)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Datos del recibo */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={18} /> Datos del Recibo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Método de Pago *</label>
            <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="NOMINA">Descuento por Nómina</option>
              <option value="CONSIGNACION">Consignación</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Referencia / Comprobante</label>
            <input style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° transferencia, comprobante..." />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Observaciones</label>
            <input style={inputStyle} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Notas adicionales (opcional)" />
          </div>
        </div>
      </div>

      {/* Buscar asociado */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} /> Agregar Asociados
        </h3>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--gray-200)', borderRadius: '6px' }}>
            <Search size={16} style={{ color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o N° de asociado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem' }}
            />
            {searching && <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>}
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflow: 'auto' }}>
              {searchResults.map((a) => (
                <button key={a.id} onClick={() => addAssociate(a)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', fontSize: '0.85rem', textAlign: 'left' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                  <div>
                    <div className="font-semibold">{a.person.firstName} {a.person.lastName}</div>
                    <div className="text-xs text-muted">{a.person.documentNumber}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--primary-600)' }}>{a.associateNumber}</span>
                    <Plus size={14} style={{ color: 'var(--success-600)' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla de aportes */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <span className="card-title">Aportes del Recibo ({rows.length})</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            <div className="empty-state-title">Sin aportes agregados</div>
            <div className="empty-state-text">Busque y seleccione asociados arriba para agregarlos</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asociado</th>
                  <th>N° Asociado</th>
                  <th>Tipo de Aporte</th>
                  <th>Monto (COP)</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="font-semibold text-sm">{row.associateName}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.associateNumber}</span></td>
                    <td>
                      <select style={{ ...inputStyle, maxWidth: '180px' }} value={row.type} onChange={(e) => updateRow(row.key, 'type', e.target.value)}>
                        {CONTRIBUTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" style={{ ...inputStyle, maxWidth: '160px' }} value={row.amount || ''} onChange={(e) => updateRow(row.key, 'amount', Number(e.target.value))} min="0" step="1000" placeholder="0" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeRow(row.key)} style={{ color: 'var(--danger-500)' }} title="Quitar">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem' }}>Total:</td>
                  <td>
                    <span className="font-semibold" style={{ color: 'var(--success-600)', fontSize: '1rem' }}>{fmt(totalAmount)}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Botón submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/recaudos')}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || rows.length === 0}>
          <DollarSign size={16} /> {submitting ? 'Procesando...' : `Generar Recibo (${fmt(totalAmount)})`}
        </button>
      </div>
    </div>
  );
}
