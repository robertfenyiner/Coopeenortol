'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Edit, History, UserCheck, UserX, AlertCircle, Plus, Trash2, User, MapPin, Briefcase, Heart, Clock, Wallet, Landmark, DollarSign, TrendingUp } from 'lucide-react';

interface PersonData {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  gender: string | null;
  birthDate: string | null;
  maritalStatus: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  housingType: string | null;
  occupation: string | null;
  employer: string | null;
  jobTitle: string | null;
  monthlyIncome: string | null;
}

interface BeneficiaryData {
  id: string;
  fullName: string;
  relationship: string;
  percentage: number;
  phone: string | null;
  isActive: boolean;
}

interface HistoryEntry {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  details: string | null;
  performedAt: string;
}

interface AssociateDetail {
  id: string;
  associateNumber: string;
  status: string;
  admissionDate: string | null;
  withdrawalDate: string | null;
  withdrawalReason: string | null;
  observations: string | null;
  createdAt: string;
  person: PersonData;
  beneficiaries: BeneficiaryData[];
  history: HistoryEntry[];
}

interface ContributionData {
  id: string; type: string; amount: string; paymentMethod: string; status: string; createdAt: string;
}
interface CreditData {
  id: string; creditNumber: string; creditLine: string; status: string;
  requestedAmount: string; outstandingBalance: string; createdAt: string;
}
interface SavingsSummary {
  totalBalance: number; totalContributions: number; contributionCount: number;
}

interface CatalogItem { code: string; name: string; }

const STATUS_LABELS: Record<string, string> = {
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', RETIRADO: 'Retirado', SUSPENDIDO: 'Suspendido', PENDIENTE: 'Pendiente',
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVO: 'badge-success', INACTIVO: 'badge-warning', RETIRADO: 'badge-danger', SUSPENDIDO: 'badge-danger', PENDIENTE: 'badge-info',
};

// Transiciones de estado válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ['ACTIVO', 'INACTIVO'],
  ACTIVO: ['INACTIVO', 'SUSPENDIDO', 'RETIRADO'],
  INACTIVO: ['ACTIVO', 'RETIRADO'],
  SUSPENDIDO: ['ACTIVO', 'RETIRADO'],
  RETIRADO: [],
};

export default function AsociadoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [associate, setAssociate] = useState<AssociateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'contacto' | 'laboral' | 'beneficiarios' | 'historial' | 'aportes' | 'creditos'>('personal');

  // Datos financieros
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [credits, setCredits] = useState<CreditData[]>([]);
  const [savingsSummary, setSavingsSummary] = useState<SavingsSummary | null>(null);

  // Modal de cambio de estado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  // Catálogos
  const [documentTypes, setDocumentTypes] = useState<CatalogItem[]>([]);
  const [genders, setGenders] = useState<CatalogItem[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<CatalogItem[]>([]);
  const [relationships, setRelationships] = useState<CatalogItem[]>([]);
  const [housingTypes, setHousingTypes] = useState<CatalogItem[]>([]);

  // Formulario editable
  const [form, setForm] = useState<Record<string, string | number | null>>({});

  const fetchAssociate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asociados/${id}`);
      const json = await res.json();
      if (json.success) {
        setAssociate(json.data);
        // Inicializar formulario
        const p = json.data.person;
        setForm({
          documentType: p.documentType,
          documentNumber: p.documentNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          secondLastName: p.secondLastName || '',
          gender: p.gender || '',
          birthDate: p.birthDate ? p.birthDate.split('T')[0] : '',
          maritalStatus: p.maritalStatus || '',
          email: p.email || '',
          phone: p.phone || '',
          mobilePhone: p.mobilePhone || '',
          address: p.address || '',
          city: p.city || '',
          department: p.department || '',
          housingType: p.housingType || '',
          occupation: p.occupation || '',
          employer: p.employer || '',
          jobTitle: p.jobTitle || '',
          monthlyIncome: p.monthlyIncome ? Number(p.monthlyIncome) : null,
          observations: json.data.observations || '',
        });
      }
    } catch (e) {
      console.error('Error al cargar asociado:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAssociate(); }, [fetchAssociate]);

  // Cargar datos financieros
  useEffect(() => {
    async function loadFinancials() {
      try {
        const [aportesRes, creditosRes] = await Promise.all([
          fetch(`/api/asociados/${id}/aportes`),
          fetch(`/api/creditos?associateId=${id}&pageSize=100`),
        ]);
        const aportesJson = await aportesRes.json();
        const creditosJson = await creditosRes.json();
        if (aportesJson.success) {
          const d = aportesJson.data;
          setContributions(d.contributions || []);
          setSavingsSummary({
            totalBalance: Number(d.totalBalance || 0),
            totalContributions: (d.contributions || []).reduce((s: number, c: ContributionData) => s + Number(c.amount), 0),
            contributionCount: (d.contributions || []).length,
          });
        }
        if (creditosJson.success) setCredits(creditosJson.data?.data || []);
      } catch (e) { console.error(e); }
    }
    loadFinancials();
  }, [id]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const res = await fetch('/api/parametrizacion/catalogos');
        const json = await res.json();
        if (json.success) {
          for (const cat of json.data) {
            const items = cat.items?.filter((i: { isActive: boolean }) => i.isActive) || [];
            switch (cat.code) {
              case 'TIPO_DOCUMENTO': setDocumentTypes(items); break;
              case 'GENERO': setGenders(items); break;
              case 'ESTADO_CIVIL': setMaritalStatuses(items); break;
              case 'PARENTESCO': setRelationships(items); break;
              case 'TIPO_VIVIENDA': setHousingTypes(items); break;
            }
          }
        }
      } catch (e) { console.error(e); }
    }
    loadCatalogs();
  }, []);

  const updateField = (field: string, value: string | number | null) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : null,
        email: form.email || null,
        secondLastName: form.secondLastName || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        maritalStatus: form.maritalStatus || null,
        phone: form.phone || null,
        mobilePhone: form.mobilePhone || null,
        address: form.address || null,
        city: form.city || null,
        department: form.department || null,
        housingType: form.housingType || null,
        occupation: form.occupation || null,
        employer: form.employer || null,
        jobTitle: form.jobTitle || null,
        observations: form.observations || null,
      };

      const res = await fetch(`/api/asociados/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setEditMode(false);
        fetchAssociate();
      } else {
        setError(json.error || 'Error al guardar');
      }
    } catch (e) {
      setError('Error de conexión');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatus) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/asociados/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: statusReason || null }),
      });
      const json = await res.json();
      if (json.success) {
        setShowStatusModal(false);
        setNewStatus('');
        setStatusReason('');
        fetchAssociate();
      } else {
        setError(json.error || 'Error al cambiar estado');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddBeneficiary = async () => {
    const name = prompt('Nombre completo del beneficiario:');
    if (!name) return;
    const rel = prompt('Parentesco (ej: CONYUGE, HIJO, PADRE_MADRE):');
    if (!rel) return;
    const pct = prompt('Porcentaje (0-100):');
    if (!pct) return;

    try {
      const res = await fetch(`/api/asociados/${id}/beneficiarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, relationship: rel, percentage: parseFloat(pct), phone: null }),
      });
      const json = await res.json();
      if (json.success) fetchAssociate();
      else setError(json.error || 'Error al agregar beneficiario');
    } catch (e) { console.error(e); }
  };

  const handleRemoveBeneficiary = async (beneficiaryId: string) => {
    if (!confirm('¿Eliminar este beneficiario?')) return;
    try {
      await fetch(`/api/asociados/${id}/beneficiarios?beneficiaryId=${beneficiaryId}`, { method: 'DELETE' });
      fetchAssociate();
    } catch (e) { console.error(e); }
  };

  const fmt = (v: string | number) => `$ ${Number(v).toLocaleString('es-CO')}`;
  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading-center"><div className="loading-spinner"></div></div>;
  }

  if (!associate) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Asociado no encontrado</div>
        <button className="btn btn-primary" onClick={() => router.push('/asociados')}>Volver al listado</button>
      </div>
    );
  }

  const validTransitions = VALID_TRANSITIONS[associate.status] || [];
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)', background: editMode ? 'white' : 'var(--gray-50)' };

  const tabs = [
    { key: 'personal' as const, label: 'Datos Personales', icon: User },
    { key: 'contacto' as const, label: 'Contacto', icon: MapPin },
    { key: 'laboral' as const, label: 'Laboral', icon: Briefcase },
    { key: 'aportes' as const, label: `Aportes (${contributions.length})`, icon: Wallet },
    { key: 'creditos' as const, label: `Créditos (${credits.length})`, icon: Landmark },
    { key: 'beneficiarios' as const, label: `Beneficiarios (${associate.beneficiaries.length})`, icon: Heart },
    { key: 'historial' as const, label: `Historial (${associate.history.length})`, icon: Clock },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/asociados')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {associate.person.firstName} {associate.person.lastName} {associate.person.secondLastName || ''}
              </h1>
              <span className={`badge ${STATUS_BADGE[associate.status] || 'badge-info'}`}>
                <span className="badge-dot"></span>
                {STATUS_LABELS[associate.status] || associate.status}
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--primary-600)' }}>{associate.associateNumber}</span>
              {' · '}
              {associate.person.documentType} {associate.person.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {validTransitions.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowStatusModal(true)}>
              <UserCheck size={16} /> Cambiar Estado
            </button>
          )}
          {editMode ? (
            <>
              <button className="btn btn-ghost" onClick={() => { setEditMode(false); fetchAssociate(); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>
              <Edit size={16} /> Editar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', color: 'var(--danger-700)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} style={{ color: 'var(--gray-500)' }} />
          </div>
          <div><div className="text-xs text-muted">Ingreso</div><div className="font-semibold text-sm">{formatDate(associate.admissionDate)}</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={16} style={{ color: 'var(--success-600)' }} />
          </div>
          <div><div className="text-xs text-muted">Ahorros</div><div className="font-semibold text-sm" style={{ color: 'var(--success-600)' }}>{savingsSummary ? fmt(savingsSummary.totalBalance) : '—'}</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div><div className="text-xs text-muted">Aportes</div><div className="font-semibold text-sm">{savingsSummary?.contributionCount || 0} registrados</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--info-50, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={16} style={{ color: 'var(--info-600, #2563eb)' }} />
          </div>
          <div><div className="text-xs text-muted">Créditos</div><div className="font-semibold text-sm">{credits.length} registrados</div></div>
        </div>
        <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--warning-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={16} style={{ color: 'var(--warning-500)' }} />
          </div>
          <div><div className="text-xs text-muted">Beneficiarios</div><div className="font-semibold text-sm">{associate.beneficiaries.length}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 500,
                border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary-500)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--gray-500)', marginBottom: '-2px', transition: 'all 0.2s',
              }}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Datos Personales */}
      {activeTab === 'personal' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Documento</label>
              {editMode ? (
                <select style={inputStyle} value={form.documentType as string} onChange={(e) => updateField('documentType', e.target.value)}>
                  {documentTypes.length > 0 ? documentTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>) : <option value={form.documentType as string}>{form.documentType}</option>}
                </select>
              ) : <div className="font-semibold">{form.documentType}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Número de Documento</label>
              {editMode ? <input style={inputStyle} value={form.documentNumber as string} onChange={(e) => updateField('documentNumber', e.target.value)} />
                : <div className="font-semibold">{form.documentNumber}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Primer Nombre</label>
              {editMode ? <input style={inputStyle} value={form.firstName as string} onChange={(e) => updateField('firstName', e.target.value)} />
                : <div className="font-semibold">{form.firstName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Primer Apellido</label>
              {editMode ? <input style={inputStyle} value={form.lastName as string} onChange={(e) => updateField('lastName', e.target.value)} />
                : <div className="font-semibold">{form.lastName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Segundo Apellido</label>
              {editMode ? <input style={inputStyle} value={form.secondLastName as string || ''} onChange={(e) => updateField('secondLastName', e.target.value)} />
                : <div>{form.secondLastName || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Género</label>
              {editMode ? (
                <select style={inputStyle} value={form.gender as string || ''} onChange={(e) => updateField('gender', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {genders.length > 0 ? genders.map((g) => <option key={g.code} value={g.code}>{g.name}</option>) : <option value={form.gender as string || ''}>{form.gender || ''}</option>}
                </select>
              ) : <div>{form.gender || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Nacimiento</label>
              {editMode ? <input type="date" style={inputStyle} value={form.birthDate as string || ''} onChange={(e) => updateField('birthDate', e.target.value)} />
                : <div>{form.birthDate ? formatDate(form.birthDate as string) : '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Estado Civil</label>
              {editMode ? (
                <select style={inputStyle} value={form.maritalStatus as string || ''} onChange={(e) => updateField('maritalStatus', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {maritalStatuses.length > 0 ? maritalStatuses.map((s) => <option key={s.code} value={s.code}>{s.name}</option>) : <option value={form.maritalStatus as string || ''}>{form.maritalStatus || ''}</option>}
                </select>
              ) : <div>{form.maritalStatus || '—'}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Contacto */}
      {activeTab === 'contacto' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              {editMode ? <input type="email" style={inputStyle} value={form.email as string || ''} onChange={(e) => updateField('email', e.target.value)} />
                : <div>{form.email || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono Fijo</label>
              {editMode ? <input style={inputStyle} value={form.phone as string || ''} onChange={(e) => updateField('phone', e.target.value)} />
                : <div>{form.phone || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              {editMode ? <input style={inputStyle} value={form.mobilePhone as string || ''} onChange={(e) => updateField('mobilePhone', e.target.value)} />
                : <div>{form.mobilePhone || '—'}</div>}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Dirección</label>
              {editMode ? <input style={inputStyle} value={form.address as string || ''} onChange={(e) => updateField('address', e.target.value)} />
                : <div>{form.address || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Ciudad</label>
              {editMode ? <input style={inputStyle} value={form.city as string || ''} onChange={(e) => updateField('city', e.target.value)} />
                : <div>{form.city || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              {editMode ? <input style={inputStyle} value={form.department as string || ''} onChange={(e) => updateField('department', e.target.value)} />
                : <div>{form.department || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Vivienda</label>
              {editMode ? (
                <select style={inputStyle} value={form.housingType as string || ''} onChange={(e) => updateField('housingType', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {housingTypes.length > 0 ? housingTypes.map((h) => <option key={h.code} value={h.code}>{h.name}</option>) : <option value={form.housingType as string || ''}>{form.housingType || ''}</option>}
                </select>
              ) : <div>{form.housingType || '—'}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Laboral */}
      {activeTab === 'laboral' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Ocupación</label>
              {editMode ? <input style={inputStyle} value={form.occupation as string || ''} onChange={(e) => updateField('occupation', e.target.value)} />
                : <div>{form.occupation || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              {editMode ? <input style={inputStyle} value={form.employer as string || ''} onChange={(e) => updateField('employer', e.target.value)} />
                : <div>{form.employer || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Cargo</label>
              {editMode ? <input style={inputStyle} value={form.jobTitle as string || ''} onChange={(e) => updateField('jobTitle', e.target.value)} />
                : <div>{form.jobTitle || '—'}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Ingreso Mensual (COP)</label>
              {editMode ? <input type="number" style={inputStyle} value={form.monthlyIncome !== null ? String(form.monthlyIncome) : ''} onChange={(e) => updateField('monthlyIncome', e.target.value ? Number(e.target.value) : null)} min="0" step="1000" />
                : <div>{form.monthlyIncome !== null ? `$ ${Number(form.monthlyIncome).toLocaleString('es-CO')}` : '—'}</div>}
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Observaciones</label>
            {editMode ? <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} value={form.observations as string || ''} onChange={(e) => updateField('observations', e.target.value)} />
              : <div>{form.observations || '—'}</div>}
          </div>
        </div>
      )}

      {/* Tab: Beneficiarios */}
      {activeTab === 'beneficiarios' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Beneficiarios</h3>
              <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                Total asignado: <strong>{associate.beneficiaries.reduce((s, b) => s + Number(b.percentage), 0)}%</strong>
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleAddBeneficiary}>
              <Plus size={14} /> Agregar
            </button>
          </div>

          {associate.beneficiaries.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-title">Sin beneficiarios registrados</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Parentesco</th>
                  <th>Porcentaje</th>
                  <th>Teléfono</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {associate.beneficiaries.map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold">{b.fullName}</td>
                    <td>{b.relationship}</td>
                    <td><span className="badge badge-info">{b.percentage}%</span></td>
                    <td className="text-sm text-muted">{b.phone || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveBeneficiary(b.id)} title="Eliminar"
                        style={{ color: 'var(--danger-500)' }}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Historial del Asociado</h3>
          {associate.history.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-title">Sin registros</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {associate.history.map((h) => (
                <div key={h.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--gray-50)', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-400)', marginTop: '0.4rem', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="font-semibold text-sm">{h.action}</span>
                      <span className="text-xs text-muted">{formatDateTime(h.performedAt)}</span>
                    </div>
                    {h.previousStatus && h.newStatus && (
                      <div className="text-sm" style={{ margin: '0.25rem 0' }}>
                        <span className={`badge ${STATUS_BADGE[h.previousStatus] || 'badge-info'}`} style={{ fontSize: '0.7rem' }}>{STATUS_LABELS[h.previousStatus] || h.previousStatus}</span>
                        {' → '}
                        <span className={`badge ${STATUS_BADGE[h.newStatus] || 'badge-info'}`} style={{ fontSize: '0.7rem' }}>{STATUS_LABELS[h.newStatus] || h.newStatus}</span>
                      </div>
                    )}
                    {h.details && <div className="text-sm text-muted">{h.details}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Aportes */}
      {activeTab === 'aportes' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          {contributions.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-title">Sin aportes registrados</div>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/aportes/nuevo')}>Registrar Aporte</button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Monto</th><th>Método</th><th>Estado</th></tr></thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id}>
                      <td className="text-sm">{new Date(c.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="text-sm">{c.type}</td>
                      <td className="text-sm font-semibold" style={{ textAlign: 'right', color: 'var(--success-600)' }}>{fmt(c.amount)}</td>
                      <td className="text-sm text-muted">{c.paymentMethod}</td>
                      <td><span className={`badge ${c.status === 'APLICADO' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Créditos */}
      {activeTab === 'creditos' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          {credits.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-title">Sin créditos registrados</div>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/creditos/nuevo')}>Solicitar Crédito</button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>N° Crédito</th><th>Línea</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>Saldo</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {credits.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.creditNumber}</td>
                      <td className="text-sm">{c.creditLine}</td>
                      <td className="text-sm font-semibold" style={{ textAlign: 'right' }}>{fmt(c.requestedAmount)}</td>
                      <td className="text-sm" style={{ textAlign: 'right', color: Number(c.outstandingBalance) > 0 ? 'var(--danger-500)' : 'var(--success-600)' }}>{fmt(c.outstandingBalance)}</td>
                      <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{c.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/creditos/${c.id}`)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Cambiar Estado */}
      {showStatusModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} onClick={() => setShowStatusModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51,
            background: 'white', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Cambiar Estado del Asociado</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              Estado actual: <span className={`badge ${STATUS_BADGE[associate.status]}`}>{STATUS_LABELS[associate.status]}</span>
            </p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nuevo Estado *</label>
              <select style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}
                value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Seleccionar...</option>
                {validTransitions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Motivo / Observación</label>
              <textarea style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontFamily: 'inherit', minHeight: '60px' }}
                value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Razón del cambio (opcional)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowStatusModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleChangeStatus} disabled={!newStatus || changingStatus}>
                {changingStatus ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
