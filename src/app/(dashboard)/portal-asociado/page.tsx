'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  Download,
  FileText,
  Landmark,
  PiggyBank,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react';

interface PortalSummary {
  associate: {
    associateNumber: string;
    status: string;
    admissionDate: string | null;
    person: {
      firstName: string;
      lastName: string;
      secondLastName: string | null;
      documentType: string;
      documentNumber: string;
      email: string | null;
      mobilePhone: string | null;
    };
  };
  totals: {
    savingsBalance: number;
    activeCreditBalance: number;
    activeCdatBalance: number;
    projectedCdatInterest: number;
    netPosition: number;
  };
  savingsAccounts: Array<{ id: string; accountType: string; balance: string }>;
  recentContributions: Array<{ id: string; type: string; amount: string; periodYear: number | null; periodMonth: number | null; createdAt: string }>;
  credits: Array<{ id: string; creditNumber: string; creditLine: string; status: string; outstandingBalance: string; approvedAmount: string | null; requestedAmount: string }>;
  cdats: Array<{ id: string; certificateNumber: string; status: string; principalAmount: string; maturityDate: string; netInterest: string }>;
  documents: Array<{ id: string; documentType: string; fileName: string; uploadedAt: string }>;
}

interface SimulationResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

function formatCurrency(value: string | number) {
  return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PortalAsociadoPage() {
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [simulation, setSimulation] = useState({
    amount: 5000000,
    annualRate: 18,
    termMonths: 24,
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/portal-asociado/resumen');
      const json = await res.json();
      if (json.success) setSummary(json.data);
      else setMessage(json.error || 'No se pudo cargar el portal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  async function handleDownload(kind: 'certificado' | 'extracto') {
    const res = await fetch(`/api/portal-asociado/${kind}`);
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo generar el documento');
    downloadTextFile(json.data.fileName, json.data.content, json.data.mimeType);
  }

  async function handleSimulation() {
    const res = await fetch('/api/portal-asociado/simulador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulation),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo simular el crédito');
    setSimulationResult(json.data);
  }

  if (loading) {
    return <div className="loading-center"><div className="loading-spinner"></div></div>;
  }

  if (!summary) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Mi Portal</h1>
            <p className="page-subtitle">Autogestión del asociado</p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <ShieldAlert className="empty-state-icon" />
            <div className="empty-state-title">Usuario sin asociado vinculado</div>
            <div className="empty-state-text">{message || 'Solicita al administrador asociar tu usuario a tu ficha de asociado.'}</div>
          </div>
        </div>
      </div>
    );
  }

  const person = summary.associate.person;
  const name = `${person.firstName} ${person.lastName} ${person.secondLastName || ''}`.trim();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Portal</h1>
          <p className="page-subtitle">{name} · {summary.associate.associateNumber}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => handleDownload('extracto')}><Download size={16} /> Extracto</button>
          <button className="btn btn-primary" onClick={() => handleDownload('certificado')}><BadgeCheck size={16} /> Certificado</button>
        </div>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon green"><Wallet size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totals.savingsBalance)}</div><div className="stat-label">Aportes y ahorros</div></div></div>
        <div className="stat-card"><div className="stat-icon red"><Landmark size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totals.activeCreditBalance)}</div><div className="stat-label">Créditos vigentes</div></div></div>
        <div className="stat-card"><div className="stat-icon blue"><PiggyBank size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totals.activeCdatBalance)}</div><div className="stat-label">CDATs activos</div></div></div>
        <div className="stat-card"><div className="stat-icon amber"><Sparkles size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totals.netPosition)}</div><div className="stat-label">Posición neta</div></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: '1rem', alignItems: 'start' }}>
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Mis Productos</h2></div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Producto</th><th>Detalle</th><th className="text-right">Saldo / Valor</th><th>Estado</th></tr></thead>
                <tbody>
                  {summary.savingsAccounts.map((account) => (
                    <tr key={account.id}><td>Ahorro/Aporte</td><td>{account.accountType}</td><td className="text-right font-semibold">{formatCurrency(account.balance)}</td><td><span className="badge badge-success">Activo</span></td></tr>
                  ))}
                  {summary.credits.map((credit) => (
                    <tr key={credit.id}><td>Crédito</td><td>{credit.creditNumber} · {credit.creditLine}</td><td className="text-right font-semibold">{formatCurrency(credit.outstandingBalance)}</td><td><span className="badge badge-info">{credit.status}</span></td></tr>
                  ))}
                  {summary.cdats.map((cdat) => (
                    <tr key={cdat.id}><td>CDAT</td><td>{cdat.certificateNumber} · vence {formatDate(cdat.maturityDate)}</td><td className="text-right font-semibold">{formatCurrency(cdat.principalAmount)}</td><td><span className="badge badge-warning">{cdat.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Últimos Aportes</h2></div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Periodo</th><th className="text-right">Valor</th></tr></thead>
                <tbody>
                  {summary.recentContributions.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{item.type}</td>
                      <td>{item.periodMonth && item.periodYear ? `${item.periodMonth}/${item.periodYear}` : '-'}</td>
                      <td className="text-right font-semibold">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Datos del Asociado</h2></div>
            <div className="card-body">
              <div className="text-sm"><strong>{person.documentType}:</strong> {person.documentNumber}</div>
              <div className="text-sm"><strong>Estado:</strong> {summary.associate.status}</div>
              <div className="text-sm"><strong>Ingreso:</strong> {formatDate(summary.associate.admissionDate)}</div>
              <div className="text-sm"><strong>Email:</strong> {person.email || '-'}</div>
              <div className="text-sm"><strong>Móvil:</strong> {person.mobilePhone || '-'}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Simulador de Crédito</h2></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">Monto</label><input className="form-input" type="number" value={simulation.amount} onChange={(event) => setSimulation({ ...simulation, amount: Number(event.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Tasa anual %</label><input className="form-input" type="number" value={simulation.annualRate} onChange={(event) => setSimulation({ ...simulation, annualRate: Number(event.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Plazo meses</label><input className="form-input" type="number" value={simulation.termMonths} onChange={(event) => setSimulation({ ...simulation, termMonths: Number(event.target.value) })} /></div>
              <button className="btn btn-primary btn-block" onClick={handleSimulation}><Banknote size={16} /> Simular</button>
              {simulationResult && (
                <div className="mt-3">
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(simulationResult.monthlyPayment)}</div>
                  <div className="text-xs text-muted">Cuota mensual estimada</div>
                  <div className="text-sm mt-2">Interés total: {formatCurrency(simulationResult.totalInterest)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Documentos</h2></div>
            <div className="card-body">
              {summary.documents.length === 0 ? (
                <div className="text-sm text-muted">No hay documentos cargados.</div>
              ) : summary.documents.map((doc) => (
                <div key={doc.id} className="flex gap-2 items-center mb-2">
                  <FileText size={16} />
                  <div>
                    <div className="text-sm font-semibold">{doc.fileName}</div>
                    <div className="text-xs text-muted">{doc.documentType} · {formatDate(doc.uploadedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*='grid-template-columns'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
