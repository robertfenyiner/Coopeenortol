'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, User, Briefcase, MapPin, Heart } from 'lucide-react';

interface BeneficiaryForm {
  fullName: string;
  relationship: string;
  percentage: number;
  phone: string;
}

interface CatalogItem {
  code: string;
  name: string;
}

export default function NuevoAsociadoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'contacto' | 'laboral' | 'beneficiarios'>('personal');

  // Catálogos
  const [documentTypes, setDocumentTypes] = useState<CatalogItem[]>([]);
  const [genders, setGenders] = useState<CatalogItem[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<CatalogItem[]>([]);
  const [relationships, setRelationships] = useState<CatalogItem[]>([]);
  const [housingTypes, setHousingTypes] = useState<CatalogItem[]>([]);

  // Datos personales
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');

  // Contacto y dirección
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [housingType, setHousingType] = useState('');

  // Datos laborales
  const [occupation, setOccupation] = useState('');
  const [employer, setEmployer] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  // Observaciones
  const [observations, setObservations] = useState('');

  // Beneficiarios
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryForm[]>([]);

  // Cargar catálogos
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const res = await fetch('/api/parametrizacion/catalogos');
        const json = await res.json();
        if (json.success) {
          const catalogs = json.data;
          for (const cat of catalogs) {
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
      } catch (e) {
        console.error('Error al cargar catálogos:', e);
      }
    }
    loadCatalogs();
  }, []);

  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { fullName: '', relationship: '', percentage: 0, phone: '' }]);
  };

  const updateBeneficiary = (index: number, field: keyof BeneficiaryForm, value: string | number) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + (Number(b.percentage) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body = {
        documentType,
        documentNumber,
        firstName,
        lastName,
        secondLastName: secondLastName || null,
        gender: gender || null,
        birthDate: birthDate || null,
        maritalStatus: maritalStatus || null,
        email: email || null,
        phone: phone || null,
        mobilePhone: mobilePhone || null,
        address: address || null,
        city: city || null,
        department: department || null,
        housingType: housingType || null,
        occupation: occupation || null,
        employer: employer || null,
        jobTitle: jobTitle || null,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        observations: observations || null,
        beneficiaries: beneficiaries.length > 0
          ? beneficiaries.map((b) => ({
              fullName: b.fullName,
              relationship: b.relationship,
              percentage: Number(b.percentage),
              phone: b.phone || null,
            }))
          : undefined,
      };

      const res = await fetch('/api/asociados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        router.push('/asociados');
      } else {
        setError(json.error || json.details?.join(', ') || 'Error al crear el asociado');
      }
    } catch (e) {
      setError('Error de conexión');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'personal' as const, label: 'Datos Personales', icon: User },
    { key: 'contacto' as const, label: 'Contacto y Dirección', icon: MapPin },
    { key: 'laboral' as const, label: 'Datos Laborales', icon: Briefcase },
    { key: 'beneficiarios' as const, label: 'Beneficiarios', icon: Heart },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Nuevo Asociado</h1>
            <p className="page-subtitle">Registro de un nuevo asociado a la cooperativa</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', color: 'var(--danger-700)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 500,
                  border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary-500)' : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--gray-500)',
                  marginBottom: '-2px', transition: 'all 0.2s',
                }}
              >
                <Icon size={16} /> {tab.label}
                {tab.key === 'beneficiarios' && beneficiaries.length > 0 && (
                  <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>{beneficiaries.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab: Datos Personales */}
        {activeTab === 'personal' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Documento *</label>
                <select className="form-select" value={documentType} onChange={(e) => setDocumentType(e.target.value)} required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                  {documentTypes.length > 0 ? documentTypes.map((t) => (
                    <option key={t.code} value={t.code}>{t.name}</option>
                  )) : (
                    <>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="PP">Pasaporte</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Número de Documento *</label>
                <input className="form-input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required placeholder="Ej: 1234567890"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Primer Nombre *</label>
                <input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Nombre"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Primer Apellido *</label>
                <input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Apellido"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Segundo Apellido</label>
                <input className="form-input" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)} placeholder="Opcional"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Género</label>
                <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                  <option value="">Seleccionar...</option>
                  {genders.length > 0 ? genders.map((g) => (
                    <option key={g.code} value={g.code}>{g.name}</option>
                  )) : (
                    <>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Nacimiento</label>
                <input type="date" className="form-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado Civil</label>
                <select className="form-select" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                  <option value="">Seleccionar...</option>
                  {maritalStatuses.length > 0 ? maritalStatuses.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  )) : (
                    <>
                      <option value="SOLTERO">Soltero(a)</option>
                      <option value="CASADO">Casado(a)</option>
                      <option value="UNION_LIBRE">Unión Libre</option>
                      <option value="DIVORCIADO">Divorciado(a)</option>
                      <option value="VIUDO">Viudo(a)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Contacto y Dirección */}
        {activeTab === 'contacto' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono Fijo</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 6012345678"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="form-input" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="Ej: 3001234567"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Dirección</label>
                <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección completa"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Ciudad / Municipio</label>
                <input className="form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <input className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Departamento"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Vivienda</label>
                <select className="form-select" value={housingType} onChange={(e) => setHousingType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                  <option value="">Seleccionar...</option>
                  {housingTypes.length > 0 ? housingTypes.map((h) => (
                    <option key={h.code} value={h.code}>{h.name}</option>
                  )) : (
                    <>
                      <option value="PROPIA">Propia</option>
                      <option value="ARRENDADA">Arrendada</option>
                      <option value="FAMILIAR">Familiar</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Datos Laborales */}
        {activeTab === 'laboral' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ocupación</label>
                <input className="form-input" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Ej: Empleado, Independiente..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <input className="form-input" value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Nombre de la empresa"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <input className="form-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Cargo o puesto"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Ingreso Mensual (COP)</label>
                <input type="number" className="form-input" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0" min="0" step="1000"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Observaciones</label>
              <textarea className="form-textarea" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Notas adicionales sobre el asociado..."
                rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-200)', resize: 'vertical', fontFamily: 'inherit' }} />
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
                  Porcentaje total asignado: <strong style={{ color: totalPercentage > 100 ? 'var(--danger-500)' : 'var(--success-500)' }}>{totalPercentage}%</strong>
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addBeneficiary}>
                <Plus size={14} /> Agregar
              </button>
            </div>

            {beneficiaries.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-title">Sin beneficiarios</div>
                <div className="empty-state-text">Puede agregar beneficiarios opcionalmente</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {beneficiaries.map((b, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px 130px auto', gap: '0.5rem', alignItems: 'end', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Nombre Completo *</label>
                      <input className="form-input" value={b.fullName} onChange={(e) => updateBeneficiary(i, 'fullName', e.target.value)} placeholder="Nombre completo" required
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Parentesco *</label>
                      <select className="form-select" value={b.relationship} onChange={(e) => updateBeneficiary(i, 'relationship', e.target.value)} required
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.85rem' }}>
                        <option value="">Seleccionar</option>
                        {relationships.length > 0 ? relationships.map((r) => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        )) : (
                          <>
                            <option value="CONYUGE">Cónyuge</option>
                            <option value="HIJO">Hijo(a)</option>
                            <option value="PADRE_MADRE">Padre/Madre</option>
                            <option value="HERMANO">Hermano(a)</option>
                            <option value="OTRO">Otro</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>% *</label>
                      <input type="number" className="form-input" value={b.percentage} onChange={(e) => updateBeneficiary(i, 'percentage', parseFloat(e.target.value) || 0)}
                        min="0.01" max="100" step="0.01" required
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Teléfono</label>
                      <input className="form-input" value={b.phone} onChange={(e) => updateBeneficiary(i, 'phone', e.target.value)} placeholder="Teléfono"
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.85rem' }} />
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeBeneficiary(i)} title="Eliminar"
                      style={{ color: 'var(--danger-500)', marginBottom: '2px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Barra de acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Registrar Asociado'}
          </button>
        </div>
      </form>
    </div>
  );
}
