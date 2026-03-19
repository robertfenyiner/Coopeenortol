'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, TrendingUp, CreditCard, AlertTriangle,
  DollarSign, ArrowUpRight, ArrowDownRight, UserPlus,
  Landmark, Clock, CheckCircle,
} from 'lucide-react';

interface DashboardData {
  associates: {
    total: number;
    active: number;
    pending: number;
    newThisMonth: number;
  };
  savings: {
    totalBalance: number;
    contributionsThisMonth: number;
    contributionsCount: number;
    growthPercent: number;
  };
  credits: {
    active: number;
    pendingRequests: number;
    overdue: number;
    totalOutstanding: number;
    disbursedThisMonth: number;
    disbursedCount: number;
  };
  recentActivity: {
    contributions: Array<{ id: string; type: string; amount: number; associateName: string; date: string }>;
    credits: Array<{ id: string; creditNumber: string; creditLine: string; status: string; amount: number; associateName: string; date: string }>;
  };
}

const TYPE_LABELS: Record<string, string> = {
  ORDINARIO: 'Ordinario', EXTRAORDINARIO: 'Extraordinario',
  CUOTA_INGRESO: 'Cuota Ingreso', AHORRO_VOLUNTARIO: 'Ahorro Vol.',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SOLICITUD: { label: 'Solicitud', color: 'var(--warning-500)' },
  APROBADO: { label: 'Aprobado', color: 'var(--success-500)' },
  VIGENTE: { label: 'Vigente', color: 'var(--success-600)' },
  VENCIDO: { label: 'Vencido', color: 'var(--danger-500)' },
  PAGADO: { label: 'Pagado', color: 'var(--gray-500)' },
  RECHAZADO: { label: 'Rechazado', color: 'var(--danger-500)' },
};

const LINE_LABELS: Record<string, string> = {
  LIBRE_INVERSION: 'Libre Inv.', EDUCACION: 'Educación', VIVIENDA: 'Vivienda',
  VEHICULO: 'Vehículo', CALAMIDAD: 'Calamidad',
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fmt = (v: number) => `$ ${v.toLocaleString('es-CO')}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="loading-center"><div className="loading-spinner"></div></div>;
  }

  const d = data!;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Bienvenido, {user?.firstName}. Resumen operativo de la cooperativa.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/asociados')}>
          <div className="stat-icon blue"><Users size={22} /></div>
          <div>
            <div className="stat-value">{d?.associates.active ?? 0}</div>
            <div className="stat-label">Asociados Activos</div>
            {d && d.associates.pending > 0 && (
              <div className="text-xs" style={{ color: 'var(--warning-500)', marginTop: '2px' }}>
                {d.associates.pending} pendientes
              </div>
            )}
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/aportes')}>
          <div className="stat-icon green"><TrendingUp size={22} /></div>
          <div>
            <div className="stat-value">{d ? fmt(d.savings.contributionsThisMonth) : '—'}</div>
            <div className="stat-label">Aportes del Mes</div>
            {d && (
              <div className="text-xs" style={{
                color: d.savings.growthPercent >= 0 ? 'var(--success-600)' : 'var(--danger-500)',
                marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px'
              }}>
                {d.savings.growthPercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(d.savings.growthPercent)}% vs mes anterior
              </div>
            )}
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/creditos')}>
          <div className="stat-icon amber"><CreditCard size={22} /></div>
          <div>
            <div className="stat-value">{d ? fmt(d.credits.totalOutstanding) : '—'}</div>
            <div className="stat-label">Cartera de Créditos</div>
            <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
              {d?.credits.active ?? 0} créditos vigentes
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div>
            <div className="stat-value" style={{ color: (d?.credits.overdue ?? 0) > 0 ? 'var(--danger-500)' : undefined }}>
              {d?.credits.overdue ?? 0}
            </div>
            <div className="stat-label">Créditos Vencidos</div>
            {d && d.credits.pendingRequests > 0 && (
              <div className="text-xs" style={{ color: 'var(--warning-500)', marginTop: '2px' }}>
                {d.credits.pendingRequests} solicitudes pendientes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: DollarSign, label: 'Total Ahorros', value: d ? fmt(d.savings.totalBalance) : '—', color: 'var(--primary-600)', bg: 'var(--primary-50)' },
          { icon: UserPlus, label: 'Nuevos este Mes', value: String(d?.associates.newThisMonth ?? 0), color: 'var(--success-600)', bg: 'var(--success-50)' },
          { icon: Landmark, label: 'Desembolsos del Mes', value: d ? fmt(d.credits.disbursedThisMonth) : '—', color: 'var(--info-600)', bg: 'var(--info-50, #eff6ff)' },
          { icon: CheckCircle, label: 'Aportes registrados', value: `${d?.savings.contributionsCount ?? 0}`, color: 'var(--success-600)', bg: 'var(--success-50)' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-xs text-muted">{item.label}</div>
              <div className="font-semibold" style={{ fontSize: '0.95rem', color: item.color }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
        {/* Últimos aportes */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💰 Últimos Aportes</span>
            <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/aportes')}>Ver todos</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {d && d.recentActivity.contributions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {d.recentActivity.contributions.map((c, i) => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 1rem',
                    borderBottom: i < d.recentActivity.contributions.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  }}>
                    <div>
                      <div className="font-semibold text-sm">{c.associateName}</div>
                      <div className="text-xs text-muted">{TYPE_LABELS[c.type] || c.type} · {fmtDate(c.date)}</div>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin aportes recientes</div>
            )}
          </div>
        </div>

        {/* Últimos créditos */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏦 Últimos Créditos</span>
            <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/creditos')}>Ver todos</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {d && d.recentActivity.credits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {d.recentActivity.credits.map((c, i) => {
                  const st = STATUS_LABELS[c.status] || { label: c.status, color: 'var(--gray-400)' };
                  return (
                    <div key={c.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.65rem 1rem', cursor: 'pointer',
                        borderBottom: i < d.recentActivity.credits.length - 1 ? '1px solid var(--gray-100)' : 'none',
                      }}
                      onClick={() => router.push(`/creditos/${c.id}`)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{c.associateName}</div>
                        <div className="text-xs text-muted">
                          <span style={{ fontFamily: 'monospace' }}>{c.creditNumber}</span>
                          {' · '}{LINE_LABELS[c.creditLine] || c.creditLine}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="font-semibold text-sm">{fmt(c.amount)}</div>
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: st.color, color: 'white' }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sin créditos recientes</div>
            )}
          </div>
        </div>

        {/* Sesión + módulos */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">👤 Tu Sesión</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Usuario</span>
                <span className="font-semibold">{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Nombre</span>
                <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Roles</span>
                <div className="flex gap-1">
                  {user?.roles?.map((role) => (
                    <span key={role} className="badge badge-info">{role}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚡ Accesos Rápidos</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Nuevo Asociado', href: '/asociados/nuevo', icon: UserPlus, color: 'var(--primary-500)' },
                { label: 'Registrar Aporte', href: '/aportes/nuevo', icon: DollarSign, color: 'var(--success-500)' },
                { label: 'Solicitar Crédito', href: '/creditos/nuevo', icon: Landmark, color: 'var(--info-500)' },
                { label: 'Ver Auditoría', href: '/auditoria', icon: Clock, color: 'var(--gray-500)' },
              ].map((item) => (
                <button key={item.href} className="btn btn-ghost" onClick={() => router.push(item.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', padding: '0.6rem 0.75rem', fontSize: '0.8rem' }}>
                  <item.icon size={16} style={{ color: item.color }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
