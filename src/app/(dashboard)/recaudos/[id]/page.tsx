'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Receipt, Calendar, DollarSign, XCircle, FileText } from 'lucide-react';

interface ContributionDetail {
  id: string;
  type: string;
  amount: string;
  status: string;
  associate: {
    associateNumber: string;
    person: { firstName: string; lastName: string; secondLastName?: string; documentType: string; documentNumber: string; };
  };
}

interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  totalAmount: string;
  paymentMethod: string;
  reference: string | null;
  observations: string | null;
  status: string;
  createdAt: string;
  contributions: ContributionDetail[];
}

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fmt = (v: string | number) => `$ ${Number(v).toLocaleString('es-CO')}`;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recaudos/${id}`);
        const json = await res.json();
        if (json.success) setReceipt(json.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  const handleVoid = async () => {
    if (!receipt) return;
    if (!confirm(`¿Anular el recibo ${receipt.receiptNumber}? Se revertirán todos los aportes.`)) return;
    try {
      const res = await fetch(`/api/recaudos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      });
      const json = await res.json();
      if (json.success) {
        const res2 = await fetch(`/api/recaudos/${id}`);
        const json2 = await res2.json();
        if (json2.success) setReceipt(json2.data);
      } else alert(json.error || 'Error');
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="loading-center"><div className="loading-spinner"></div></div>;
  if (!receipt) return (
    <div className="empty-state">
      <div className="empty-state-title">Recibo no encontrado</div>
      <button className="btn btn-primary" onClick={() => router.push('/recaudos')}>Volver</button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/recaudos')}><ArrowLeft size={18} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title" style={{ margin: 0 }}>Recibo {receipt.receiptNumber}</h1>
              <span className={`badge ${receipt.status === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                <span className="badge-dot"></span>{receipt.status}
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
              {new Date(receipt.createdAt).toLocaleString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {receipt.status === 'ACTIVO' && (
          <button className="btn btn-danger" onClick={handleVoid}>
            <XCircle size={16} /> Anular Recibo
          </button>
        )}
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={16} style={{ color: 'var(--success-600)' }} /></div>
          <div><div className="text-xs text-muted">Total</div><div className="font-semibold" style={{ color: 'var(--success-600)' }}>{fmt(receipt.totalAmount)}</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} style={{ color: 'var(--primary-600)' }} /></div>
          <div><div className="text-xs text-muted">Aportes</div><div className="font-semibold">{receipt.contributions.length}</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Receipt size={16} style={{ color: 'var(--gray-500)' }} /></div>
          <div><div className="text-xs text-muted">Método</div><div className="font-semibold text-sm">{receipt.paymentMethod}</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--info-50, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={16} style={{ color: 'var(--info-600, #2563eb)' }} /></div>
          <div><div className="text-xs text-muted">Fecha</div><div className="font-semibold text-sm">{new Date(receipt.createdAt).toLocaleDateString('es-CO')}</div></div>
        </div>
      </div>

      {receipt.reference && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <span className="text-sm text-muted">Referencia: </span>
          <span className="text-sm font-semibold">{receipt.reference}</span>
        </div>
      )}
      {receipt.observations && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <span className="text-sm text-muted">Observaciones: </span>
          <span className="text-sm">{receipt.observations}</span>
        </div>
      )}

      {/* Tabla de aportes */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Detalle de Aportes</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asociado</th>
                <th>N° Asociado</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {receipt.contributions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-semibold text-sm">{c.associate.person.firstName} {c.associate.person.lastName}</div>
                    <div className="text-xs text-muted">{c.associate.person.documentNumber}</div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.associate.associateNumber}</span></td>
                  <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{c.type}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>{fmt(c.amount)}</span>
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'APLICADO' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
