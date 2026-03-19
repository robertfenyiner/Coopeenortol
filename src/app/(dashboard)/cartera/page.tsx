'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, TrendingDown, DollarSign, CreditCard, Eye, Phone, Clock } from 'lucide-react';

interface PortfolioData {
  summary: {
    totalActiveCredits: number;
    totalOverdueCredits: number;
    totalOutstanding: number;
    totalOverdue: number;
    healthyBalance: number;
    overduePercent: number;
  };
  aging: Record<string, { count: number; amount: number }>;
  overdueList: Array<{
    associateId: string;
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
}

const AGING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  '1-30': { label: '1 - 30 días', color: 'var(--warning-600)', bg: 'var(--warning-50)' },
  '31-60': { label: '31 - 60 días', color: '#ea580c', bg: '#fff7ed' },
  '61-90': { label: '61 - 90 días', color: 'var(--danger-500)', bg: 'var(--danger-50)' },
  '90+': { label: '90+ días', color: 'var(--danger-700)', bg: '#fef2f2' },
};

export default function CarteraPage() {
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fmt = (v: number) => `$ ${v.toLocaleString('es-CO')}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cartera');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="loading-center"><div className="loading-spinner"></div></div>;

  const d = data!;
  const s = d?.summary;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Cartera</h1>
          <p className="page-subtitle">Seguimiento de cobros, mora y calidad de cartera</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><CreditCard size={22} /></div>
          <div>
            <div className="stat-value">{s?.totalActiveCredits ?? 0}</div>
            <div className="stat-label">Créditos Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">{s ? fmt(s.totalOutstanding) : '—'}</div>
            <div className="stat-label">Cartera Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div>
            <div className="stat-value" style={{ color: (s?.totalOverdue ?? 0) > 0 ? 'var(--danger-500)' : undefined }}>
              {s ? fmt(s.totalOverdue) : '—'}
            </div>
            <div className="stat-label">Cartera Vencida</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><TrendingDown size={22} /></div>
          <div>
            <div className="stat-value" style={{ color: (s?.overduePercent ?? 0) > 5 ? 'var(--danger-500)' : 'var(--success-600)' }}>
              {s?.overduePercent ?? 0}%
            </div>
            <div className="stat-label">Índice de Mora</div>
          </div>
        </div>
      </div>

      {/* Aging + Pagos recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Clasificación de mora */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📊 Clasificación por Antigüedad</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {d && Object.entries(d.aging).map(([range, info]) => {
              const cfg = AGING_LABELS[range];
              const pct = s.totalOverdue > 0 ? Math.round((info.amount / s.totalOverdue) * 100) : 0;
              return (
                <div key={range} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color }} />
                    <div>
                      <div className="font-semibold text-sm">{cfg.label}</div>
                      <div className="text-xs text-muted">{info.count} crédito{info.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-semibold text-sm" style={{ color: cfg.color }}>{fmt(info.amount)}</div>
                    {info.amount > 0 && <div className="text-xs text-muted">{pct}%</div>}
                  </div>
                </div>
              );
            })}

            {/* Barra de calidad */}
            {d && s.totalOutstanding > 0 && (
              <div style={{ padding: '0.75rem 1rem' }}>
                <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Calidad de Cartera</div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--gray-100)' }}>
                  <div style={{ width: `${100 - s.overduePercent}%`, background: 'var(--success-500)', transition: 'width 0.3s' }} />
                  <div style={{ width: `${s.overduePercent}%`, background: 'var(--danger-500)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span className="text-xs" style={{ color: 'var(--success-600)' }}>Al día: {fmt(s.healthyBalance)}</span>
                  <span className="text-xs" style={{ color: 'var(--danger-500)' }}>Vencida: {fmt(s.totalOverdue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Últimos pagos */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💰 Últimos Pagos Recibidos</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {d && d.recentPayments.length > 0 ? (
              d.recentPayments.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem',
                  borderBottom: i < d.recentPayments.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                  <div>
                    <div className="font-semibold text-sm">{p.associateName}</div>
                    <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>
                      {p.creditNumber} · {p.paymentMethod}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>{fmt(p.amount)}</div>
                    <div className="text-xs text-muted">{fmtDate(p.paymentDate)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin pagos recientes</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de créditos con cuotas vencidas */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⚠️ Créditos con Cuotas Vencidas ({d?.overdueList.length || 0})</span>
        </div>
        <div className="table-container">
          {d && d.overdueList.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asociado</th>
                  <th>N° Crédito</th>
                  <th>Cuotas Vencidas</th>
                  <th style={{ textAlign: 'right' }}>Monto Vencido</th>
                  <th>Días Mora</th>
                  <th>Vencimiento</th>
                  <th>Contacto</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {d.overdueList.map((item) => {
                  const severity = item.daysOverdue > 90 ? 'var(--danger-700)' : item.daysOverdue > 60 ? 'var(--danger-500)' : item.daysOverdue > 30 ? '#ea580c' : 'var(--warning-600)';
                  return (
                    <tr key={`${item.creditId}`}>
                      <td>
                        <div className="font-semibold text-sm">{item.name}</div>
                        <div className="text-xs text-muted">{item.document}</div>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.creditNumber}</span></td>
                      <td>
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          {item.overdueInstallments} cuota{item.overdueInstallments > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="font-semibold text-sm" style={{ color: 'var(--danger-500)' }}>{fmt(item.totalOverdue)}</span>
                      </td>
                      <td>
                        <span className="font-semibold text-sm" style={{ color: severity, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {item.daysOverdue} días
                        </span>
                      </td>
                      <td className="text-sm text-muted">{fmtDate(item.oldestDueDate)}</td>
                      <td>
                        {item.phone && (
                          <a href={`tel:${item.phone}`} className="text-sm" style={{ color: 'var(--primary-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={12} /> {item.phone}
                          </a>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/creditos/${item.creditId}`)}>
                          <Eye size={14} /> Ver Crédito
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
              <div className="empty-state-title">Sin créditos vencidos</div>
              <div className="empty-state-text">La cartera está al día, ¡excelente!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
