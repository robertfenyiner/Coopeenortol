'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Landmark,
  PiggyBank,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';

interface CdatProduct {
  id: string;
  code: string;
  name: string;
  minAmount: string;
  maxAmount: string | null;
  minTermDays: number;
  maxTermDays: number | null;
  annualRate: string;
  interestMode: string;
  withholdingRate: string;
}

interface AssociateOption {
  id: string;
  associateNumber: string;
  person: {
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    documentNumber: string;
  };
}

interface CdatInvestment {
  id: string;
  certificateNumber: string;
  principalAmount: string;
  annualRate: string;
  termDays: number;
  startDate: string;
  maturityDate: string;
  expectedInterest: string;
  withholdingAmount: string;
  netInterest: string;
  status: string;
  product: CdatProduct;
  associate: AssociateOption;
  movements?: Array<{
    id: string;
    movementType: string;
    principalAmount: string;
    interestAmount: string;
    withholdingAmount: string;
    netAmount: string;
    performedAt: string;
    observations: string | null;
  }>;
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVO: 'badge-info',
  VENCIDO: 'badge-warning',
  LIQUIDADO: 'badge-success',
  CANCELADO: 'badge-danger',
};

function formatCurrency(value: string | number) {
  return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fullName(associate: AssociateOption) {
  return `${associate.person.firstName} ${associate.person.lastName} ${associate.person.secondLastName || ''}`.trim();
}

export default function CdatsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [investments, setInvestments] = useState<CdatInvestment[]>([]);
  const [products, setProducts] = useState<CdatProduct[]>([]);
  const [associates, setAssociates] = useState<AssociateOption[]>([]);
  const [selected, setSelected] = useState<CdatInvestment | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    description: '',
    minAmount: 500000,
    maxAmount: 50000000,
    minTermDays: 90,
    maxTermDays: 720,
    annualRate: 10,
    interestMode: 'SIMPLE',
    paymentFrequency: 'VENCIMIENTO',
    withholdingRate: 0,
  });

  const [investmentForm, setInvestmentForm] = useState({
    associateId: '',
    productId: '',
    principalAmount: 1000000,
    termDays: 180,
    startDate: today,
    renewalPolicy: 'NO_RENUEVA',
    observations: '',
  });

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/cdat-productos');
    const json = await res.json();
    if (json.success) {
      setProducts(json.data);
      if (!investmentForm.productId && json.data[0]) {
        setInvestmentForm((prev) => ({ ...prev, productId: json.data[0].id, termDays: json.data[0].minTermDays }));
      }
    }
  }, [investmentForm.productId]);

  const fetchAssociates = useCallback(async () => {
    const res = await fetch('/api/asociados?pageSize=100&status=ACTIVO');
    const json = await res.json();
    if (json.success) {
      setAssociates(json.data.data);
      if (!investmentForm.associateId && json.data.data[0]) {
        setInvestmentForm((prev) => ({ ...prev, associateId: json.data.data[0].id }));
      }
    }
  }, [investmentForm.associateId]);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/cdats?${params}`);
      const json = await res.json();
      if (json.success) setInvestments(json.data.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchAssociates(); }, [fetchAssociates]);
  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  async function handleCreateProduct() {
    setMessage(null);
    const res = await fetch('/api/cdat-productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear el producto');
    setShowProductModal(false);
    setProductForm({
      code: '',
      name: '',
      description: '',
      minAmount: 500000,
      maxAmount: 50000000,
      minTermDays: 90,
      maxTermDays: 720,
      annualRate: 10,
      interestMode: 'SIMPLE',
      paymentFrequency: 'VENCIMIENTO',
      withholdingRate: 0,
    });
    await fetchProducts();
  }

  async function handleCreateInvestment() {
    setMessage(null);
    const res = await fetch('/api/cdats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(investmentForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo constituir el CDAT');
    setShowInvestmentModal(false);
    await fetchInvestments();
  }

  async function handleAction(investment: CdatInvestment, action: 'mark_matured' | 'redeem' | 'cancel') {
    const res = await fetch(`/api/cdats/${investment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo ejecutar la acción');
    await fetchInvestments();
    if (selected?.id === investment.id) setSelected(json.data);
  }

  async function handleOpenDetail(investment: CdatInvestment) {
    const res = await fetch(`/api/cdats/${investment.id}`);
    const json = await res.json();
    if (json.success) setSelected(json.data);
  }

  const activePrincipal = investments
    .filter((item) => item.status === 'ACTIVO')
    .reduce((sum, item) => sum + Number(item.principalAmount), 0);
  const projectedInterest = investments.reduce((sum, item) => sum + Number(item.netInterest), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CDATs</h1>
          <p className="page-subtitle">Inversiones a plazo fijo, proyección de intereses y liquidación</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowProductModal(true)}>
            <Landmark size={16} /> Producto
          </button>
          <button className="btn btn-primary" onClick={() => setShowInvestmentModal(true)} disabled={products.length === 0 || associates.length === 0}>
            <Plus size={16} /> Constituir CDAT
          </button>
        </div>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><PiggyBank size={22} /></div>
          <div><div className="stat-value">{investments.length}</div><div className="stat-label">Certificados recientes</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Banknote size={22} /></div>
          <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(activePrincipal)}</div><div className="stat-label">Capital activo</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><CircleDollarSign size={22} /></div>
          <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(projectedInterest)}</div><div className="stat-label">Interés neto proyectado</div></div>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar certificado, asociado o documento..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="form-input form-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ maxWidth: '220px' }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="VENCIDO">Vencido</option>
            <option value="LIQUIDADO">Liquidado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : investments.length === 0 ? (
            <div className="empty-state">
              <PiggyBank className="empty-state-icon" />
              <div className="empty-state-title">No hay CDATs registrados</div>
              <div className="empty-state-text">Crea un producto y constituye la primera inversión</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Certificado</th>
                  <th>Asociado</th>
                  <th>Producto</th>
                  <th>Vencimiento</th>
                  <th className="text-right">Capital</th>
                  <th className="text-right">Interés neto</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((investment) => (
                  <tr key={investment.id}>
                    <td>
                      <div className="font-semibold">{investment.certificateNumber}</div>
                      <div className="text-xs text-muted">{investment.termDays} días · {Number(investment.annualRate).toFixed(2)}% EA</div>
                    </td>
                    <td>
                      <div>{fullName(investment.associate)}</div>
                      <div className="text-xs text-muted">{investment.associate.associateNumber}</div>
                    </td>
                    <td>{investment.product.name}</td>
                    <td>{formatDate(investment.maturityDate)}</td>
                    <td className="text-right font-semibold">{formatCurrency(investment.principalAmount)}</td>
                    <td className="text-right">{formatCurrency(investment.netInterest)}</td>
                    <td><span className={`badge ${STATUS_BADGES[investment.status] || 'badge-neutral'}`}>{investment.status}</span></td>
                    <td className="text-right">
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Ver detalle" onClick={() => handleOpenDetail(investment)}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Marcar vencido" onClick={() => handleAction(investment, 'mark_matured')} disabled={investment.status !== 'ACTIVO'}>
                          <CalendarClock size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Liquidar" onClick={() => handleAction(investment, 'redeem')} disabled={!['ACTIVO', 'VENCIDO'].includes(investment.status)}>
                          <CheckCircle2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Cancelar" onClick={() => handleAction(investment, 'cancel')} disabled={investment.status !== 'ACTIVO'} style={{ color: 'var(--danger-500)' }}>
                          <XCircle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Producto CDAT</h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: event.target.value.toUpperCase() })} /></div>
              <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Monto mínimo</label><input className="form-input" type="number" value={productForm.minAmount} onChange={(event) => setProductForm({ ...productForm, minAmount: Number(event.target.value) })} /></div>
                <div className="form-group w-full"><label className="form-label">Monto máximo</label><input className="form-input" type="number" value={productForm.maxAmount} onChange={(event) => setProductForm({ ...productForm, maxAmount: Number(event.target.value) })} /></div>
              </div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Plazo mínimo</label><input className="form-input" type="number" value={productForm.minTermDays} onChange={(event) => setProductForm({ ...productForm, minTermDays: Number(event.target.value) })} /></div>
                <div className="form-group w-full"><label className="form-label">Plazo máximo</label><input className="form-input" type="number" value={productForm.maxTermDays} onChange={(event) => setProductForm({ ...productForm, maxTermDays: Number(event.target.value) })} /></div>
              </div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Tasa anual %</label><input className="form-input" type="number" step="0.01" value={productForm.annualRate} onChange={(event) => setProductForm({ ...productForm, annualRate: Number(event.target.value) })} /></div>
                <div className="form-group w-full"><label className="form-label">Retención %</label><input className="form-input" type="number" step="0.01" value={productForm.withholdingRate} onChange={(event) => setProductForm({ ...productForm, withholdingRate: Number(event.target.value) })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Modo de interés</label>
                <select className="form-input form-select" value={productForm.interestMode} onChange={(event) => setProductForm({ ...productForm, interestMode: event.target.value })}>
                  <option value="SIMPLE">Simple</option>
                  <option value="COMPOUND">Compuesto</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateProduct}><Landmark size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showInvestmentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Constituir CDAT</h2>
              <button className="modal-close" onClick={() => setShowInvestmentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Asociado</label>
                <select className="form-input form-select" value={investmentForm.associateId} onChange={(event) => setInvestmentForm({ ...investmentForm, associateId: event.target.value })}>
                  {associates.map((associate) => <option key={associate.id} value={associate.id}>{fullName(associate)} · {associate.associateNumber}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Producto</label>
                <select className="form-input form-select" value={investmentForm.productId} onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value);
                  setInvestmentForm({ ...investmentForm, productId: event.target.value, termDays: product?.minTermDays || investmentForm.termDays });
                }}>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {Number(product.annualRate).toFixed(2)}%</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Capital</label><input className="form-input" type="number" value={investmentForm.principalAmount} onChange={(event) => setInvestmentForm({ ...investmentForm, principalAmount: Number(event.target.value) })} /></div>
                <div className="form-group w-full"><label className="form-label">Plazo días</label><input className="form-input" type="number" value={investmentForm.termDays} onChange={(event) => setInvestmentForm({ ...investmentForm, termDays: Number(event.target.value) })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Fecha de apertura</label><input className="form-input" type="date" value={investmentForm.startDate} onChange={(event) => setInvestmentForm({ ...investmentForm, startDate: event.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Renovación</label>
                <select className="form-input form-select" value={investmentForm.renewalPolicy} onChange={(event) => setInvestmentForm({ ...investmentForm, renewalPolicy: event.target.value })}>
                  <option value="NO_RENUEVA">No renueva</option>
                  <option value="RENUEVA_CAPITAL">Renueva capital</option>
                  <option value="RENUEVA_CAPITAL_INTERES">Renueva capital e interés</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInvestmentModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateInvestment}><PiggyBank size={16} /> Constituir</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected.certificateNumber}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card"><div className="stat-icon blue"><Banknote size={20} /></div><div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(selected.principalAmount)}</div><div className="stat-label">Capital</div></div></div>
                <div className="stat-card"><div className="stat-icon green"><CircleDollarSign size={20} /></div><div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(selected.netInterest)}</div><div className="stat-label">Interés neto</div></div></div>
                <div className="stat-card"><div className="stat-icon amber"><CalendarClock size={20} /></div><div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatDate(selected.maturityDate)}</div><div className="stat-label">Vencimiento</div></div></div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Fecha</th><th>Movimiento</th><th className="text-right">Capital</th><th className="text-right">Interés</th><th className="text-right">Retención</th><th className="text-right">Neto</th></tr></thead>
                  <tbody>
                    {(selected.movements || []).map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.performedAt)}</td>
                        <td>{movement.movementType}</td>
                        <td className="text-right">{formatCurrency(movement.principalAmount)}</td>
                        <td className="text-right">{formatCurrency(movement.interestAmount)}</td>
                        <td className="text-right">{formatCurrency(movement.withholdingAmount)}</td>
                        <td className="text-right font-semibold">{formatCurrency(movement.netAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
