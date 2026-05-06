'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, DollarSign, Calendar, Filter, Ban } from 'lucide-react';

interface ContributionRow {
  id: string;
  type: string;
  amount: string;
  periodYear: number | null;
  periodMonth: number | null;
  paymentMethod: string | null;
  reference: string | null;
  status: string;
  createdAt: string;
  associate: {
    associateNumber: string;
    person: {
      firstName: string;
      lastName: string;
      secondLastName: string | null;
      documentNumber: string;
    };
  };
}

const TYPE_LABELS: Record<string, string> = {
  ORDINARIO: 'Ordinario',
  EXTRAORDINARIO: 'Extraordinario',
  CUOTA_INGRESO: 'Cuota de Ingreso',
  AHORRO_VOLUNTARIO: 'Ahorro Voluntario',
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AportesPage() {
  const router = useRouter();
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 20;

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/aportes?${params}`);
      const json = await res.json();
      if (json.success) {
        setContributions(json.data.data);
        setTotal(json.data.total);
        setTotalAmount(json.data.totalAmount);
      }
    } catch (e) {
      console.error('Error al cargar aportes:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);

  const totalPages = Math.ceil(total / pageSize);

  const formatCurrency = (val: string | number) => {
    return `$ ${Number(val).toLocaleString('es-CO')}`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleVoid = async (id: string) => {
    if (!confirm('¿Está seguro de anular este aporte? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/aportes/${id}`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) fetchContributions();
      else alert(json.error || 'Error al anular');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Aportes</h1>
          <p className="page-subtitle">Registro y consulta de aportes de los asociados</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/aportes/nuevo')}>
          <Plus size={16} /> Registrar Aporte
        </button>
      </div>

      {/* Totalizador */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div>
            <div className="text-xs text-muted">Total Recaudado (filtro actual)</div>
            <div className="font-semibold" style={{ fontSize: '1.2rem', color: 'var(--primary-600)' }}>{formatCurrency(totalAmount)}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--success-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} style={{ color: 'var(--success-600)' }} />
          </div>
          <div>
            <div className="text-xs text-muted">Aportes Registrados</div>
            <div className="font-semibold" style={{ fontSize: '1.2rem' }}>{total}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar por asociado, documento o referencia..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--gray-400)' }} />
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              style={{ minWidth: '160px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}
            >
              <option value="">Todos los tipos</option>
              <option value="ORDINARIO">Ordinario</option>
              <option value="EXTRAORDINARIO">Extraordinario</option>
              <option value="CUOTA_INGRESO">Cuota de Ingreso</option>
              <option value="AHORRO_VOLUNTARIO">Ahorro Voluntario</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : contributions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No se encontraron aportes</div>
              <div className="empty-state-text">Registre un nuevo aporte para comenzar</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asociado</th>
                  <th>Tipo</th>
                  <th>Período</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} style={{ opacity: c.status === 'ANULADO' ? 0.5 : 1 }}>
                    <td className="text-sm">{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="font-semibold text-sm">
                        {c.associate.person.firstName} {c.associate.person.lastName}
                      </div>
                      <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>
                        {c.associate.associateNumber}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {TYPE_LABELS[c.type] || c.type}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {c.periodYear && c.periodMonth
                        ? `${MONTH_NAMES[c.periodMonth - 1]} ${c.periodYear}`
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-semibold" style={{ color: c.status === 'ANULADO' ? 'var(--danger-500)' : 'var(--success-600)' }}>
                        {c.status === 'ANULADO' && <span style={{ textDecoration: 'line-through' }}>{formatCurrency(c.amount)}</span>}
                        {c.status !== 'ANULADO' && formatCurrency(c.amount)}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{c.paymentMethod || '—'}</td>
                    <td className="text-sm text-muted">{c.reference || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        {c.status === 'APLICADO' && (
                          <button className="btn btn-ghost btn-sm" title="Anular" onClick={() => handleVoid(c.id)}
                            style={{ color: 'var(--danger-500)' }}>
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}
            </div>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
