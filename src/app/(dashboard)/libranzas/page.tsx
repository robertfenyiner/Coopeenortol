'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Plus,
  Search,
  Send,
  Upload,
} from 'lucide-react';

interface PayingEntity {
  id: string;
  code: string;
  name: string;
  entityType: string;
  fileFormat: string;
}

interface PayrollBatch {
  id: string;
  batchNumber: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  totalRecords: number;
  totalAmount: string;
  appliedAmount: string;
  rejectedAmount: string;
  fileName: string | null;
  createdAt: string;
  payingEntity: PayingEntity;
}

interface PayrollDetail {
  id: string;
  lineNumber: number;
  fullName: string;
  documentNumber: string;
  conceptCode: string;
  conceptType: string;
  amount: string;
  appliedAmount: string;
  rejectedAmount: string;
  status: string;
  rejectionReason: string | null;
}

interface PayrollBatchDetail extends PayrollBatch {
  details: PayrollDetail[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_BADGES: Record<string, string> = {
  BORRADOR: 'badge-neutral',
  GENERADO: 'badge-info',
  ENVIADO: 'badge-warning',
  CONCILIACION_PARCIAL: 'badge-warning',
  CONCILIADO: 'badge-success',
  ANULADO: 'badge-danger',
};

function formatCurrency(value: string | number) {
  return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function LibranzasPage() {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [entities, setEntities] = useState<PayingEntity[]>([]);
  const [selected, setSelected] = useState<PayrollBatchDetail | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [conciliationBatch, setConciliationBatch] = useState<PayrollBatch | null>(null);
  const [conciliationContent, setConciliationContent] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const now = new Date();
  const [batchForm, setBatchForm] = useState({
    payingEntityId: '',
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    includeContributions: true,
    includeCredits: true,
    observations: '',
  });
  const [entityForm, setEntityForm] = useState({
    code: '',
    name: '',
    nit: '',
    entityType: 'SECRETARIA',
    fileFormat: 'CSV',
    separator: ';',
  });

  const fetchEntities = useCallback(async () => {
    const res = await fetch('/api/entidades-pagadoras');
    const json = await res.json();
    if (json.success) {
      setEntities(json.data);
      if (!batchForm.payingEntityId && json.data[0]) {
        setBatchForm((prev) => ({ ...prev, payingEntityId: json.data[0].id }));
      }
    }
  }, [batchForm.payingEntityId]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/libranzas?${params}`);
      const json = await res.json();
      if (json.success) setBatches(json.data.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  async function handleCreateEntity() {
    setMessage(null);
    const res = await fetch('/api/entidades-pagadoras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entityForm,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        encoding: 'UTF-8',
        paymentCycle: 'MENSUAL',
        cutoffDay: null,
      }),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear la entidad');
    setShowEntityModal(false);
    setEntityForm({ code: '', name: '', nit: '', entityType: 'SECRETARIA', fileFormat: 'CSV', separator: ';' });
    await fetchEntities();
  }

  async function handleCreateBatch() {
    setMessage(null);
    const res = await fetch('/api/libranzas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear el lote');
    setShowBatchModal(false);
    await fetchBatches();
  }

  async function handleGenerate(batch: PayrollBatch) {
    const res = await fetch(`/api/libranzas/${batch.id}/generar`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo generar el archivo');
    downloadTextFile(json.data.fileName, json.data.content, json.data.mimeType);
    await fetchBatches();
  }

  async function handleSend(batch: PayrollBatch) {
    const res = await fetch(`/api/libranzas/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send' }),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo marcar como enviado');
    await fetchBatches();
  }

  async function handleOpenDetail(batch: PayrollBatch) {
    const res = await fetch(`/api/libranzas/${batch.id}`);
    const json = await res.json();
    if (json.success) setSelected(json.data);
  }

  async function handleConciliate() {
    if (!conciliationBatch) return;
    const res = await fetch(`/api/libranzas/${conciliationBatch.id}/conciliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: conciliationContent }),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo conciliar');
    setConciliationBatch(null);
    setConciliationContent('');
    await fetchBatches();
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return;
    setConciliationContent(await file.text());
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Libranzas</h1>
          <p className="page-subtitle">Generación de archivos planos de nómina y conciliación de descuentos</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowEntityModal(true)}>
            <Building2 size={16} /> Entidad
          </button>
          <button className="btn btn-primary" onClick={() => setShowBatchModal(true)} disabled={entities.length === 0}>
            <Plus size={16} /> Nuevo Lote
          </button>
        </div>
      </div>

      {message && (
        <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FileText size={22} /></div>
          <div><div className="stat-value">{batches.length}</div><div className="stat-label">Lotes recientes</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle2 size={22} /></div>
          <div><div className="stat-value">{batches.filter((b) => b.status === 'CONCILIADO').length}</div><div className="stat-label">Conciliados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Building2 size={22} /></div>
          <div><div className="stat-value">{entities.length}</div><div className="stat-label">Entidades activas</div></div>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="table-search">
            <Search className="table-search-icon" size={16} />
            <input
              className="table-search-input"
              placeholder="Buscar lote o entidad..."
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
            <option value="BORRADOR">Borrador</option>
            <option value="GENERADO">Generado</option>
            <option value="ENVIADO">Enviado</option>
            <option value="CONCILIADO">Conciliado</option>
          </select>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-center"><div className="loading-spinner"></div></div>
          ) : batches.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <div className="empty-state-title">No hay lotes de libranza</div>
              <div className="empty-state-text">Crea una entidad pagadora y genera el primer lote del periodo</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Entidad</th>
                  <th>Periodo</th>
                  <th>Registros</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetail(batch)}>
                        {batch.batchNumber}
                      </button>
                      <div className="text-xs text-muted">{batch.fileName || 'Sin archivo'}</div>
                    </td>
                    <td>
                      <div className="font-semibold">{batch.payingEntity.name}</div>
                      <div className="text-xs text-muted">{batch.payingEntity.code}</div>
                    </td>
                    <td>{MONTHS[batch.periodMonth - 1]} {batch.periodYear}</td>
                    <td>{batch.totalRecords}</td>
                    <td className="text-right font-semibold">{formatCurrency(batch.totalAmount)}</td>
                    <td><span className={`badge ${STATUS_BADGES[batch.status] || 'badge-neutral'}`}>{batch.status}</span></td>
                    <td className="text-right">
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Generar y descargar" onClick={() => handleGenerate(batch)}>
                          <Download size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Marcar enviado" onClick={() => handleSend(batch)}>
                          <Send size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Conciliar" onClick={() => setConciliationBatch(batch)}>
                          <Upload size={14} />
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

      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Nuevo lote de libranza</h2>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Entidad pagadora</label>
                <select className="form-input form-select" value={batchForm.payingEntityId} onChange={(event) => setBatchForm({ ...batchForm, payingEntityId: event.target.value })}>
                  {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="form-group w-full">
                  <label className="form-label">Año</label>
                  <input className="form-input" type="number" value={batchForm.periodYear} onChange={(event) => setBatchForm({ ...batchForm, periodYear: Number(event.target.value) })} />
                </div>
                <div className="form-group w-full">
                  <label className="form-label">Mes</label>
                  <input className="form-input" type="number" min={1} max={12} value={batchForm.periodMonth} onChange={(event) => setBatchForm({ ...batchForm, periodMonth: Number(event.target.value) })} />
                </div>
              </div>
              <label className="flex gap-2 items-center mb-2">
                <input type="checkbox" checked={batchForm.includeContributions} onChange={(event) => setBatchForm({ ...batchForm, includeContributions: event.target.checked })} />
                Incluir aportes ordinarios
              </label>
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={batchForm.includeCredits} onChange={(event) => setBatchForm({ ...batchForm, includeCredits: event.target.checked })} />
                Incluir cuotas de créditos vigentes
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateBatch}><FileCheck2 size={16} /> Crear</button>
            </div>
          </div>
        </div>
      )}

      {showEntityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Entidad pagadora</h2>
              <button className="modal-close" onClick={() => setShowEntityModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={entityForm.code} onChange={(event) => setEntityForm({ ...entityForm, code: event.target.value.toUpperCase() })} /></div>
              <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={entityForm.name} onChange={(event) => setEntityForm({ ...entityForm, name: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">NIT</label><input className="form-input" value={entityForm.nit} onChange={(event) => setEntityForm({ ...entityForm, nit: event.target.value })} /></div>
              <div className="flex gap-3">
                <div className="form-group w-full">
                  <label className="form-label">Tipo</label>
                  <select className="form-input form-select" value={entityForm.entityType} onChange={(event) => setEntityForm({ ...entityForm, entityType: event.target.value })}>
                    <option value="SECRETARIA">Secretaría</option>
                    <option value="COLEGIO">Colegio</option>
                    <option value="UNIVERSIDAD">Universidad</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="form-group w-full">
                  <label className="form-label">Formato</label>
                  <select className="form-input form-select" value={entityForm.fileFormat} onChange={(event) => setEntityForm({ ...entityForm, fileFormat: event.target.value })}>
                    <option value="CSV">CSV</option>
                    <option value="TXT_FIXED">TXT fijo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEntityModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateEntity}><Building2 size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {conciliationBatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Conciliar {conciliationBatch.batchNumber}</h2>
              <button className="modal-close" onClick={() => setConciliationBatch(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Archivo recibido</label>
                <input className="form-input" type="file" accept=".csv,.txt" onChange={(event) => handleFileUpload(event.target.files?.[0] || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contenido</label>
                <textarea
                  className="form-input"
                  rows={8}
                  value={conciliationContent}
                  onChange={(event) => setConciliationContent(event.target.value)}
                  placeholder="documento;concepto;valor_pagado;estado;motivo"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConciliationBatch(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConciliate}><Upload size={16} /> Conciliar</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '920px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected.batchNumber}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Línea</th><th>Asociado</th><th>Documento</th><th>Concepto</th><th className="text-right">Valor</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.details.map((detail) => (
                    <tr key={detail.id}>
                      <td>{detail.lineNumber}</td>
                      <td>{detail.fullName}</td>
                      <td>{detail.documentNumber}</td>
                      <td>{detail.conceptCode}</td>
                      <td className="text-right">{formatCurrency(detail.amount)}</td>
                      <td><span className={`badge ${STATUS_BADGES[detail.status] || 'badge-neutral'}`}>{detail.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
