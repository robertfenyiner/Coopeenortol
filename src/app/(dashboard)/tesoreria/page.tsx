'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Banknote,
  ArrowUpDown,
  FileCheck,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Vault,
} from 'lucide-react';

interface TreasurySummary {
  bankAccounts: Array<{
    id: string;
    code: string;
    bankName: string;
    accountNumber: string;
    accountType: string;
    currentBalance: number;
  }>;
  cashRegisters: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    currentBalance: number;
  }>;
  pendingTransactions: number;
  recentReconciliations: Array<{
    id: string;
    reconciliationNumber: string;
    status: string;
    periodYear: number;
    periodMonth: number;
    bankBalance: number;
    bookBalance: number;
    bankAccount: { code: string; bankName: string };
  }>;
  totals: {
    totalBankBalance: number;
    totalCashBalance: number;
    totalLiquidity: number;
    openCashRegisters: number;
    totalBankAccounts: number;
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const statusColors: Record<string, string> = {
  EN_PROCESO: 'var(--warning)',
  COMPLETADA: 'var(--success)',
  CANCELADA: 'var(--danger)',
  ABIERTA: 'var(--success)',
  CERRADA: 'var(--gray-400)',
};

export default function TreasuryPage() {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tesoreria?view=summary');
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!summary) {
    return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Error cargando datos de tesorería</div>;
  }

  const { totals, bankAccounts, cashRegisters, pendingTransactions, recentReconciliations } = summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Tesorería</h1>
          <p style={{ color: 'var(--gray-400)', margin: '0.25rem 0 0' }}>
            Gestión de cuentas bancarias, conciliación y cajas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/tesoreria/cuentas" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <Building2 size={16} /> Cuentas
          </Link>
          <Link href="/tesoreria/movimientos" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <ArrowUpDown size={16} /> Movimientos
          </Link>
          <Link href="/tesoreria/conciliacion" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <FileCheck size={16} /> Conciliación
          </Link>
          <Link href="/tesoreria/cajas" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <Vault size={16} /> Cajas
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Liquidez Total</span>
            <span className="stat-value">{fmt(totals.totalLiquidity)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Banknote size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Saldo Bancario</span>
            <span className="stat-value">{fmt(totals.totalBankBalance)}</span>
            <span className="stat-change positive">{totals.totalBankAccounts} cuentas activas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            <Vault size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Saldo en Cajas</span>
            <span className="stat-value">{fmt(totals.totalCashBalance)}</span>
            <span className="stat-change">{totals.openCashRegisters} cajas abiertas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <ArrowUpDown size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Txs Pendientes</span>
            <span className="stat-value">{pendingTransactions}</span>
            <span className="stat-change">Por conciliar</span>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Bank Accounts */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} /> Cuentas Bancarias
            </h3>
            <Link href="/tesoreria/cuentas" style={{ fontSize: '0.85rem' }}>Ver todas →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {bankAccounts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                No hay cuentas bancarias registradas
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{acc.bankName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>****{acc.accountNumber.slice(-4)}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: acc.accountType === 'CORRIENTE' ? 'var(--primary-alpha)' : 'var(--info-alpha)', color: acc.accountType === 'CORRIENTE' ? 'var(--primary)' : 'var(--info)' }}>
                          {acc.accountType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(Number(acc.currentBalance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cash Registers */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Vault size={18} /> Cajas
            </h3>
            <Link href="/tesoreria/cajas" style={{ fontSize: '0.85rem' }}>Ver todas →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {cashRegisters.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                No hay cajas registradas
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Caja</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {cashRegisters.map((cr) => (
                    <tr key={cr.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{cr.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{cr.code}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: cr.status === 'ABIERTA' ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)', color: statusColors[cr.status] || 'var(--gray-400)' }}>
                          {cr.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(Number(cr.currentBalance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Recent Reconciliations */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={18} /> Conciliaciones Recientes
          </h3>
          <Link href="/tesoreria/conciliacion" style={{ fontSize: '0.85rem' }}>Ver todas →</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentReconciliations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
              No hay conciliaciones registradas
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Banco</th>
                  <th>Período</th>
                  <th style={{ textAlign: 'right' }}>Saldo Banco</th>
                  <th style={{ textAlign: 'right' }}>Saldo Libros</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentReconciliations.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>{rec.reconciliationNumber}</td>
                    <td>{rec.bankAccount.bankName}</td>
                    <td>{monthNames[rec.periodMonth]} {rec.periodYear}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(Number(rec.bankBalance))}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(Number(rec.bookBalance))}</td>
                    <td>
                      <span className="badge" style={{ background: rec.status === 'COMPLETADA' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: statusColors[rec.status] || 'var(--gray-400)' }}>
                        {rec.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
