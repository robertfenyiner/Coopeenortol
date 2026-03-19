'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Plus, Search, Eye, XCircle, DollarSign, FileText, Calendar } from 'lucide-react';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  associateId: string;
  totalAmount: string;
  paymentMethod: string;
  reference: string | null;
  status: string;
  createdAt: string;
  contributions: Array<{
    id: string;
    type: string;
    amount: string;
    associate: {
      associateNumber: string;
      person: { firstName: string; lastName: string; documentNumber: string };
    };
  }>;
}

export default function RecaudosPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fmt = (v: string | number) => `$ ${Number(v).toLocaleString('es-CO')}`;

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/recaudos?${params}`);
      const json = await res.json();
      if (json.success) {
        setReceipts(json.data.data);
        setTotal(json.data.total);
        setTotalAmount(Number(json.data.totalAmount));
        setTotalPages(json.data.totalPages);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleVoid = async (id: string, receiptNumber: string) => {
    if (!confirm(`¿Anular el recibo ${receiptNumber}? Esto revertirá todos los aportes incluidos.`)) return;
    try {
      const res = await fetch(`/api/recaudos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      });
      const json = await res.json();
      if (json.success) fetchReceipts();
      else alert(json.error || 'Error al anular');
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recaudos</h1>
          <p className="page-subtitle">Gestión de recibos y recaudos en lote</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/recaudos/nuevo')}>
          <Plus size={16} /> Nuevo Recaudo
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Receipt size={22} /></div>
          <div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Recibos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">{fmt(totalAmount)}</div>
            <div className="stat-label">Total Recaudado</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Search size={16} style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Buscar por número de recibo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', background: 'transparent' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="loading-center" style={{ padding: '3rem' }}><div className="loading-spinner"></div></div>
          ) : receipts.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
              <div className="empty-state-title">Sin recibos registrados</div>
              <div className="empty-state-text">Crea un nuevo recaudo en lote para comenzar</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Recibo</th>
                  <th>Fecha</th>
                  <th>Aportes</th>
                  <th style={{ textAlign: 'right' }}>Monto Total</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                        {r.receiptNumber}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(r.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={12} style={{ color: 'var(--gray-400)' }} />
                        <span className="text-sm">{r.contributions.length} aporte{r.contributions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>
                        {fmt(r.totalAmount)}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{r.paymentMethod}</td>
                    <td>
                      <span className={`badge ${r.status === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/recaudos/${r.id}`)} title="Ver detalle">
                          <Eye size={14} />
                        </button>
                        {r.status === 'ACTIVO' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleVoid(r.id, r.receiptNumber)}
                            title="Anular" style={{ color: 'var(--danger-500)' }}>
                            <XCircle size={14} />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span className="text-sm" style={{ display: 'flex', alignItems: 'center' }}>
              Página {page} de {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
