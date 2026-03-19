'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, Eye, Landmark } from 'lucide-react';

interface CreditRow {
  id: string;
  creditNumber: string;
  creditLine: string;
  status: string;
  requestedAmount: string;
  approvedAmount: string | null;
  outstandingBalance: string;
  termMonths: number;
  interestRate: string;
  requestDate: string;
  associate: {
    associateNumber: string;
    person: { firstName: string; lastName: string; secondLastName: string | null; documentNumber: string };
  };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  SOLICITUD: { label: 'Solicitud', cls: 'badge-warning' },
  EN_EVALUACION: { label: 'En Evaluación', cls: 'badge-info' },
  APROBADO: { label: 'Aprobado', cls: 'badge-success' },
  RECHAZADO: { label: 'Rechazado', cls: 'badge-danger' },
  DESEMBOLSADO: { label: 'Desembolsado', cls: 'badge-info' },
  VIGENTE: { label: 'Vigente', cls: 'badge-success' },
  VENCIDO: { label: 'Vencido', cls: 'badge-danger' },
  PAGADO: { label: 'Pagado', cls: 'badge-secondary' },
  CASTIGADO: { label: 'Castigado', cls: 'badge-danger' },
};

const LINE_LABELS: Record<string, string> = {
  LIBRE_INVERSION: 'Libre Inversión',
  EDUCACION: 'Educación',
  VIVIENDA: 'Vivienda',
  VEHICULO: 'Vehículo',
  CALAMIDAD: 'Calamidad',
};

export default function CreditosPage() {
  const router = useRouter();
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/creditos?${params}`);
      const json = await res.json();
      if (json.success) { setCredits(json.data.data); setTotal(json.data.total); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);
  const totalPages = Math.ceil(total / pageSize);
  const fmt = (v: string | number) => `$ ${Number(v).toLocaleString('es-CO')}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Créditos</h1>
          <p className="page-subtitle">Gestión de solicitudes y operaciones de crédito</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/creditos/nuevo')}>
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input className="table-search-input" placeholder="Buscar por asociado, documento o N° crédito..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--gray-400)' }} />
            <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ minWidth: '150px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([code, { label }]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : credits.length === 0 ? (
            <div className="empty-state">
              <Landmark size={48} style={{ color: 'var(--gray-300)', marginBottom: '0.5rem' }} />
              <div className="empty-state-title">Sin créditos registrados</div>
              <div className="empty-state-text">Cree una nueva solicitud de crédito</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Crédito</th>
                  <th>Asociado</th>
                  <th>Línea</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Monto Solicitado</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th>Plazo</th>
                  <th>Tasa</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => {
                  const st = STATUS_LABELS[c.status] || { label: c.status, cls: 'badge-secondary' };
                  return (
                    <tr key={c.id}>
                      <td><span className="font-semibold text-sm" style={{ fontFamily: 'monospace' }}>{c.creditNumber}</span></td>
                      <td>
                        <div className="font-semibold text-sm">{c.associate.person.firstName} {c.associate.person.lastName}</div>
                        <div className="text-xs text-muted">{c.associate.associateNumber}</div>
                      </td>
                      <td><span className="text-sm">{LINE_LABELS[c.creditLine] || c.creditLine}</span></td>
                      <td><span className={`badge ${st.cls}`} style={{ fontSize: '0.7rem' }}>{st.label}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="font-semibold text-sm">{fmt(c.requestedAmount)}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="text-sm" style={{ color: Number(c.outstandingBalance) > 0 ? 'var(--danger-500)' : 'var(--success-600)' }}>
                          {fmt(c.outstandingBalance)}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{c.termMonths} meses</td>
                      <td className="text-sm text-muted">{Number(c.interestRate).toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/creditos/${c.id}`)}>
                          <Eye size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}</div>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
