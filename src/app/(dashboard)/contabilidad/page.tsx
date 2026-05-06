'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpenCheck,
  FilePlus2,
  GitBranch,
  ListTree,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nature: string;
  level: number;
  isMovement: boolean;
  isActive: boolean;
}

interface AccountingRule {
  id: string;
  code: string;
  name: string;
  module: string;
  event: string;
  debitAccount: ChartAccount;
  creditAccount: ChartAccount;
  isActive: boolean;
}

interface JournalLine {
  id: string;
  lineNumber: number;
  debit: string;
  credit: string;
  description: string | null;
  account: ChartAccount;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceModule: string | null;
  sourceEvent: string | null;
  status: string;
  totalDebit: string;
  totalCredit: string;
  lines: JournalLine[];
}

function formatCurrency(value: string | number) {
  return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState<'asientos' | 'cuentas' | 'reglas'>('asientos');
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [rules, setRules] = useState<AccountingRule[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [sourceModule, setSourceModule] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    accountType: 'ACTIVO',
    nature: 'DEBIT',
    level: 6,
    isMovement: true,
  });
  const [ruleForm, setRuleForm] = useState({
    code: '',
    name: '',
    module: 'contributions',
    event: '',
    debitAccountId: '',
    creditAccountId: '',
    description: '',
  });

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/contabilidad/cuentas');
    const json = await res.json();
    if (json.success) {
      setAccounts(json.data);
      if (!ruleForm.debitAccountId && json.data[0]) {
        setRuleForm((prev) => ({
          ...prev,
          debitAccountId: json.data[0].id,
          creditAccountId: json.data[1]?.id || json.data[0].id,
        }));
      }
    }
  }, [ruleForm.debitAccountId]);

  const fetchRules = useCallback(async () => {
    const res = await fetch('/api/contabilidad/reglas');
    const json = await res.json();
    if (json.success) setRules(json.data);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (search) params.set('search', search);
      if (sourceModule) params.set('sourceModule', sourceModule);
      const res = await fetch(`/api/contabilidad/asientos?${params}`);
      const json = await res.json();
      if (json.success) setEntries(json.data.data);
    } finally {
      setLoading(false);
    }
  }, [search, sourceModule]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchRules(); }, [fetchRules]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function handleCreateAccount() {
    setMessage(null);
    const res = await fetch('/api/contabilidad/cuentas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear la cuenta');
    setShowAccountModal(false);
    setAccountForm({ code: '', name: '', accountType: 'ACTIVO', nature: 'DEBIT', level: 6, isMovement: true });
    await fetchAccounts();
  }

  async function handleCreateRule() {
    setMessage(null);
    const res = await fetch('/api/contabilidad/reglas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleForm),
    });
    const json = await res.json();
    if (!json.success) return setMessage(json.error || 'No se pudo crear la regla');
    setShowRuleModal(false);
    setRuleForm({ code: '', name: '', module: 'contributions', event: '', debitAccountId: accounts[0]?.id || '', creditAccountId: accounts[1]?.id || '', description: '' });
    await fetchRules();
  }

  const totalDebit = entries.reduce((sum, entry) => sum + Number(entry.totalDebit), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contabilidad</h1>
          <p className="page-subtitle">Plan de cuentas, reglas de contabilización y asientos automáticos</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowAccountModal(true)}>
            <Plus size={16} /> Cuenta
          </button>
          <button className="btn btn-primary" onClick={() => setShowRuleModal(true)} disabled={accounts.length < 2}>
            <Settings2 size={16} /> Regla
          </button>
        </div>
      </div>

      {message && <div className="toast toast-error" style={{ position: 'static', marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue"><BookOpenCheck size={22} /></div><div><div className="stat-value">{entries.length}</div><div className="stat-label">Asientos recientes</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><ListTree size={22} /></div><div><div className="stat-value">{accounts.length}</div><div className="stat-label">Cuentas activas</div></div></div>
        <div className="stat-card"><div className="stat-icon amber"><GitBranch size={22} /></div><div><div className="stat-value">{rules.length}</div><div className="stat-label">Reglas automáticas</div></div></div>
        <div className="stat-card"><div className="stat-icon red"><FilePlus2 size={22} /></div><div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(totalDebit)}</div><div className="stat-label">Débito reciente</div></div></div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="table-toolbar">
          <div className="flex gap-2">
            <button className={`btn ${activeTab === 'asientos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('asientos')}>Asientos</button>
            <button className={`btn ${activeTab === 'cuentas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('cuentas')}>PUC</button>
            <button className={`btn ${activeTab === 'reglas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('reglas')}>Reglas</button>
          </div>
          {activeTab === 'asientos' && (
            <div className="flex gap-2">
              <div className="table-search">
                <Search className="table-search-icon" size={16} />
                <input className="table-search-input" placeholder="Buscar asiento..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className="form-input form-select" value={sourceModule} onChange={(event) => setSourceModule(event.target.value)} style={{ maxWidth: '180px' }}>
                <option value="">Todos</option>
                <option value="contributions">Aportes</option>
                <option value="credits">Créditos</option>
                <option value="cdats">CDATs</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'asientos' && (
        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading-center"><div className="loading-spinner"></div></div> : (
              <table className="data-table">
                <thead><tr><th>Asiento</th><th>Fecha</th><th>Descripción</th><th>Origen</th><th className="text-right">Débito</th><th className="text-right">Crédito</th><th>Estado</th></tr></thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-semibold">{entry.entryNumber}</td>
                      <td>{formatDate(entry.entryDate)}</td>
                      <td>{entry.description}</td>
                      <td><span className="badge badge-info">{entry.sourceModule || 'manual'}</span></td>
                      <td className="text-right">{formatCurrency(entry.totalDebit)}</td>
                      <td className="text-right">{formatCurrency(entry.totalCredit)}</td>
                      <td><span className="badge badge-success">{entry.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cuentas' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Naturaleza</th><th>Nivel</th><th>Movimiento</th></tr></thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-semibold">{account.code}</td>
                    <td>{account.name}</td>
                    <td>{account.accountType}</td>
                    <td>{account.nature === 'DEBIT' ? 'Débito' : 'Crédito'}</td>
                    <td>{account.level}</td>
                    <td><span className={`badge ${account.isMovement ? 'badge-success' : 'badge-neutral'}`}>{account.isMovement ? 'Sí' : 'No'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reglas' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Regla</th><th>Módulo</th><th>Evento</th><th>Débito</th><th>Crédito</th><th>Estado</th></tr></thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><div className="font-semibold">{rule.name}</div><div className="text-xs text-muted">{rule.code}</div></td>
                    <td>{rule.module}</td>
                    <td>{rule.event}</td>
                    <td>{rule.debitAccount.code} · {rule.debitAccount.name}</td>
                    <td>{rule.creditAccount.code} · {rule.creditAccount.name}</td>
                    <td><span className={`badge ${rule.isActive ? 'badge-success' : 'badge-neutral'}`}>{rule.isActive ? 'Activa' : 'Inactiva'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h2 className="modal-title">Cuenta contable</h2><button className="modal-close" onClick={() => setShowAccountModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Código PUC</label><input className="form-input" value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} /></div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Tipo</label><select className="form-input form-select" value={accountForm.accountType} onChange={(event) => setAccountForm({ ...accountForm, accountType: event.target.value })}><option value="ACTIVO">Activo</option><option value="PASIVO">Pasivo</option><option value="PATRIMONIO">Patrimonio</option><option value="INGRESO">Ingreso</option><option value="GASTO">Gasto</option><option value="COSTO">Costo</option></select></div>
                <div className="form-group w-full"><label className="form-label">Naturaleza</label><select className="form-input form-select" value={accountForm.nature} onChange={(event) => setAccountForm({ ...accountForm, nature: event.target.value })}><option value="DEBIT">Débito</option><option value="CREDIT">Crédito</option></select></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCreateAccount}>Guardar</button></div>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h2 className="modal-title">Regla contable</h2><button className="modal-close" onClick={() => setShowRuleModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={ruleForm.code} onChange={(event) => setRuleForm({ ...ruleForm, code: event.target.value.toUpperCase() })} /></div>
              <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={ruleForm.name} onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })} /></div>
              <div className="flex gap-3">
                <div className="form-group w-full"><label className="form-label">Módulo</label><input className="form-input" value={ruleForm.module} onChange={(event) => setRuleForm({ ...ruleForm, module: event.target.value })} /></div>
                <div className="form-group w-full"><label className="form-label">Evento</label><input className="form-input" value={ruleForm.event} onChange={(event) => setRuleForm({ ...ruleForm, event: event.target.value.toUpperCase() })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Cuenta débito</label><select className="form-input form-select" value={ruleForm.debitAccountId} onChange={(event) => setRuleForm({ ...ruleForm, debitAccountId: event.target.value })}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Cuenta crédito</label><select className="form-input form-select" value={ruleForm.creditAccountId} onChange={(event) => setRuleForm({ ...ruleForm, creditAccountId: event.target.value })}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCreateRule}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
