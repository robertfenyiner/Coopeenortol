'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Eye, Filter } from 'lucide-react';

interface AssociateRow {
  id: string;
  associateNumber: string;
  status: string;
  admissionDate: string | null;
  createdAt: string;
  person: {
    id: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    email: string | null;
    phone: string | null;
    mobilePhone: string | null;
  };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  RETIRADO: 'Retirado',
  SUSPENDIDO: 'Suspendido',
  PENDIENTE: 'Pendiente',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVO: 'badge-success',
  INACTIVO: 'badge-warning',
  RETIRADO: 'badge-danger',
  SUSPENDIDO: 'badge-danger',
  PENDIENTE: 'badge-info',
};

export default function AsociadosPage() {
  const router = useRouter();
  const [associates, setAssociates] = useState<AssociateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 15;

  const fetchAssociates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/asociados?${params}`);
      const json = await res.json();
      if (json.success) {
        setAssociates(json.data.data);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error('Error al cargar asociados:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAssociates(); }, [fetchAssociates]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Asociados</h1>
          <p className="page-subtitle">Gestión de asociados de la cooperativa</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/asociados/nuevo')}>
          <Plus size={16} /> Nuevo Asociado
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar por nombre, documento o número..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--gray-400)' }} />
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ minWidth: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="SUSPENDIDO">Suspendidos</option>
              <option value="RETIRADO">Retirados</option>
            </select>
            <span className="text-sm text-muted">{total} asociados</span>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : associates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No se encontraron asociados</div>
              <div className="empty-state-text">Registra un nuevo asociado para comenzar</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Asociado</th>
                  <th>Nombre Completo</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Fecha Ingreso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {associates.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="font-semibold" style={{ color: 'var(--primary-600)', fontFamily: 'monospace' }}>
                        {a.associateNumber}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold">
                        {a.person.firstName} {a.person.lastName} {a.person.secondLastName || ''}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{a.person.documentType}</div>
                      <div className="text-xs text-muted">{a.person.documentNumber}</div>
                    </td>
                    <td>
                      <div className="text-sm">{a.person.mobilePhone || a.person.phone || '—'}</div>
                      {a.person.email && <div className="text-xs text-muted">{a.person.email}</div>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[a.status] || 'badge-info'}`}>
                        <span className="badge-dot"></span>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {formatDate(a.admissionDate)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Ver detalle"
                          onClick={() => router.push(`/asociados/${a.id}`)}
                        >
                          <Eye size={15} />
                        </button>
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
