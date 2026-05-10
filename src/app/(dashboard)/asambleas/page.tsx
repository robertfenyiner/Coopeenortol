'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Vote,
  XCircle,
} from 'lucide-react';

type AssemblyStatus = 'PROGRAMADA' | 'ABIERTA' | 'CERRADA' | 'CANCELADA';
type VoteStatus = 'BORRADOR' | 'ABIERTA' | 'CERRADA' | 'ANULADA';
type AssemblyType = 'ORDINARIA' | 'EXTRAORDINARIA';
type VoteType = 'MAYORIA_SIMPLE' | 'MAYORIA_ABSOLUTA' | 'CALIFICADA';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AssemblyListPayload {
  data: Assembly[];
  total: number;
}

interface Assembly {
  id: string;
  code: string;
  title: string;
  assemblyType: AssemblyType;
  status: AssemblyStatus;
  scheduledAt: string;
  location: string | null;
  quorumRequired: string | number;
  description: string | null;
  agendaItems?: AgendaItem[];
  attendances: Attendance[];
  votes: AssemblyVote[];
  stats: {
    enabled: number;
    present: number;
    quorumPercent: number;
    votesCount: number;
  };
}

interface AgendaItem {
  id: string;
  itemNumber: number;
  title: string;
  description: string | null;
  requiresVote: boolean;
}

interface Attendance {
  id: string;
  status: 'HABILITADO' | 'PRESENTE' | 'AUSENTE' | 'BLOQUEADO';
  associateId: string;
  votingWeight: string | number;
  associate?: {
    associateNumber: string;
    person: {
      firstName: string;
      lastName: string;
      secondLastName: string | null;
      documentNumber: string;
    };
  };
}

interface VoteOption {
  id: string;
  label: string;
  sortOrder: number;
}

interface VoteResult {
  optionId: string;
  label: string;
  votes: number;
  weight: number;
  percent: number;
}

interface AssemblyVote {
  id: string;
  title: string;
  description: string | null;
  voteType: VoteType;
  status: VoteStatus;
  isSecret: boolean;
  options: VoteOption[];
  results: VoteResult[];
  totalBallots: number;
  agendaItemId: string | null;
}

interface AssemblyFormState {
  title: string;
  assemblyType: AssemblyType;
  scheduledAt: string;
  location: string;
  quorumRequired: number;
  description: string;
  agendaLines: string;
}

interface VoteFormState {
  title: string;
  voteType: VoteType;
  isSecret: boolean;
  agendaItemId: string;
  options: string;
}

const EMPTY_ASSEMBLY_FORM: AssemblyFormState = {
  title: '',
  assemblyType: 'ORDINARIA',
  scheduledAt: new Date().toISOString().slice(0, 16),
  location: '',
  quorumRequired: 50,
  description: '',
  agendaLines: 'Verificacion del quorum\nLectura y aprobacion del orden del dia\nProposiciones y varios',
};

const EMPTY_VOTE_FORM: VoteFormState = {
  title: '',
  voteType: 'MAYORIA_SIMPLE',
  isSecret: false,
  agendaItemId: '',
  options: 'Aprueba\nNo aprueba',
};

const STATUS_BADGE: Record<AssemblyStatus, string> = {
  PROGRAMADA: 'badge-warning',
  ABIERTA: 'badge-success',
  CERRADA: 'badge-neutral',
  CANCELADA: 'badge-danger',
};

const VOTE_STATUS_BADGE: Record<VoteStatus, string> = {
  BORRADOR: 'badge-warning',
  ABIERTA: 'badge-success',
  CERRADA: 'badge-neutral',
  ANULADA: 'badge-danger',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fullName(attendance: Attendance) {
  const person = attendance.associate?.person;
  if (!person) return attendance.associateId;
  return [person.firstName, person.lastName, person.secondLastName].filter(Boolean).join(' ');
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return response.json() as Promise<ApiResponse<T>>;
}

export default function AssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selected, setSelected] = useState<Assembly | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [assemblyForm, setAssemblyForm] = useState<AssemblyFormState>(EMPTY_ASSEMBLY_FORM);
  const [voteForm, setVoteForm] = useState<VoteFormState>(EMPTY_VOTE_FORM);
  const [ballotVoteId, setBallotVoteId] = useState('');
  const [ballotAssociateId, setBallotAssociateId] = useState('');
  const [ballotOptionId, setBallotOptionId] = useState('');

  const enabledAttendances = useMemo(
    () => selected?.attendances.filter((item) => item.status === 'HABILITADO' || item.status === 'PRESENTE') || [],
    [selected]
  );
  const selectedVote = useMemo(
    () => selected?.votes.find((vote) => vote.id === ballotVoteId) || null,
    [ballotVoteId, selected]
  );

  const loadAssemblies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const response = await fetch(`/api/asambleas?${params}`);
      const json = await parseApiResponse<AssemblyListPayload>(response);
      if (json.success && json.data) {
        setAssemblies(json.data.data);
        setSelected((current) => current || json.data?.data[0] || null);
      } else {
        setMessage(json.error || 'No se pudieron cargar las asambleas');
      }
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  const loadAssembly = useCallback(async (id: string) => {
    const response = await fetch(`/api/asambleas/${id}`);
    const json = await parseApiResponse<Assembly>(response);
    if (json.success && json.data) {
      setSelected(json.data);
      return json.data;
    }
    setMessage(json.error || 'No se pudo cargar la asamblea');
    return null;
  }, []);

  useEffect(() => {
    loadAssemblies();
  }, [loadAssemblies]);

  useEffect(() => {
    if (selected?.id) {
      loadAssembly(selected.id);
    }
  }, [loadAssembly, selected?.id]);

  function openAssemblyModal() {
    setAssemblyForm(EMPTY_ASSEMBLY_FORM);
    setMessage(null);
    setShowAssemblyModal(true);
  }

  function openVoteModal() {
    setVoteForm(EMPTY_VOTE_FORM);
    setMessage(null);
    setShowVoteModal(true);
  }

  async function createAssembly() {
    setActionLoading(true);
    setMessage(null);
    try {
      const agendaItems = assemblyForm.agendaLines
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title) => ({ title, requiresVote: false }));
      const response = await fetch('/api/asambleas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assemblyForm.title,
          assemblyType: assemblyForm.assemblyType,
          scheduledAt: assemblyForm.scheduledAt,
          location: assemblyForm.location || null,
          quorumRequired: assemblyForm.quorumRequired,
          description: assemblyForm.description || null,
          agendaItems,
        }),
      });
      const json = await parseApiResponse<Assembly>(response);
      if (json.success && json.data) {
        setShowAssemblyModal(false);
        setSelected(json.data);
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudo crear la asamblea');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function updateAssemblyStatus(nextStatus: AssemblyStatus) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/asambleas/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await parseApiResponse<Assembly>(response);
      if (json.success && json.data) {
        setSelected(json.data);
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudo actualizar la asamblea');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function enableAssociates() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/asambleas/${selected.id}/habilitar`, { method: 'POST' });
      const json = await parseApiResponse<Assembly>(response);
      if (json.success && json.data) {
        setSelected(json.data);
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudieron habilitar asociados');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function createVote() {
    if (!selected) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const options = voteForm.options.split('\n').map((line) => line.trim()).filter(Boolean);
      const response = await fetch(`/api/asambleas/${selected.id}/votaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: voteForm.title,
          voteType: voteForm.voteType,
          isSecret: voteForm.isSecret,
          agendaItemId: voteForm.agendaItemId || null,
          options,
        }),
      });
      const json = await parseApiResponse<AssemblyVote>(response);
      if (json.success) {
        setShowVoteModal(false);
        await loadAssembly(selected.id);
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudo crear la votacion');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function updateVoteStatus(voteId: string, nextStatus: VoteStatus) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/asambleas/${selected.id}/votaciones/${voteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await parseApiResponse<Assembly>(response);
      if (json.success && json.data) {
        setSelected(json.data);
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudo actualizar la votacion');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function castBallot() {
    if (!selected || !ballotVoteId || !ballotAssociateId || !ballotOptionId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/asambleas/${selected.id}/votaciones/${ballotVoteId}/votar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associateId: ballotAssociateId, optionId: ballotOptionId }),
      });
      const json = await parseApiResponse<Assembly>(response);
      if (json.success && json.data) {
        setSelected(json.data);
        setBallotAssociateId('');
        setBallotOptionId('');
        await loadAssemblies();
      } else {
        setMessage(json.error || 'No se pudo registrar el voto');
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Asambleas y Votaciones</h1>
          <p className="page-subtitle">Registro de quorum, orden del dia y votaciones cooperativas</p>
        </div>
        <button className="btn btn-primary" onClick={openAssemblyModal}>
          <Plus size={16} /> Nueva asamblea
        </button>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue"><ClipboardList size={22} /></div><div><div className="stat-value">{assemblies.length}</div><div className="stat-label">Asambleas</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><UserCheck size={22} /></div><div><div className="stat-value">{selected?.stats.present || 0}</div><div className="stat-label">Presentes</div></div></div>
        <div className="stat-card"><div className="stat-icon amber"><CheckCircle2 size={22} /></div><div><div className="stat-value">{selected?.stats.quorumPercent || 0}%</div><div className="stat-label">Quorum actual</div></div></div>
        <div className="stat-card"><div className="stat-icon blue"><Vote size={22} /></div><div><div className="stat-value">{selected?.stats.votesCount || 0}</div><div className="stat-label">Votaciones</div></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(0, 1.4fr)', gap: '1rem', alignItems: 'start' }}>
        <div className="card">
          <div className="table-toolbar">
            <div className="table-search">
              <Search className="table-search-icon" size={16} />
              <input className="table-search-input" placeholder="Buscar codigo o titulo..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className="form-input form-select" value={status} onChange={(event) => setStatus(event.target.value)} style={{ maxWidth: '170px' }}>
              <option value="">Todos</option>
              <option value="PROGRAMADA">Programada</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CERRADA">Cerrada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-center"><div className="loading-spinner"></div></div>
            ) : assemblies.length === 0 ? (
              <div className="empty-state"><Vote className="empty-state-icon" /><div className="empty-state-title">Sin asambleas</div><div className="empty-state-text">Crea la primera asamblea para activar quorum y votaciones.</div></div>
            ) : assemblies.map((assembly) => (
              <button
                key={assembly.id}
                onClick={() => setSelected(assembly)}
                style={{
                  width: '100%',
                  border: 0,
                  borderBottom: '1px solid var(--gray-100)',
                  background: selected?.id === assembly.id ? 'var(--primary-50)' : 'transparent',
                  textAlign: 'left',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div>
                    <div className="font-semibold text-sm">{assembly.code}</div>
                    <div style={{ fontWeight: 600 }}>{assembly.title}</div>
                    <div className="text-xs text-muted">{formatDate(assembly.scheduledAt)}</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[assembly.status]}`}>{assembly.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="card-title">{selected.title}</span>
                  <div className="text-xs text-muted">{selected.code} - {selected.assemblyType} - {formatDate(selected.scheduledAt)}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div><div className="text-xs text-muted">Habilitados</div><div className="font-semibold">{selected.stats.enabled}</div></div>
                  <div><div className="text-xs text-muted">Presentes</div><div className="font-semibold">{selected.stats.present}</div></div>
                  <div><div className="text-xs text-muted">Quorum requerido</div><div className="font-semibold">{Number(selected.quorumRequired).toFixed(2)}%</div></div>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={enableAssociates} disabled={actionLoading}><UserCheck size={14} /> Habilitar asociados</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => updateAssemblyStatus('ABIERTA')} disabled={actionLoading || selected.status === 'ABIERTA'}><CheckCircle2 size={14} /> Abrir</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => updateAssemblyStatus('CERRADA')} disabled={actionLoading || selected.status === 'CERRADA'}><XCircle size={14} /> Cerrar</button>
                  <button className="btn btn-primary btn-sm" onClick={openVoteModal} disabled={actionLoading || selected.status === 'CERRADA' || selected.status === 'CANCELADA'}><Plus size={14} /> Nueva votacion</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => loadAssembly(selected.id)}><RefreshCw size={14} /></button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Orden del dia</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                {(selected.agendaItems || []).length > 0 ? selected.agendaItems?.map((item) => (
                  <div key={item.id} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <div className="font-semibold text-sm">{item.itemNumber}. {item.title}</div>
                    {item.description && <div className="text-xs text-muted">{item.description}</div>}
                  </div>
                )) : <div className="empty-state"><div className="empty-state-title">Sin orden del dia</div></div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Votaciones</span></div>
              <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                {selected.votes.length === 0 ? (
                  <div className="empty-state"><Vote className="empty-state-icon" /><div className="empty-state-title">Sin votaciones creadas</div></div>
                ) : selected.votes.map((vote) => (
                  <div key={vote.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div className="font-semibold">{vote.title}</div>
                        <div className="text-xs text-muted">{vote.voteType} - {vote.isSecret ? 'Secreta' : 'Nominal'} - {vote.totalBallots} votos</div>
                      </div>
                      <span className={`badge ${VOTE_STATUS_BADGE[vote.status]}`}>{vote.status}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '0.45rem', marginBottom: '0.75rem' }}>
                      {vote.results.map((result) => (
                        <div key={result.optionId}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                            <span>{result.label}</span>
                            <span>{result.votes} votos - {result.percent}%</span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '999px', background: 'var(--gray-100)', overflow: 'hidden' }}>
                            <div style={{ width: `${result.percent}%`, height: '100%', background: 'var(--primary-600)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => updateVoteStatus(vote.id, 'ABIERTA')} disabled={actionLoading || vote.status === 'ABIERTA'}>Abrir</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => updateVoteStatus(vote.id, 'CERRADA')} disabled={actionLoading || vote.status === 'CERRADA'}>Cerrar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Registrar voto</span></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Votacion abierta</label>
                    <select className="form-input form-select" value={ballotVoteId} onChange={(event) => { setBallotVoteId(event.target.value); setBallotOptionId(''); }}>
                      <option value="">Seleccionar</option>
                      {selected.votes.filter((vote) => vote.status === 'ABIERTA').map((vote) => <option key={vote.id} value={vote.id}>{vote.title}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Asociado</label>
                    <select className="form-input form-select" value={ballotAssociateId} onChange={(event) => setBallotAssociateId(event.target.value)}>
                      <option value="">Seleccionar</option>
                      {enabledAttendances.map((attendance) => <option key={attendance.id} value={attendance.associateId}>{fullName(attendance)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Opcion</label>
                    <select className="form-input form-select" value={ballotOptionId} onChange={(event) => setBallotOptionId(event.target.value)}>
                      <option value="">Seleccionar</option>
                      {selectedVote?.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={castBallot} disabled={actionLoading || !ballotVoteId || !ballotAssociateId || !ballotOptionId}>
                  <Vote size={16} /> Registrar voto
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-title">Selecciona una asamblea</div></div></div>
        )}
      </div>

      {showAssemblyModal && (
        <div className="modal-overlay" onClick={() => setShowAssemblyModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva asamblea</h2>
              <button className="btn btn-ghost" onClick={() => setShowAssemblyModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Titulo</label><input className="form-input" value={assemblyForm.title} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, title: event.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Tipo</label><select className="form-input form-select" value={assemblyForm.assemblyType} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, assemblyType: event.target.value as AssemblyType }))}><option value="ORDINARIA">Ordinaria</option><option value="EXTRAORDINARIA">Extraordinaria</option></select></div>
                <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="datetime-local" value={assemblyForm.scheduledAt} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Quorum (%)</label><input className="form-input" type="number" min={0} max={100} value={assemblyForm.quorumRequired} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, quorumRequired: Number(event.target.value) }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Lugar</label><input className="form-input" value={assemblyForm.location} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, location: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Descripcion</label><textarea className="form-input" rows={3} value={assemblyForm.description} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, description: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Orden del dia (una linea por punto)</label><textarea className="form-input" rows={5} value={assemblyForm.agendaLines} onChange={(event) => setAssemblyForm((prev) => ({ ...prev, agendaLines: event.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssemblyModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createAssembly} disabled={actionLoading || !assemblyForm.title || !assemblyForm.scheduledAt}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showVoteModal && selected && (
        <div className="modal-overlay" onClick={() => setShowVoteModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva votacion</h2>
              <button className="btn btn-ghost" onClick={() => setShowVoteModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Titulo</label><input className="form-input" value={voteForm.title} onChange={(event) => setVoteForm((prev) => ({ ...prev, title: event.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Tipo de decision</label><select className="form-input form-select" value={voteForm.voteType} onChange={(event) => setVoteForm((prev) => ({ ...prev, voteType: event.target.value as VoteType }))}><option value="MAYORIA_SIMPLE">Mayoria simple</option><option value="MAYORIA_ABSOLUTA">Mayoria absoluta</option><option value="CALIFICADA">Calificada</option></select></div>
                <div className="form-group"><label className="form-label">Punto del orden del dia</label><select className="form-input form-select" value={voteForm.agendaItemId} onChange={(event) => setVoteForm((prev) => ({ ...prev, agendaItemId: event.target.value }))}><option value="">Sin asociar</option>{selected.agendaItems?.map((item) => <option key={item.id} value={item.id}>{item.itemNumber}. {item.title}</option>)}</select></div>
              </div>
              <div className="form-group"><label className="form-label">Opciones (una linea por opcion)</label><textarea className="form-input" rows={4} value={voteForm.options} onChange={(event) => setVoteForm((prev) => ({ ...prev, options: event.target.value }))} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                <input type="checkbox" checked={voteForm.isSecret} onChange={(event) => setVoteForm((prev) => ({ ...prev, isSecret: event.target.checked }))} />
                Votacion secreta
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVoteModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createVote} disabled={actionLoading || !voteForm.title}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
