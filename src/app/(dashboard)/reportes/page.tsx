'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, Users, DollarSign, Landmark, Calendar } from 'lucide-react';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  endpoint: string;
  filters: Array<{ key: string; label: string; type: 'select' | 'date' | 'text'; options?: Array<{ value: string; label: string }> }>;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'associates',
    title: 'Reporte de Asociados',
    description: 'Listado completo de asociados con sus datos personales y estado',
    icon: Users,
    color: 'var(--primary-500)',
    endpoint: '/api/asociados',
    filters: [
      { key: 'status', label: 'Estado', type: 'select', options: [
        { value: '', label: 'Todos' }, { value: 'ACTIVO', label: 'Activos' },
        { value: 'PENDIENTE', label: 'Pendientes' }, { value: 'INACTIVO', label: 'Inactivos' },
        { value: 'RETIRADO', label: 'Retirados' },
      ]},
    ],
  },
  {
    id: 'contributions',
    title: 'Reporte de Aportes',
    description: 'Detalle de aportes registrados con montos y asociados',
    icon: DollarSign,
    color: 'var(--success-500)',
    endpoint: '/api/aportes',
    filters: [
      { key: 'type', label: 'Tipo', type: 'select', options: [
        { value: '', label: 'Todos' }, { value: 'ORDINARIO', label: 'Ordinario' },
        { value: 'EXTRAORDINARIO', label: 'Extraordinario' }, { value: 'CUOTA_INGRESO', label: 'Cuota Ingreso' },
      ]},
      { key: 'dateFrom', label: 'Desde', type: 'date' },
      { key: 'dateTo', label: 'Hasta', type: 'date' },
    ],
  },
  {
    id: 'credits',
    title: 'Reporte de Créditos',
    description: 'Estado de la cartera de créditos con saldos',
    icon: Landmark,
    color: 'var(--info-500)',
    endpoint: '/api/creditos',
    filters: [
      { key: 'status', label: 'Estado', type: 'select', options: [
        { value: '', label: 'Todos' }, { value: 'VIGENTE', label: 'Vigentes' },
        { value: 'VENCIDO', label: 'Vencidos' }, { value: 'PAGADO', label: 'Pagados' },
        { value: 'SOLICITUD', label: 'Solicitudes' },
      ]},
    ],
  },
  {
    id: 'overdue',
    title: 'Reporte de Cartera Vencida',
    description: 'Créditos con cuotas vencidas y saldos pendientes',
    icon: Calendar,
    color: 'var(--danger-500)',
    endpoint: '/api/creditos',
    filters: [],
  },
];

export default function ReportesPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});

  const inputStyle: React.CSSProperties = { padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--gray-200)', fontSize: '0.85rem', background: 'var(--gray-50)' };

  const setFilter = (reportId: string, key: string, value: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [reportId]: { ...(prev[reportId] || {}), [key]: value },
    }));
  };

  const generateCSV = async (report: ReportConfig) => {
    setGenerating(report.id);
    try {
      const params = new URLSearchParams({ pageSize: '10000' });
      const filters = filterValues[report.id] || {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      // Para cartera vencida, filtrar solo VENCIDO
      if (report.id === 'overdue') params.set('status', 'VENCIDO');

      const res = await fetch(`${report.endpoint}?${params}`);
      const json = await res.json();

      if (!json.success || !json.data?.data?.length) {
        alert('No hay datos para exportar con los filtros seleccionados');
        return;
      }

      const rows = json.data.data;
      let csvContent = '';
      let headers: string[] = [];
      let csvRows: string[][] = [];

      if (report.id === 'associates') {
        headers = ['N° Asociado', 'Documento', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Estado', 'Fecha Registro'];
        csvRows = rows.map((r: Record<string, unknown>) => {
          const p = r.person as Record<string, unknown>;
          return [
            String(r.associateNumber || ''),
            String(p?.documentNumber || ''),
            String(p?.firstName || ''),
            String(p?.lastName || ''),
            String(p?.email || ''),
            String(p?.mobilePhone || p?.phone || ''),
            String(r.status || ''),
            r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString('es-CO') : '',
          ];
        });
      } else if (report.id === 'contributions') {
        headers = ['Fecha', 'N° Asociado', 'Nombre', 'Tipo', 'Monto', 'Método Pago', 'Referencia'];
        csvRows = rows.map((r: Record<string, unknown>) => {
          const a = r.associate as Record<string, unknown>;
          const p = a?.person as Record<string, unknown>;
          return [
            r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString('es-CO') : '',
            String(a?.associateNumber || ''),
            `${p?.firstName || ''} ${p?.lastName || ''}`,
            String(r.type || ''),
            String(r.amount || '0'),
            String(r.paymentMethod || ''),
            String(r.reference || ''),
          ];
        });
      } else {
        headers = ['N° Crédito', 'N° Asociado', 'Nombre', 'Línea', 'Estado', 'Monto', 'Saldo', 'Tasa', 'Plazo'];
        csvRows = rows.map((r: Record<string, unknown>) => {
          const a = r.associate as Record<string, unknown>;
          const p = a?.person as Record<string, unknown>;
          return [
            String(r.creditNumber || ''),
            String(a?.associateNumber || ''),
            `${p?.firstName || ''} ${p?.lastName || ''}`,
            String(r.creditLine || ''),
            String(r.status || ''),
            String(r.requestedAmount || '0'),
            String(r.outstandingBalance || '0'),
            String(r.interestRate || '0'),
            `${r.termMonths || 0} meses`,
          ];
        });
      }

      csvContent = '\uFEFF'; // BOM for Excel
      csvContent += headers.join(';') + '\n';
      csvRows.forEach((row) => {
        csvContent += row.map((v) => `"${v.replace(/"/g, '""')}"`).join(';') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Error al generar reporte');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Genera y descarga reportes de la cooperativa en formato CSV</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
        {REPORTS.map((report) => (
          <div key={report.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${report.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  {report.filters.map((f) => (
                    <div key={f.key}>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>{f.label}</label>
                      {f.type === 'select' ? (
                        <select style={inputStyle} value={filterValues[report.id]?.[f.key] || ''} onChange={(e) => setFilter(report.id, f.key, e.target.value)}>
                          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} style={{ ...inputStyle, minWidth: '130px' }}
                          value={filterValues[report.id]?.[f.key] || ''}
                          onChange={(e) => setFilter(report.id, f.key, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                onClick={() => generateCSV(report)} disabled={generating === report.id}>
                {generating === report.id ? (
                  <><FileSpreadsheet size={14} /> Generando...</>
                ) : (
                  <><Download size={14} /> Descargar CSV</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
