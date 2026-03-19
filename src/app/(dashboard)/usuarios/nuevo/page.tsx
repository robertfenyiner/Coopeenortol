'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleIds: [] as string[],
  });

  useEffect(() => {
    fetch('/api/roles?pageSize=50')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRoles(json.data.data.map((r: { id: string; code: string; name: string }) => ({ id: r.id, code: r.code, name: r.name })));
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/usuarios');
      } else {
        setError(json.error || json.details?.join(', ') || 'Error al crear usuario');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((r) => r !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Nuevo Usuario</h1>
            <p className="page-subtitle">Crear una nueva cuenta de usuario</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  placeholder="Nombre"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico *</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="correo@coopeenortol.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña *</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="Mínimo 8 caracteres, mayúscula, número, carácter especial"
              />
              <div className="text-xs text-muted mt-1">
                Debe contener al menos: 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roles *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                {roles.map((role) => (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--border-radius)',
                      border: `1.5px solid ${form.roleIds.includes(role.id) ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                      background: form.roleIds.includes(role.id) ? 'var(--primary-50)' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      style={{ display: 'none' }}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
              {form.roleIds.length === 0 && (
                <div className="form-error-text">Debe asignar al menos un rol</div>
              )}
            </div>
          </div>

          <div className="card-footer">
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || form.roleIds.length === 0}>
              <Save size={16} />
              {loading ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
