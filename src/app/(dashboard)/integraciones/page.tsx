'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CloudCog, Mail, MessageCircle, Plus, Send, ServerCog } from 'lucide-react';

interface IntegrationStatus {
  storage: { provider: string; bucket: string | null; configured: boolean };
  email: { enabled: boolean; provider: string };
  whatsapp: { enabled: boolean; provider: string };
}

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  provider: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Template {
  id: string;
  code: string;
  name: string;
  channel: string;
  subject: string | null;
  isActive: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_BADGES: Record<string, string> = {
  ENVIADO: 'badge-success',
  OMITIDO: 'badge-neutral',
  FALLIDO: 'badge-danger',
  PENDIENTE: 'badge-warning',
};

export default function IntegracionesPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [testForm, setTestForm] = useState({
    channel: 'EMAIL',
    recipient: '',
    subject: 'Prueba CoopManager',
    body: 'Mensaje de prueba desde CoopManager.',
  });
  const [templateForm, setTemplateForm] = useState({
    code: '',
    name: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
  });

  const fetchAll = useCallback(async () => {
    const [statusRes, logsRes, templatesRes] = await Promise.all([
      fetch('/api/integraciones/estado'),
      fetch('/api/integraciones/notificaciones'),
      fetch('/api/integraciones/plantillas'),
    ]);
    const [statusJson, logsJson, templatesJson] = await Promise.all([
      statusRes.json(),
      logsRes.json(),
      templatesRes.json(),
    ]);
    if (statusJson.success) setStatus(statusJson.data);
    if (logsJson.success) setLogs(logsJson.data.data);
    if (templatesJson.success) setTemplates(templatesJson.data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchAll();
    });
  }, [fetchAll]);

  async function handleSendTest() {
    setMessage(null);
    const res = await fetch('/api/integraciones/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo enviar');
    await fetchAll();
  }

  async function handleCreateTemplate() {
    setMessage(null);
    const res = await fetch('/api/integraciones/plantillas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear la plantilla');
    setShowTemplateModal(false);
    setTemplateForm({ code: '', name: '', channel: 'EMAIL', subject: '', body: '' });
    await fetchAll();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integraciones</h1>
          <p className="page-subtitle">Cloud storage, email, WhatsApp y trazabilidad de notificaciones</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}>
          <Plus size={16} /> Plantilla
        </button>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue"><CloudCog size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.15rem' }}>{status?.storage.provider || '-'}</div><div className="stat-label">Storage activo</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><Mail size={22} /></div><div><div className="stat-value">{status?.email.enabled ? 'On' : 'Off'}</div><div className="stat-label">Email</div></div></div>
        <div className="stat-card"><div className="stat-icon amber"><MessageCircle size={22} /></div><div><div className="stat-value">{status?.whatsapp.enabled ? 'On' : 'Off'}</div><div className="stat-label">WhatsApp</div></div></div>
        <div className="stat-card"><div className="stat-icon red"><BellRing size={22} /></div><div><div className="stat-value">{logs.length}</div><div className="stat-label">Eventos recientes</div></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><h2 className="card-title">Prueba Manual</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Canal</label>
              <select className="form-input form-select" value={testForm.channel} onChange={(event) => setTestForm({ ...testForm, channel: event.target.value })}>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Destinatario</label><input className="form-input" value={testForm.recipient} onChange={(event) => setTestForm({ ...testForm, recipient: event.target.value })} /></div>
            <div className="form-group"><label className="form-label">Asunto</label><input className="form-input" value={testForm.subject} onChange={(event) => setTestForm({ ...testForm, subject: event.target.value })} /></div>
            <div className="form-group"><label className="form-label">Mensaje</label><textarea className="form-input" rows={5} value={testForm.body} onChange={(event) => setTestForm({ ...testForm, body: event.target.value })} /></div>
            <button className="btn btn-primary btn-block" onClick={handleSendTest}><Send size={16} /> Enviar prueba</button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Logs de Notificación</h2></div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Canal</th><th>Destino</th><th>Proveedor</th><th>Estado</th><th>Error</th></tr></thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>{log.channel}</td>
                      <td>{log.recipient}</td>
                      <td>{log.provider || '-'}</td>
                      <td><span className={`badge ${STATUS_BADGES[log.status] || 'badge-neutral'}`}>{log.status}</span></td>
                      <td className="text-xs text-muted">{log.errorMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Plantillas</h2></div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Nombre</th><th>Canal</th><th>Asunto</th><th>Estado</th></tr></thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="font-semibold">{template.code}</td>
                      <td>{template.name}</td>
                      <td>{template.channel}</td>
                      <td>{template.subject || '-'}</td>
                      <td><span className={`badge ${template.isActive ? 'badge-success' : 'badge-neutral'}`}>{template.isActive ? 'Activa' : 'Inactiva'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h2 className="modal-title">Plantilla de notificación</h2><button className="modal-close" onClick={() => setShowTemplateModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={templateForm.code} onChange={(event) => setTemplateForm({ ...templateForm, code: event.target.value.toUpperCase() })} /></div>
              <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Canal</label><select className="form-input form-select" value={templateForm.channel} onChange={(event) => setTemplateForm({ ...templateForm, channel: event.target.value })}><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></div>
              <div className="form-group"><label className="form-label">Asunto</label><input className="form-input" value={templateForm.subject} onChange={(event) => setTemplateForm({ ...templateForm, subject: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Cuerpo</label><textarea className="form-input" rows={7} value={templateForm.body} onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCreateTemplate}><ServerCog size={16} /> Guardar</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*='grid-template-columns'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
