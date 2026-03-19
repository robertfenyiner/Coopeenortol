'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas. Verifique su correo y contraseña.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-principal.jpg" alt="Coopeenortol" />
          <h1>Coopeenortol</h1>
          <p>Sistema de Gestión de Cooperativa</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="usuario@coopeenortol.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }}></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
          © 2026 Coopeenortol · v1.0.0
        </p>
      </div>
    </div>
  );
}
