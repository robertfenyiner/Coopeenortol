'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { User, Lock, Save, CheckCircle, Shield } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  roles: Array<{ name: string; code: string }>;
}

export default function PerfilPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Datos editables
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/perfil');
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setFirstName(json.data.firstName);
        setLastName(json.data.lastName);
        setPhone(json.data.phone || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const saveInfo = async () => {
    setSaving(true); setInfoMsg('');
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      const json = await res.json();
      if (json.success) setInfoMsg('Datos actualizados correctamente');
      else setInfoMsg(json.error || 'Error al actualizar');
    } catch (e) { setInfoMsg('Error de conexión'); console.error(e); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    setPwdMsg(''); setPwdSuccess(false);
    if (newPassword !== confirmPassword) { setPwdMsg('Las contraseñas no coinciden'); return; }
    if (newPassword.length < 8) { setPwdMsg('Mínimo 8 caracteres'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setPwdSuccess(true);
        setPwdMsg('Contraseña actualizada correctamente');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setPwdMsg(json.error || 'Error');
      }
    } catch (e) { setPwdMsg('Error de conexión'); console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-center"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Perfil</h1>
          <p className="page-subtitle">Gestiona tu información personal y seguridad</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Panel lateral */}
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem', color: 'white', fontWeight: 700 }}>
            {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
          </div>
          <div className="font-semibold" style={{ fontSize: '1.05rem' }}>{profile?.firstName} {profile?.lastName}</div>
          <div className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>{profile?.email}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginBottom: '1rem' }}>
            {profile?.roles.map((r) => (
              <span key={r.code} className="badge badge-info" style={{ fontSize: '0.7rem' }}>{r.name}</span>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
            <div className="text-muted" style={{ marginBottom: '0.25rem' }}>Registrado</div>
            <div className="text-sm">{profile?.createdAt ? fmtDate(profile.createdAt) : '—'}</div>
            {profile?.lastLoginAt && (
              <>
                <div className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>Último acceso</div>
                <div className="text-sm">{fmtDate(profile.lastLoginAt)}</div>
              </>
            )}
          </div>
        </div>

        {/* Panel principal */}
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', padding: '0 1rem' }}>
            {([['info', 'Información Personal', User], ['password', 'Cambiar Contraseña', Lock]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === key ? '2px solid var(--primary-500)' : '2px solid transparent',
                  color: activeTab === key ? 'var(--primary-600)' : 'var(--gray-500)',
                  fontWeight: activeTab === key ? 600 : 400, fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'info' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellido *</label>
                    <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input style={{ ...inputStyle, background: 'var(--gray-50)', color: 'var(--gray-400)' }} value={profile?.email || ''} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 ..." />
                  </div>
                </div>

                {infoMsg && (
                  <div style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
                    background: 'var(--success-50)', border: '1px solid var(--success-200)', color: 'var(--success-700)', fontSize: '0.85rem' }}>
                    {infoMsg}
                  </div>
                )}

                <button className="btn btn-primary" onClick={saveInfo} disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                {/* Permisos */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                    <Shield size={16} style={{ color: 'var(--gray-500)' }} />
                    <span className="font-semibold text-sm">Permisos Asignados</span>
                    <span className="text-xs text-muted">({session?.user?.permissions?.length || 0})</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {session?.user?.permissions?.sort().map((p) => (
                      <span key={p} style={{ padding: '0.15rem 0.4rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                        borderRadius: '4px', fontSize: '0.7rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div style={{ maxWidth: '400px' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Contraseña Actual *</label>
                  <input type="password" style={inputStyle} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Nueva Contraseña *</label>
                  <input type="password" style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Confirmar Contraseña *</label>
                  <input type="password" style={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>

                {pwdMsg && (
                  <div style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem',
                    background: pwdSuccess ? 'var(--success-50)' : 'var(--danger-50)',
                    border: `1px solid ${pwdSuccess ? 'var(--success-200)' : 'var(--danger-200)'}`,
                    color: pwdSuccess ? 'var(--success-700)' : 'var(--danger-700)',
                    display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pwdSuccess && <CheckCircle size={14} />} {pwdMsg}
                  </div>
                )}

                <button className="btn btn-primary" onClick={changePassword} disabled={saving || !currentPassword || !newPassword}>
                  <Lock size={16} /> {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
