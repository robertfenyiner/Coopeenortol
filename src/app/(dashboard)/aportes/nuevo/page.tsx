'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, Search, DollarSign } from 'lucide-react';

interface AssociateOption {
  id: string;
  associateNumber: string;
  status: string;
  person: {
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    documentNumber: string;
  };
}

interface ContributionLine {
  type: string;
  amount: string;
  periodYear: string;
  periodMonth: string;
  observations: string;
}

const TYPE_LABELS: Record<string, string> = {
  ORDINARIO: 'Aporte Ordinario',
  EXTRAORDINARIO: 'Aporte Extraordinario',
  CUOTA_INGRESO: 'Cuota de Ingreso',
  AHORRO_VOLUNTARIO: 'Ahorro Voluntario',
};

const MONTHS = [
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export default function NuevoAportePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Búsqueda de asociado
  const [searchTerm, setSearchTerm] = useState('');
  const [associateResults, setAssociateResults] = useState<AssociateOption[]>([]);
  const [selectedAssociate, setSelectedAssociate] = useState<AssociateOption | null>(null);
  const [searching, setSearching] = useState(false);

  // Datos del recibo
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [reference, setReference] = useState('');
  const [generalObservations, setGeneralObservations] = useState('');

  // Líneas de aporte
  const [lines, setLines] = useState<ContributionLine[]>([
    { type: 'ORDINARIO', amount: '', periodYear: String(new Date().getFullYear()), periodMonth: String(new Date().getMonth() + 1), observations: '' },
  ]);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' };

  // Buscar asociados
  const searchAssociates = useCallback(async () => {
    if (searchTerm.length < 2) {
      setAssociateResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/asociados?search=${encodeURIComponent(searchTerm)}&status=ACTIVO&pageSize=10`);
      const json = await res.json();
      if (json.success) {
        setAssociateResults(json.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(searchAssociates, 300);
    return () => clearTimeout(timer);
  }, [searchAssociates]);

  const addLine = () => {
    setLines([...lines, {
      type: 'ORDINARIO',
      amount: '',
      periodYear: String(new Date().getFullYear()),
      periodMonth: String(new Date().getMonth() + 1),
      observations: '',
    }]);
  };

  const updateLine = (index: number, field: keyof ContributionLine, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssociate) {
      setError('Debe seleccionar un asociado');
      return;
    }
    if (lines.some((l) => !l.amount || parseFloat(l.amount) <= 0)) {
      setError('Todos los montos deben ser mayores a 0');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const body = {
        contributions: lines.map((l) => ({
          associateId: selectedAssociate.id,
          type: l.type,
          amount: parseFloat(l.amount),
          periodYear: l.periodYear ? parseInt(l.periodYear) : null,
          periodMonth: l.periodMonth ? parseInt(l.periodMonth) : null,
          observations: l.observations || null,
        })),
        paymentMethod,
        reference: reference || null,
        observations: generalObservations || null,
      };

      const res = await fetch('/api/aportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        router.push('/aportes');
      } else {
        setError(json.error || json.details?.join(', ') || 'Error al registrar aporte');
      }
    } catch (e) {
      setError('Error de conexión');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Registrar Aporte</h1>
            <p className="page-subtitle">Recibo de pago de aportes</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', color: 'var(--danger-700)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Selección de asociado */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>1. Seleccionar Asociado</h3>

          {selectedAssociate ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--primary-50)', borderRadius: '8px', border: '1px solid var(--primary-200)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--primary-700)' }}>
                  {selectedAssociate.person.firstName} {selectedAssociate.person.lastName} {selectedAssociate.person.secondLastName || ''}
                </div>
                <div className="text-sm text-muted">
                  <span style={{ fontFamily: 'monospace' }}>{selectedAssociate.associateNumber}</span>
                  {' · '}{selectedAssociate.person.documentNumber}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedAssociate(null); setSearchTerm(''); }}
                style={{ color: 'var(--danger-500)' }}>
                Cambiar
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                  placeholder="Buscar asociado por nombre, documento o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              {(associateResults.length > 0 || searching) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid var(--gray-200)', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                  {searching ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-400)' }}>Buscando...</div>
                  ) : (
                    associateResults.map((a) => (
                      <button key={a.id} type="button"
                        onClick={() => { setSelectedAssociate(a); setAssociateResults([]); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >
                        <div className="font-semibold text-sm">{a.person.firstName} {a.person.lastName}</div>
                        <div className="text-xs text-muted">{a.associateNumber} · {a.person.documentNumber}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Datos del recibo */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>2. Datos del Pago</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Método de Pago *</label>
              <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="NOMINA">Descuento por Nómina</option>
                <option value="CONSIGNACION">Consignación</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Referencia / Comprobante</label>
              <input style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de comprobante" />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <input style={inputStyle} value={generalObservations} onChange={(e) => setGeneralObservations(e.target.value)} placeholder="Nota opcional" />
            </div>
          </div>
        </div>

        {/* Líneas de aporte */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>3. Conceptos de Aporte</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
              <Plus size={14} /> Agregar Línea
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 90px 90px auto', gap: '0.5rem', alignItems: 'end', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Aporte *</label>
                  <select style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.4rem' }} value={line.type} onChange={(e) => updateLine(i, 'type', e.target.value)} required>
                    {Object.entries(TYPE_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Monto (COP) *</label>
                  <input type="number" style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.4rem' }} value={line.amount} onChange={(e) => updateLine(i, 'amount', e.target.value)}
                    placeholder="0" min="1" step="100" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Año</label>
                  <input type="number" style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.4rem' }} value={line.periodYear} onChange={(e) => updateLine(i, 'periodYear', e.target.value)}
                    min="2000" max="2100" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Mes</label>
                  <select style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.4rem' }} value={line.periodMonth} onChange={(e) => updateLine(i, 'periodMonth', e.target.value)}>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(i)} disabled={lines.length <= 1}
                  style={{ color: lines.length <= 1 ? 'var(--gray-300)' : 'var(--danger-500)', marginBottom: '2px' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--primary-50)', borderRadius: '8px', border: '1px solid var(--primary-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <DollarSign size={20} style={{ color: 'var(--primary-600)' }} />
              <div>
                <div className="text-xs text-muted">Total del Recibo</div>
                <div className="font-semibold" style={{ fontSize: '1.3rem', color: 'var(--primary-600)' }}>
                  $ {totalAmount.toLocaleString('es-CO')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !selectedAssociate}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Registrar Aporte'}
          </button>
        </div>
      </form>
    </div>
  );
}
