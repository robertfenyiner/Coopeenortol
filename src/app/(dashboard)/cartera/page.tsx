'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calculator,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Handshake,
  Phone,
  Plus,
  ShieldAlert,
  TrendingDown,
  XCircle,
} from 'lucide-react';

interface PortfolioData {
  summary: {
    totalActiveCredits: number;
    totalOverdue: number;
    totalOutstanding: number;
    healthyBalance: number;
    overduePercent: number;
    totalProvisionAmount: number;
    activeAgreements: number;
  };
  aging: Record<string, { count: number; amount: number }>;
  overdueList: Array<{
    associateNumber: string;
    name: string;
    document: string;
    phone: string | null;
    creditNumber: string;
    creditId: string;
    overdueInstallments: number;
    totalOverdue: number;
    oldestDueDate: string;
    daysOverdue: number;
  }>;
  recentPayments: Array<{
    id: string;
    creditNumber: string;
    associateName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
  }>;
  provisions: Array<{
    id: string;
    creditId: string;
    creditNumber: string;
    associateName: string;
    riskCategory: string;
    daysOverdue: number;
    outstandingBalance: number;
    provisionRate: number;
    provisionAmount: number;
  }>;
  agreements: Array<{
    id: string;
    agreementNumber: string;
    creditId: string;
    creditNumber: string;
    associateName: string;
    agreedAmount: number;
    installmentAmount: number;
    installments: number;
    nextDueDate: string | null;
  }>;
}

const AGING_LABELS: Record<string, { label: string; color: string }> = {
  '1-30': { label: '1 - 30 dias', color: 'var(--warning-600)' },
  '31-60': { label: '31 - 60 dias', color: '#ea580c' },
  '61-90': { label: '61 - 90 dias', color: 'var(--danger-500)' },
  '90+': { label: '90+ dias', color: 'var(--danger-700)' },
};

export default function CarteraPage() {
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementCreditId, setAgreementCreditId] = useState('');
  const [agreementAmount, setAgreementAmount] = useState('');
  const [initialPayment, setInitialPayment] = useState('0');
  const [installments, setInstallments] = useState('6');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const fmt = (value: number | string) => `$ ${Number(value).toLocaleString('es-CO')}`;
  const fmtDate = (value: string) => new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cartera');
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function calculateProvisions() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/cartera/provisiones', { method: 'POST' });
      const json = await res.json();
      if (json.success) await fetchData();
      else alert(json.error || 'No se pudieron calcular provisiones');
    } finally {
      setActionLoading(false);
    }
  }

  function openAgreement(creditId: string, amount: number) {
    setAgreementCreditId(creditId);
    setAgreementAmount(String(amount));
    setInitialPayment('0');
    setInstallments('6');
    setStartDate(new Date().toISOString().slice(0, 10));
    setReason('Acuerdo de normalizacion de cartera');
    setShowAgreement(true);
  }

  async function createAgreement() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/cartera/acuerdos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditId: agreementCreditId,
          agreedAmount: parseFloat(agreementAmount),
          initialPayment: parseFloat(initialPayment),
          installments: parseInt(installments, 10),
          startDate,
          reason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAgreement(false);
        await fetchData();
      } else {
        alert(json.error || 'No se pudo crear el acuerdo');
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !data) return <div className="loading-center"><div className="loading-spinner"></div></div>;

  const s = data.summary;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion de Cartera</h1>
          <p className="page-subtitle">Seguimiento de mora, provisiones y acuerdos de pago</p>
        </div>
        <button className="btn btn-primary" onClick={calculateProvisions} disabled={actionLoading}>
          <Calculator size={16} /> Calcular provisiones
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue"><CreditCard size={22} /></div><div><div className="stat-value">{s.totalActiveCredits}</div><div className="stat-label">Creditos activos</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><DollarSign size={22} /></div><div><div className="stat-value">{fmt(s.totalOutstanding)}</div><div className="stat-label">Cartera total</div></div></div>
        <div className="stat-card"><div className="stat-icon red"><AlertTriangle size={22} /></div><div><div className="stat-value">{fmt(s.totalOverdue)}</div><div className="stat-label">Cartera vencida</div></div></div>
        <div className="stat-card"><div className="stat-icon amber"><TrendingDown size={22} /></div><div><div className="stat-value">{s.overduePercent}%</div><div className="stat-label">Indice de mora</div></div></div>
        <div className="stat-card"><div className="stat-icon red"><ShieldAlert size={22} /></div><div><div className="stat-value">{fmt(s.totalProvisionAmount)}</div><div className="stat-label">Provision vigente</div></div></div>
        <div className="stat-card"><div className="stat-icon blue"><Handshake size={22} /></div><div><div className="stat-value">{s.activeAgreements}</div><div className="stat-label">Acuerdos activos</div></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Clasificacion por antiguedad</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {Object.entries(data.aging).map(([range, info]) => {
              const cfg = AGING_LABELS[range];
              const pct = s.totalOverdue > 0 ? Math.round((info.amount / s.totalOverdue) * 100) : 0;
              return (
                <div key={range} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color }} />
                    <div><div className="font-semibold text-sm">{cfg.label}</div><div className="text-xs text-muted">{info.count} creditos</div></div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div className="font-semibold text-sm" style={{ color: cfg.color }}>{fmt(info.amount)}</div>{info.amount > 0 && <div className="text-xs text-muted">{pct}%</div>}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Ultimos pagos recibidos</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.recentPayments.length > 0 ? data.recentPayments.map((payment) => (
              <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                <div><div className="font-semibold text-sm">{payment.associateName}</div><div className="text-xs text-muted">{payment.creditNumber} · {payment.paymentMethod}</div></div>
                <div style={{ textAlign: 'right' }}><div className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>{fmt(payment.amount)}</div><div className="text-xs text-muted">{fmtDate(payment.paymentDate)}</div></div>
              </div>
            )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin pagos recientes</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Provisiones vigentes</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.provisions.length > 0 ? data.provisions.slice(0, 8).map((provision) => (
              <div key={provision.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                <div><div className="font-semibold text-sm">{provision.associateName}</div><div className="text-xs text-muted">{provision.creditNumber} · Categoria {provision.riskCategory} · {provision.daysOverdue} dias</div></div>
                <div style={{ textAlign: 'right' }}><div className="font-semibold text-sm" style={{ color: 'var(--danger-600)' }}>{fmt(provision.provisionAmount)}</div><div className="text-xs text-muted">{provision.provisionRate}% de {fmt(provision.outstandingBalance)}</div></div>
              </div>
            )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin provisiones calculadas</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Acuerdos de pago activos</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.agreements.length > 0 ? data.agreements.map((agreement) => (
              <div key={agreement.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                <div><div className="font-semibold text-sm">{agreement.associateName}</div><div className="text-xs text-muted">{agreement.agreementNumber} · {agreement.creditNumber} · {agreement.installments} cuotas</div></div>
                <div style={{ textAlign: 'right' }}><div className="font-semibold text-sm">{fmt(agreement.installmentAmount)}</div><div className="text-xs text-muted">{agreement.nextDueDate ? fmtDate(agreement.nextDueDate) : 'Sin cuota pendiente'}</div></div>
              </div>
            )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin acuerdos activos</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Creditos con cuotas vencidas ({data.overdueList.length})</span></div>
        <div className="table-container">
          {data.overdueList.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Asociado</th><th>No. Credito</th><th>Cuotas</th><th className="text-right">Monto vencido</th><th>Dias mora</th><th>Contacto</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>
                {data.overdueList.map((item) => (
                  <tr key={item.creditId}>
                    <td><div className="font-semibold text-sm">{item.name}</div><div className="text-xs text-muted">{item.document}</div></td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.creditNumber}</span></td>
                    <td><span className="badge badge-danger">{item.overdueInstallments}</span></td>
                    <td className="text-right"><span className="font-semibold text-sm" style={{ color: 'var(--danger-500)' }}>{fmt(item.totalOverdue)}</span></td>
                    <td><span className="font-semibold text-sm" style={{ color: 'var(--danger-600)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {item.daysOverdue}</span></td>
                    <td>{item.phone && <a href={`tel:${item.phone}`} className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={12} /> {item.phone}</a>}</td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/creditos/${item.creditId}`)}><Eye size={14} /> Ver</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openAgreement(item.creditId, item.totalOverdue)} style={{ marginLeft: '0.35rem' }}><Plus size={14} /> Acuerdo</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="empty-state-title">Sin creditos vencidos</div><div className="empty-state-text">La cartera esta al dia.</div></div>
          )}
        </div>
      </div>

      {showAgreement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '1.5rem', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nuevo acuerdo de pago</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAgreement(false)}><XCircle size={16} /></button>
            </div>
            <div className="form-group"><label className="form-label">Monto acordado</label><input className="form-input" type="number" min="1" value={agreementAmount} onChange={(event) => setAgreementAmount(event.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Pago inicial</label><input className="form-input" type="number" min="0" value={initialPayment} onChange={(event) => setInitialPayment(event.target.value)} /></div>
              <div className="form-group"><label className="form-label">Cuotas</label><input className="form-input" type="number" min="1" max="60" value={installments} onChange={(event) => setInstallments(event.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Fecha de inicio</label><input className="form-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
            <div className="form-group"><label className="form-label">Motivo</label><textarea className="form-input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAgreement(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createAgreement} disabled={actionLoading || !agreementAmount || !reason}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
