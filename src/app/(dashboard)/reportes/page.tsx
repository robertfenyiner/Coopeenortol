'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';

type ReportFormat = 'csv' | 'excel' | 'pdf';
type FilterType = 'select' | 'date';

interface ReportConfig {
  id: 'associates' | 'contributions' | 'credits' | 'overdue';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  filters: Array<{
    key: string;
    label: string;
    type: FilterType;
    options?: Array<{ value: string; label: string }>;
  }>;
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

interface AssociatesApiResponse {
  success: boolean;
  data?: {
    data: AssociateOption[];
  };
  error?: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'associates',
    title: 'Reporte de Asociados',
    description: 'Listado completo de asociados con datos personales y estado',
    icon: Users,
    color: 'var(--primary-500)',
    filters: [
      { key: 'status', label: 'Estado', type: 'select', options: [
        { value: '', label: 'Todos' },
        { value: 'ACTIVO', label: 'Activos' },
        { value: 'PENDIENTE', label: 'Pendientes' },
        { value: 'INACTIVO', label: 'Inactivos' },
        { value: 'RETIRADO', label: 'Retirados' },
      ] },
    ],
  },
  {
    id: 'contributions',
    title: 'Reporte de Aportes',
    description: 'Detalle de aportes registrados por fecha, tipo y asociado',
    icon: Wallet,
    color: 'var(--success-500)',
    filters: [
      { key: 'type', label: 'Tipo', type: 'select', options: [
        { value: '', label: 'Todos' },
        { value: 'ORDINARIO', label: 'Ordinario' },
        { value: 'EXTRAORDINARIO', label: 'Extraordinario' },
        { value: 'CUOTA_INGRESO', label: 'Cuota Ingreso' },
      ] },
      { key: 'dateFrom', label: 'Desde', type: 'date' },
      { key: 'dateTo', label: 'Hasta', type: 'date' },
    ],
  },
  {
    id: 'credits',
    title: 'Reporte de Creditos',
    description: 'Estado de creditos, montos aprobados, saldos y plazo',
    icon: Landmark,
    color: 'var(--info-500)',
    filters: [
      { key: 'status', label: 'Estado', type: 'select', options: [
        { value: '', label: 'Todos' },
        { value: 'VIGENTE', label: 'Vigentes' },
        { value: 'VENCIDO', label: 'Vencidos' },
        { value: 'PAGADO', label: 'Pagados' },
        { value: 'SOLICITUD', label: 'Solicitudes' },
      ] },
    ],
  },
  {
    id: 'overdue',
    title: 'Reporte de Cartera Vencida',
    description: 'Creditos vencidos con saldo pendiente',
    icon: Calendar,
    color: 'var(--danger-500)',
    filters: [],
  },
];

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  borderRadius: '6px',
  border: '1px solid var(--gray-200)',
  fontSize: '0.85rem',
  background: 'var(--gray-50)',
};

function fullName(associate: AssociateOption) {
  return `${associate.person.firstName} ${associate.person.lastName} ${associate.person.secondLastName || ''}`.trim();
}

function fileNameFromDisposition(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}

export default function ReportesPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});
  const [associates, setAssociates] = useState<AssociateOption[]>([]);
  const [certificateAssociateId, setCertificateAssociateId] = useState('');
  const [certificateYear, setCertificateYear] = useState(String(new Date().getFullYear() - 1));
  const [certificateFormat, setCertificateFormat] = useState<'pdf' | 'excel'>('pdf');
  const [message, setMessage] = useState<string | null>(null);

  const fetchAssociates = useCallback(async () => {
    const response = await fetch('/api/asociados?pageSize=100&status=ACTIVO');
    const json = await response.json() as AssociatesApiResponse;
    if (json.success && json.data) {
      setAssociates(json.data.data);
      if (!certificateAssociateId && json.data.data[0]) {
        setCertificateAssociateId(json.data.data[0].id);
      }
    }
  }, [certificateAssociateId]);

  useEffect(() => {
    fetchAssociates();
  }, [fetchAssociates]);

  function setFilter(reportId: string, key: string, value: string) {
    setFilterValues((prev) => ({
      ...prev,
      [reportId]: { ...(prev[reportId] || {}), [key]: value },
    }));
  }

  async function downloadFromUrl(url: string, fallbackName: string) {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'No se pudo generar el archivo');
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileNameFromDisposition(response.headers.get('Content-Disposition'), fallbackName);
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function generateReport(report: ReportConfig, format: ReportFormat) {
    setGenerating(`${report.id}-${format}`);
    setMessage(null);
    try {
      const params = new URLSearchParams({ report: report.id, format });
      const filters = filterValues[report.id] || {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      await downloadFromUrl(`/api/reportes/exportar?${params}`, `${report.id}.${format}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al generar reporte');
    } finally {
      setGenerating(null);
    }
  }

  async function generateCertificate() {
    setGenerating('tax-certificate');
    setMessage(null);
    try {
      const params = new URLSearchParams({
        associateId: certificateAssociateId,
        year: certificateYear,
        format: certificateFormat,
      });
      await downloadFromUrl(`/api/reportes/certificado-tributario?${params}`, `certificado_tributario.${certificateFormat}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al generar certificado');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Exporta reportes operativos en CSV, Excel y PDF, y emite certificados tributarios</p>
        </div>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeCheck size={20} style={{ color: 'var(--accent-600)' }} />
          </div>
          <div>
            <span className="card-title">Certificado Tributario</span>
            <div className="text-xs text-muted">Resumen anual de aportes, intereses pagados, rendimientos y retenciones</div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>Asociado</label>
            <select style={{ ...inputStyle, minWidth: '260px' }} value={certificateAssociateId} onChange={(event) => setCertificateAssociateId(event.target.value)}>
              {associates.map((associate) => (
                <option key={associate.id} value={associate.id}>
                  {associate.associateNumber} - {fullName(associate)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>Año gravable</label>
            <input
              type="number"
              min="2000"
              max="2100"
              style={{ ...inputStyle, width: '120px' }}
              value={certificateYear}
              onChange={(event) => setCertificateYear(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>Formato</label>
            <select style={inputStyle} value={certificateFormat} onChange={(event) => setCertificateFormat(event.target.value as 'pdf' | 'excel')}>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateCertificate} disabled={!certificateAssociateId || generating === 'tax-certificate'}>
            <Download size={14} /> {generating === 'tax-certificate' ? 'Generando...' : 'Generar certificado'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
        {REPORTS.map((report) => (
          <div key={report.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: `${report.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <report.icon size={20} style={{ color: report.color }} />
              </div>
              <div>
                <span className="card-title">{report.title}</span>
                <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{report.description}</div>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {report.filters.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {report.filters.map((filter) => (
                    <div key={filter.key}>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>{filter.label}</label>
                      {filter.type === 'select' ? (
                        <select style={inputStyle} value={filterValues[report.id]?.[filter.key] || ''} onChange={(event) => setFilter(report.id, filter.key, event.target.value)}>
                          {filter.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : (
                        <input
                          type="date"
                          style={{ ...inputStyle, minWidth: '130px' }}
                          value={filterValues[report.id]?.[filter.key] || ''}
                          onChange={(event) => setFilter(report.id, filter.key, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => generateReport(report, 'csv')} disabled={generating === `${report.id}-csv`}>
                  <FileText size={14} /> CSV
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => generateReport(report, 'excel')} disabled={generating === `${report.id}-excel`}>
                  <Table2 size={14} /> Excel
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => generateReport(report, 'pdf')} disabled={generating === `${report.id}-pdf`}>
                  <FileSpreadsheet size={14} /> PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
