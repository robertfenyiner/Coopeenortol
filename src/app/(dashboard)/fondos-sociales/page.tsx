'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  HeartHandshake,
  Percent,
  Plus,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react';

type FundType = 'EDUCACION' | 'SOLIDARIDAD' | 'BIENESTAR' | 'RESERVA_LEGAL' | 'OTRO';

interface SocialFund {
  id: string;
  code: string;
  name: string;
  description: string | null;
  fundType: FundType;
  surplusDistributionPct: string;
  currentBalance: string;
  isActive: boolean;
}

interface SocialFundsPayload {
  data: SocialFund[];
  totals: {
    activeDistributionPct: number;
    activeBalance: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FundFormState {
  code: string;
  name: string;
  description: string;
  fundType: FundType;
  surplusDistributionPct: number;
  isActive: boolean;
}

const EMPTY_FORM: FundFormState = {
  code: '',
  name: '',
  description: '',
  fundType: 'EDUCACION',
  surplusDistributionPct: 0,
  isActive: true,
};

const FUND_TYPE_LABELS: Record<FundType, string> = {
  EDUCACION: 'Educacion',
  SOLIDARIDAD: 'Solidaridad',
  BIENESTAR: 'Bienestar',
  RESERVA_LEGAL: 'Reserva Legal',
  OTRO: 'Otro',
};

function formatCurrency(value: string | number) {
  return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function formatPct(value: string | number) {
  return `${Number(value).toFixed(2)}%`;
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return response.json() as Promise<ApiResponse<T>>;
}

export default function SocialFundsPage() {
  const [funds, setFunds] = useState<SocialFund[]>([]);
  const [totals, setTotals] = useState({ activeDistributionPct: 0, activeBalance: 0 });
  const [search, setSearch] = useState('');
  const [fundType, setFundType] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFund, setEditingFund] = useState<SocialFund | null>(null);
  const [form, setForm] = useState<FundFormState>(EMPTY_FORM);

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (search) params.set('search', search);
      if (fundType) params.set('fundType', fundType);
      const response = await fetch(`/api/fondos-sociales?${params}`);
      const json = await parseApiResponse<SocialFundsPayload>(response);
      if (json.success && json.data) {
        setFunds(json.data.data);
        setTotals(json.data.totals);
      } else {
        setMessage(json.error || 'No se pudieron cargar los fondos sociales');
      }
    } finally {
      setLoading(false);
    }
  }, [fundType, search]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  function openCreateModal() {
    setEditingFund(null);
    setForm(EMPTY_FORM);
    setMessage(null);
    setShowModal(true);
  }

  function openEditModal(fund: SocialFund) {
    setEditingFund(fund);
    setForm({
      code: fund.code,
      name: fund.name,
      description: fund.description || '',
      fundType: fund.fundType,
      surplusDistributionPct: Number(fund.surplusDistributionPct),
      isActive: fund.isActive,
    });
    setMessage(null);
    setShowModal(true);
  }

  async function handleSubmit() {
    setMessage(null);
    const payload = {
      name: form.name,
      description: form.description || null,
      fundType: form.fundType,
      surplusDistributionPct: form.surplusDistributionPct,
      ...(editingFund ? { isActive: form.isActive } : { code: form.code }),
    };
    const response = await fetch(editingFund ? `/api/fondos-sociales/${editingFund.id}` : '/api/fondos-sociales', {
      method: editingFund ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseApiResponse<SocialFund>(response);
    if (!json.success) {
      setMessage(json.error || 'No se pudo guardar el fondo social');
      return;
    }
    setShowModal(false);
    await fetchFunds();
  }

  const remainingPct = 100 - totals.activeDistributionPct;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fondos Sociales</h1>
          <p className="page-subtitle">Definicion de fondos y porcentajes para distribuir excedentes anuales</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Nuevo fondo
        </button>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><HeartHandshake size={22} /></div>
          <div><div className="stat-value">{funds.length}</div><div className="stat-label">Fondos configurados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Percent size={22} /></div>
          <div><div className="stat-value">{formatPct(totals.activeDistributionPct)}</div><div className="stat-label">Distribucion activa</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Wallet size={22} /></div>
          <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(totals.activeBalance)}</div><div className="stat-label">Saldo total activo</div></div>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar codigo, nombre o descripcion..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="form-input form-select"
            value={fundType}
            onChange={(event) => setFundType(event.target.value)}
            style={{ maxWidth: '220px' }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(FUND_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem', color: remainingPct < 0 ? 'var(--danger-600)' : 'var(--gray-600)', fontWeight: 600 }}>
          Porcentaje disponible para asignar: {formatPct(remainingPct)}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : funds.length === 0 ? (
            <div className="empty-state">
              <HeartHandshake className="empty-state-icon" />
              <div className="empty-state-title">No hay fondos sociales registrados</div>
              <div className="empty-state-text">Crea los fondos para distribuir excedentes de la cooperativa</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fondo</th>
                  <th>Tipo</th>
                  <th className="text-right">Distribucion</th>
                  <th className="text-right">Saldo</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.id}>
                    <td>
                      <div className="font-semibold">{fund.code}</div>
                      <div>{fund.name}</div>
                      {fund.description && <div className="text-xs text-muted">{fund.description}</div>}
                    </td>
                    <td>{FUND_TYPE_LABELS[fund.fundType]}</td>
                    <td className="text-right font-semibold">{formatPct(fund.surplusDistributionPct)}</td>
                    <td className="text-right font-semibold">{formatCurrency(fund.currentBalance)}</td>
                    <td>
                      <span className={`badge ${fund.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {fund.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {fund.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(fund)} title="Editar fondo">
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingFund ? 'Editar fondo' : 'Nuevo fondo social'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Codigo</label>
                  <input
                    className="form-input"
                    value={form.code}
                    disabled={Boolean(editingFund)}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-input form-select"
                    value={form.fundType}
                    onChange={(event) => setForm((prev) => ({ ...prev, fundType: event.target.value as FundType }))}
                  >
                    {Object.entries(FUND_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Descripcion</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div style={{ maxWidth: '260px' }}>
                <div className="form-group">
                  <label className="form-label">Distribucion de excedentes (%)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.surplusDistributionPct}
                    onChange={(event) => setForm((prev) => ({ ...prev, surplusDistributionPct: Number(event.target.value) }))}
                  />
                </div>
              </div>
              {editingFund && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Fondo activo
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
