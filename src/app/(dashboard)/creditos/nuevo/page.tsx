'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Search, Calculator } from 'lucide-react';

interface AssociateOption {
  id: string;
  associateNumber: string;
  person: { firstName: string; lastName: string; secondLastName: string | null; documentNumber: string };
}

const LINE_OPTIONS = [
  { code: 'LIBRE_INVERSION', label: 'Libre Inversión' },
  { code: 'EDUCACION', label: 'Educación' },
  { code: 'VIVIENDA', label: 'Vivienda' },
  { code: 'VEHICULO', label: 'Vehículo' },
  { code: 'CALAMIDAD', label: 'Calamidad' },
];

const FREQUENCY_OPTIONS = [
  { code: 'MENSUAL', label: 'Mensual' },
  { code: 'QUINCENAL', label: 'Quincenal' },
  { code: 'SEMANAL', label: 'Semanal' },
];

export default function NuevoCreditoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Búsqueda de asociado
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<AssociateOption[]>([]);
  const [selected, setSelected] = useState<AssociateOption | null>(null);
  const [searching, setSearching] = useState(false);

  // Formulario
  const [creditLine, setCreditLine] = useState('LIBRE_INVERSION');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('1.5');
  const [termMonths, setTermMonths] = useState('12');
  const [paymentFrequency, setPaymentFrequency] = useState('MENSUAL');
  const [purpose, setPurpose] = useState('');
  const [guaranteeType, setGuaranteeType] = useState('');
  const [guaranteeDescription, setGuaranteeDescription] = useState('');
  const [observations, setObservations] = useState('');

  // Simulación
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' };

  const searchAssociates = useCallback(async () => {
    if (searchTerm.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/asociados?search=${encodeURIComponent(searchTerm)}&status=ACTIVO&pageSize=10`);
      const json = await res.json();
      if (json.success) setResults(json.data.data);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(searchAssociates, 300);
    return () => clearTimeout(t);
  }, [searchAssociates]);

  // Simular cuota
  const simulatePayment = () => {
    const P = parseFloat(requestedAmount);
    const r = parseFloat(interestRate) / 100;
    const n = parseInt(termMonths);
    if (!P || !n || P <= 0 || n <= 0) return;

    let payment: number;
    if (r === 0) { payment = P / n; }
    else { payment = (P * r) / (1 - Math.pow(1 + r, -n)); }
    setMonthlyPayment(Math.round(payment * 100) / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Seleccione un asociado'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/creditos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          associateId: selected.id,
          creditLine,
          requestedAmount: parseFloat(requestedAmount),
          interestRate: parseFloat(interestRate),
          termMonths: parseInt(termMonths),
          paymentFrequency,
          purpose: purpose || null,
          guaranteeType: guaranteeType || null,
          guaranteeDescription: guaranteeDescription || null,
          observations: observations || null,
        }),
      });
      const json = await res.json();
      if (json.success) router.push('/creditos');
      else setError(json.error || 'Error al crear solicitud');
    } catch (e) { setError('Error de conexión'); console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">Nueva Solicitud de Crédito</h1>
            <p className="page-subtitle">Registrar solicitud de crédito para un asociado</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', color: 'var(--danger-700)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Asociado */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>1. Asociado</h3>
          {selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--primary-50)', borderRadius: '8px', border: '1px solid var(--primary-200)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--primary-700)' }}>
                  {selected.person.firstName} {selected.person.lastName} {selected.person.secondLastName || ''}
                </div>
                <div className="text-sm text-muted" style={{ fontFamily: 'monospace' }}>{selected.associateNumber} · {selected.person.documentNumber}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setSearchTerm(''); }} style={{ color: 'var(--danger-500)' }}>Cambiar</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} placeholder="Buscar asociado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
              </div>
              {(results.length > 0 || searching) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid var(--gray-200)', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                  {searching ? <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-400)' }}>Buscando...</div> :
                    results.map((a) => (
                      <button key={a.id} type="button" onClick={() => { setSelected(a); setResults([]); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                        <div className="font-semibold text-sm">{a.person.firstName} {a.person.lastName}</div>
                        <div className="text-xs text-muted">{a.associateNumber} · {a.person.documentNumber}</div>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>

        {/* Condiciones */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>2. Condiciones del Crédito</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Línea de Crédito *</label>
              <select style={inputStyle} value={creditLine} onChange={(e) => setCreditLine(e.target.value)} required>
                {LINE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monto Solicitado (COP) *</label>
              <input type="number" style={inputStyle} value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} placeholder="0" min="1" step="1000" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tasa de Interés Mensual (%) *</label>
              <input type="number" style={inputStyle} value={interestRate} onChange={(e) => setInterestRate(e.target.value)} step="0.01" min="0" max="100" required />
            </div>
            <div className="form-group">
              <label className="form-label">Plazo (meses) *</label>
              <input type="number" style={inputStyle} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} min="1" max="360" required />
            </div>
            <div className="form-group">
              <label className="form-label">Periodicidad de Pago *</label>
              <select style={inputStyle} value={paymentFrequency} onChange={(e) => setPaymentFrequency(e.target.value)} required>
                {FREQUENCY_OPTIONS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destino</label>
              <input style={inputStyle} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Motivo del crédito" />
            </div>
          </div>

          {/* Simulador de cuota */}
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={simulatePayment}>
              <Calculator size={14} /> Simular Cuota
            </button>
            {monthlyPayment !== null && (
              <div style={{ padding: '0.5rem 1rem', background: 'var(--success-50)', borderRadius: '8px', border: '1px solid var(--success-200)', color: 'var(--success-700)', fontSize: '0.9rem' }}>
                Cuota estimada: <strong>$ {monthlyPayment.toLocaleString('es-CO')}</strong> / mes
              </div>
            )}
          </div>
        </div>

        {/* Garantía */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>3. Garantía (Opcional)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Garantía</label>
              <select style={inputStyle} value={guaranteeType} onChange={(e) => setGuaranteeType(e.target.value)}>
                <option value="">Sin garantía</option>
                <option value="PERSONAL">Personal (Pagaré)</option>
                <option value="CODEUDOR">Con Codeudor</option>
                <option value="REAL">Garantía Real</option>
                <option value="APORTES">Con Aportes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input style={inputStyle} value={guaranteeDescription} onChange={(e) => setGuaranteeDescription(e.target.value)} placeholder="Detalles de la garantía" />
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>4. Observaciones</h3>
          <textarea style={{ ...inputStyle, minHeight: '80px' }} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Notas adicionales..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !selected}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Crear Solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
}
