'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  userRoles: { role: { id: string; code: string; name: string } }[];
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/usuarios?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.data);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await fetch(`/api/usuarios/${id}`, { method: 'PATCH' });
      fetchUsers();
    } catch (e) {
      console.error('Error toggling user:', e);
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de usuarios del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/usuarios/nuevo')}>
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-sm text-muted">{total} usuarios</div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No se encontraron usuarios</div>
              <div className="empty-state-text">Agrega un nuevo usuario para comenzar</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-semibold">{u.firstName} {u.lastName}</div>
                      {u.phone && <div className="text-xs text-muted">{u.phone}</div>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {u.userRoles.map((ur) => (
                          <span key={ur.role.id} className="badge badge-info">{ur.role.name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot"></span>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-CO') : 'Nunca'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Editar"
                          onClick={() => router.push(`/usuarios/${u.id}`)}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={u.isActive ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggle(u.id)}
                          disabled={toggling === u.id}
                        >
                          {u.isActive ? <ToggleRight size={15} style={{ color: 'var(--success-500)' }} /> : <ToggleLeft size={15} />}
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
              Mostrando {(page - 1) * 15 + 1} - {Math.min(page * 15, total)} de {total}
            </div>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
