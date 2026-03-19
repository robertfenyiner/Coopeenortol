'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Shield, ChevronRight } from 'lucide-react';

interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  _count: { userRoles: number };
  rolePermissions: { permission: { id: string; code: string; module: string; action: string; description: string } }[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/roles?${params}`);
      const json = await res.json();
      if (json.success) setRoles(json.data.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // Group permissions by module
  const groupedPerms = selectedRole
    ? selectedRole.rolePermissions.reduce((acc, rp) => {
        const mod = rp.permission.module;
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(rp.permission);
        return acc;
      }, {} as Record<string, { id: string; code: string; module: string; action: string; description: string }[]>)
    : {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles y Permisos</h1>
          <p className="page-subtitle">Gestión de roles del sistema y sus permisos asignados</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Roles List */}
        <div className="card">
          <div className="table-toolbar">
            <div className="table-search" style={{ maxWidth: '100%' }}>
              <Search className="table-search-icon" size={16} />
              <input
                className="table-search-input"
                placeholder="Buscar roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : (
            <div style={{ padding: '0 0.75rem 0.75rem' }}>
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    border: selectedRole?.id === role.id ? '1.5px solid var(--primary-500)' : '1.5px solid transparent',
                    background: selectedRole?.id === role.id ? 'var(--primary-50)' : 'transparent',
                    marginBottom: '0.25rem',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={16} style={{ color: 'var(--primary-500)' }} />
                      <span className="font-semibold" style={{ fontSize: '0.85rem' }}>{role.name}</span>
                      {role.isSystem && <span className="badge badge-neutral">Sistema</span>}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.15rem', marginLeft: '1.5rem' }}>
                      {role.code} · {role._count.userRoles} usuario(s) · {role.rolePermissions.length} permisos
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permissions Detail */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {selectedRole ? `Permisos: ${selectedRole.name}` : 'Selecciona un rol'}
            </span>
          </div>
          <div className="card-body">
            {!selectedRole ? (
              <div className="empty-state">
                <div className="empty-state-title">Selecciona un rol</div>
                <div className="empty-state-text">Haz clic en un rol para ver sus permisos</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedRole.description && (
                  <p className="text-sm text-muted">{selectedRole.description}</p>
                )}
                {Object.entries(groupedPerms).map(([module, perms]) => (
                  <div key={module}>
                    <div style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--gray-500)',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                      borderBottom: '1px solid var(--gray-100)',
                      paddingBottom: '0.3rem',
                    }}>
                      {module}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {perms.map((p) => (
                        <span key={p.id} className="badge badge-info" title={p.description}>
                          {p.action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
