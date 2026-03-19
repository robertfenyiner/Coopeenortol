'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileSearch, Filter } from 'lucide-react';

interface AuditRow {
  id: string;
  action: string;
  module: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

const actionColors: Record<string, string> = {
  CREATE: 'badge-success',
  UPDATE: 'badge-info',
  DELETE: 'badge-danger',
  LOGIN: 'badge-success',
  LOGOUT: 'badge-neutral',
  LOGIN_FAILED: 'badge-danger',
  STATUS_CHANGE: 'badge-warning',
  ROLE_ASSIGN: 'badge-info',
  PASSWORD_CHANGE: 'badge-warning',
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (moduleFilter) params.set('module', moduleFilter);
      const res = await fetch(`/api/auditoria?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.data);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, moduleFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Bitácora de acciones del sistema</p>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar en bitácora..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="table-filters">
            <Filter size={14} style={{ color: 'var(--gray-400)' }} />
            <select
              className="form-input form-select"
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: '0.78rem', width: 'auto' }}
            >
              <option value="">Todos los módulos</option>
              <option value="auth">Autenticación</option>
              <option value="users">Usuarios</option>
              <option value="roles">Roles</option>
              <option value="params">Parametrización</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <FileSearch size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
              <div className="empty-state-title">Sin registros</div>
              <div className="empty-state-text">No se encontraron registros de auditoría</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('es-CO', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <div className="text-sm font-semibold">{log.user.firstName} {log.user.lastName}</div>
                          <div className="text-xs text-muted">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Sistema</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${actionColors[log.action] || 'badge-neutral'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-sm">{log.module}</td>
                    <td className="text-sm text-muted" style={{ maxWidth: '300px' }}>
                      <div className="truncate">{log.details || `${log.entity || ''} ${log.entityId || ''}`}</div>
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
              Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} de {total}
            </div>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
