'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Banknote, DollarSign, Calendar, TrendingDown } from 'lucide-react';

interface CreditDetail {
  id: string;
  creditNumber: string;
  creditLine: string;
  status: string;
  requestedAmount: string;
  approvedAmount: string | null;
  disbursedAmount: string | null;
  interestRate: string;
  termMonths: number;
  paymentFrequency: string;
  purpose: string | null;
  guaranteeType: string | null;
  guaranteeDescription: string | null;
  outstandingBalance: string;
  totalPaid: string;
  totalInterestPaid: string;
  requestDate: string;
  approvedDate: string | null;
  disbursementDate: string | null;
  rejectionReason: string | null;
  observations: string | null;
  associate: {
    associateNumber: string;
    person: {
      firstName: string; lastName: string; secondLastName: string | null;
      documentType: string; documentNumber: string; email: string | null; mobilePhone: string | null;
    };
  };
  amortization: Array<{
    id: string; installmentNumber: number; dueDate: string;
    principalAmount: string; interestAmount: string; totalAmount: string;
    remainingBalance: string; status: string; paidDate: string | null; paidAmount: string | null;
  }>;
  payments: Array<{
    id: string; paymentNumber: number; amount: string;
    principalPaid: string; interestPaid: string; paymentMethod: string;
    reference: string | null; paymentDate: string;
  }>;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SOLICITUD: { label: 'Solicitud', color: 'var(--warning-500)' },
  EN_EVALUACION: { label: 'En Evaluación', color: 'var(--info-500)' },
  APROBADO: { label: 'Aprobado', color: 'var(--success-500)' },
  RECHAZADO: { label: 'Rechazado', color: 'var(--danger-500)' },
  VIGENTE: { label: 'Vigente', color: 'var(--success-600)' },
  VENCIDO: { label: 'Vencido', color: 'var(--danger-600)' },
  PAGADO: { label: 'Pagado', color: 'var(--gray-500)' },
  CASTIGADO: { label: 'Castigado', color: 'var(--danger-700)' },
};

const LINE_MAP: Record<string, string> = {
  LIBRE_INVERSION: 'Libre Inversión', EDUCACION: 'Educación', VIVIENDA: 'Vivienda',
  VEHICULO: 'Vehículo', CALAMIDAD: 'Calamidad',
};

export default function CreditoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [credit, setCredit] = useState<CreditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'amortization' | 'payments'>('info');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' };
  const fmt = (v: string | number) => `$ ${Number(v).toLocaleString('es-CO')}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  const fetchCredit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creditos/${id}`);
      const json = await res.json();
      if (json.success) setCredit(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchCredit(); }, [fetchCredit]);

  const handleAction = async (action: string, body: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/creditos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const json = await res.json();
      if (json.success) {
        setShowApprove(false); setShowReject(false);
        fetchCredit();
      } else {
        alert(json.error || 'Error');
      }
    } catch (e) { console.error(e); alert('Error de conexión'); }
    finally { setActionLoading(false); }
  };

  const handlePayment = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/creditos/${id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          reference: paymentReference || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPayment(false); setPaymentAmount(''); setPaymentReference('');
        fetchCredit();
      } else { alert(json.error || 'Error'); }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  if (loading || !credit) {
    return <div className="loading-center"><div className="loading-spinner"></div></div>;
  }

  const st = STATUS_MAP[credit.status] || { label: credit.status, color: 'var(--gray-400)' };
  const canApprove = ['SOLICITUD', 'EN_EVALUACION'].includes(credit.status);
  const canDisburse = credit.status === 'APROBADO';
  const canPay = ['VIGENTE', 'VENCIDO'].includes(credit.status);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/creditos')}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontFamily: 'monospace' }}>{credit.creditNumber}</span>
              <span style={{ padding: '0.2rem 0.7rem', background: st.color, color: 'white', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                {st.label}
              </span>
            </h1>
            <p className="page-subtitle">
              {credit.associate.person.firstName} {credit.associate.person.lastName} · {LINE_MAP[credit.creditLine] || credit.creditLine}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => { setApprovedAmount(String(credit.requestedAmount)); setShowApprove(true); }}>
                <CheckCircle size={14} /> Aprobar
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowReject(true)}>
                <XCircle size={14} /> Rechazar
              </button>
            </>
          )}
          {canDisburse && (
            <button className="btn btn-primary btn-sm" onClick={() => handleAction('disburse')} disabled={actionLoading}>
              <Banknote size={14} /> Desembolsar
            </button>
          )}
          {canPay && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>
              <DollarSign size={14} /> Registrar Pago
            </button>
          )}
        </div>
      </div>

      {/* Resumen cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { icon: DollarSign, label: 'Monto Aprobado', value: credit.approvedAmount ? fmt(credit.approvedAmount) : fmt(credit.requestedAmount), color: 'var(--primary-600)' },
          { icon: TrendingDown, label: 'Saldo Pendiente', value: fmt(credit.outstandingBalance), color: Number(credit.outstandingBalance) > 0 ? 'var(--danger-500)' : 'var(--success-600)' },
          { icon: DollarSign, label: 'Total Pagado', value: fmt(credit.totalPaid), color: 'var(--success-600)' },
          { icon: Calendar, label: 'Plazo', value: `${credit.termMonths} meses · ${Number(credit.interestRate).toFixed(1)}%`, color: 'var(--gray-600)' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-xs text-muted">{item.label}</div>
              <div className="font-semibold" style={{ color: item.color }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', padding: '0 1rem' }}>
          {([['info', 'Información'], ['amortization', 'Tabla de Amortización'], ['payments', 'Pagos Realizados']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === key ? '2px solid var(--primary-500)' : '2px solid transparent',
                color: activeTab === key ? 'var(--primary-600)' : 'var(--gray-500)', fontWeight: activeTab === key ? 600 : 400, fontSize: '0.875rem' }}>
              {label} {key === 'payments' && credit.payments.length > 0 && `(${credit.payments.length})`}
              {key === 'amortization' && credit.amortization.length > 0 && `(${credit.amortization.length})`}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>Datos del Asociado</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                  <div><span className="text-muted">Nombre:</span> <strong>{credit.associate.person.firstName} {credit.associate.person.lastName}</strong></div>
                  <div><span className="text-muted">Documento:</span> {credit.associate.person.documentType} {credit.associate.person.documentNumber}</div>
                  <div><span className="text-muted">N° Asociado:</span> <span style={{ fontFamily: 'monospace' }}>{credit.associate.associateNumber}</span></div>
                  {credit.associate.person.email && <div><span className="text-muted">Email:</span> {credit.associate.person.email}</div>}
                  {credit.associate.person.mobilePhone && <div><span className="text-muted">Celular:</span> {credit.associate.person.mobilePhone}</div>}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>Condiciones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                  <div><span className="text-muted">Línea:</span> {LINE_MAP[credit.creditLine] || credit.creditLine}</div>
                  <div><span className="text-muted">Monto Solicitado:</span> <strong>{fmt(credit.requestedAmount)}</strong></div>
                  {credit.approvedAmount && <div><span className="text-muted">Monto Aprobado:</span> <strong>{fmt(credit.approvedAmount)}</strong></div>}
                  <div><span className="text-muted">Tasa Mensual:</span> {Number(credit.interestRate).toFixed(2)}%</div>
                  <div><span className="text-muted">Plazo:</span> {credit.termMonths} meses</div>
                  <div><span className="text-muted">Periodicidad:</span> {credit.paymentFrequency}</div>
                  {credit.purpose && <div><span className="text-muted">Destino:</span> {credit.purpose}</div>}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>Fechas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                  <div><span className="text-muted">Solicitud:</span> {fmtDate(credit.requestDate)}</div>
                  {credit.approvedDate && <div><span className="text-muted">Aprobación:</span> {fmtDate(credit.approvedDate)}</div>}
                  {credit.disbursementDate && <div><span className="text-muted">Desembolso:</span> {fmtDate(credit.disbursementDate)}</div>}
                  {credit.rejectionReason && <div><span className="text-muted">Motivo rechazo:</span> <span style={{ color: 'var(--danger-500)' }}>{credit.rejectionReason}</span></div>}
                </div>
              </div>
              {credit.guaranteeType && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>Garantía</h4>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div><span className="text-muted">Tipo:</span> {credit.guaranteeType}</div>
                    {credit.guaranteeDescription && <div><span className="text-muted">Descripción:</span> {credit.guaranteeDescription}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'amortization' && (
            credit.amortization.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">La tabla de amortización se genera al aprobar el crédito</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Vencimiento</th>
                      <th style={{ textAlign: 'right' }}>Capital</th>
                      <th style={{ textAlign: 'right' }}>Interés</th>
                      <th style={{ textAlign: 'right' }}>Cuota</th>
                      <th style={{ textAlign: 'right' }}>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credit.amortization.map((e) => {
                      const isPaid = e.status === 'PAGADO';
                      const isOverdue = e.status === 'PENDIENTE' && new Date(e.dueDate) < new Date();
                      return (
                        <tr key={e.id} style={{ background: isPaid ? 'var(--success-25, #f0fdf4)' : isOverdue ? 'var(--danger-25, #fef2f2)' : undefined }}>
                          <td className="text-sm font-semibold">{e.installmentNumber}</td>
                          <td className="text-sm">{fmtDate(e.dueDate)}</td>
                          <td className="text-sm" style={{ textAlign: 'right' }}>{fmt(e.principalAmount)}</td>
                          <td className="text-sm" style={{ textAlign: 'right' }}>{fmt(e.interestAmount)}</td>
                          <td className="text-sm font-semibold" style={{ textAlign: 'right' }}>{fmt(e.totalAmount)}</td>
                          <td className="text-sm" style={{ textAlign: 'right' }}>{fmt(e.remainingBalance)}</td>
                          <td>
                            <span className={`badge ${isPaid ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                              {isPaid ? 'Pagado' : isOverdue ? 'Vencido' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'payments' && (
            credit.payments.length === 0 ? (
              <div className="empty-state"><div className="empty-state-text">No hay pagos registrados</div></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th style={{ textAlign: 'right' }}>Capital</th>
                      <th style={{ textAlign: 'right' }}>Interés</th>
                      <th>Método</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credit.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="text-sm font-semibold">{p.paymentNumber}</td>
                        <td className="text-sm">{fmtDate(p.paymentDate)}</td>
                        <td className="text-sm font-semibold" style={{ textAlign: 'right', color: 'var(--success-600)' }}>{fmt(p.amount)}</td>
                        <td className="text-sm" style={{ textAlign: 'right' }}>{fmt(p.principalPaid)}</td>
                        <td className="text-sm" style={{ textAlign: 'right' }}>{fmt(p.interestPaid)}</td>
                        <td className="text-sm text-muted">{p.paymentMethod}</td>
                        <td className="text-sm text-muted">{p.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal: Aprobar */}
      {showApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '1.5rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Aprobar Crédito</h3>
            <div className="form-group">
              <label className="form-label">Monto a Aprobar *</label>
              <input type="number" style={inputStyle} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} min="1" required />
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowApprove(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={() => handleAction('approve', { approvedAmount: parseFloat(approvedAmount) })}>
                {actionLoading ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar */}
      {showReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '1.5rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Rechazar Crédito</h3>
            <div className="form-group">
              <label className="form-label">Motivo del Rechazo *</label>
              <textarea style={{ ...inputStyle, minHeight: '80px' }} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} required />
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowReject(false)}>Cancelar</button>
              <button className="btn btn-danger" disabled={actionLoading || !rejectionReason} onClick={() => handleAction('reject', { rejectionReason })}>
                {actionLoading ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pago */}
      {showPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '1.5rem', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Registrar Pago</h3>
            <div className="form-group">
              <label className="form-label">Monto del Pago (COP) *</label>
              <input type="number" style={inputStyle} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} min="1" required />
            </div>
            <div className="form-group">
              <label className="form-label">Método de Pago *</label>
              <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="NOMINA">Descuento por Nómina</option>
                <option value="CONSIGNACION">Consignación</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Referencia</label>
              <input style={inputStyle} value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="N° comprobante" />
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowPayment(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={actionLoading || !paymentAmount} onClick={handlePayment}>
                {actionLoading ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
