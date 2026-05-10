// ============================================================
// CoopManager - System Constants
// ============================================================

export const APP_NAME = process.env.APP_NAME || 'Coopeenortol';

// Security
export const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
export const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES || '15');
export const SESSION_MAX_AGE_HOURS = parseInt(process.env.SESSION_MAX_AGE_HOURS || '8');
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Audit Actions
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  ROLE_UNASSIGN: 'ROLE_UNASSIGN',
  PERMISSION_ASSIGN: 'PERMISSION_ASSIGN',
  STATUS_CHANGE: 'STATUS_CHANGE',
  EXPORT: 'EXPORT',
  // Asociados
  ADMISSION: 'ADMISSION',
  WITHDRAWAL: 'WITHDRAWAL',
  SUSPENSION: 'SUSPENSION',
  REACTIVATION: 'REACTIVATION',
  // Aportes
  CONTRIBUTION: 'CONTRIBUTION',
  VOID_CONTRIBUTION: 'VOID_CONTRIBUTION',
  // Créditos
  CREDIT_REQUEST: 'CREDIT_REQUEST',
  CREDIT_APPROVE: 'CREDIT_APPROVE',
  CREDIT_REJECT: 'CREDIT_REJECT',
  CREDIT_DISBURSE: 'CREDIT_DISBURSE',
  CREDIT_PAYMENT: 'CREDIT_PAYMENT',
  CREDIT_SCORE_EVALUATE: 'CREDIT_SCORE_EVALUATE',
  CREDIT_CODEBTOR_ADD: 'CREDIT_CODEBTOR_ADD',
  CREDIT_CODEBTOR_REMOVE: 'CREDIT_CODEBTOR_REMOVE',
  CREDIT_REFINANCE: 'CREDIT_REFINANCE',
  // Cartera
  PORTFOLIO_PROVISION_CALCULATE: 'PORTFOLIO_PROVISION_CALCULATE',
  PAYMENT_AGREEMENT_CREATE: 'PAYMENT_AGREEMENT_CREATE',
  PAYMENT_AGREEMENT_STATUS_CHANGE: 'PAYMENT_AGREEMENT_STATUS_CHANGE',
  // Asambleas
  ASSEMBLY_CREATE: 'ASSEMBLY_CREATE',
  ASSEMBLY_STATUS_CHANGE: 'ASSEMBLY_STATUS_CHANGE',
  ASSEMBLY_ENABLE_ATTENDANCE: 'ASSEMBLY_ENABLE_ATTENDANCE',
  ASSEMBLY_VOTE_CREATE: 'ASSEMBLY_VOTE_CREATE',
  ASSEMBLY_VOTE_STATUS_CHANGE: 'ASSEMBLY_VOTE_STATUS_CHANGE',
  ASSEMBLY_BALLOT_CAST: 'ASSEMBLY_BALLOT_CAST',
  // Libranzas
  PAYROLL_BATCH_CREATE: 'PAYROLL_BATCH_CREATE',
  PAYROLL_FILE_GENERATE: 'PAYROLL_FILE_GENERATE',
  PAYROLL_BATCH_SEND: 'PAYROLL_BATCH_SEND',
  PAYROLL_CONCILIATION: 'PAYROLL_CONCILIATION',
  // CDATs
  CDAT_PRODUCT_CREATE: 'CDAT_PRODUCT_CREATE',
  CDAT_INVESTMENT_CREATE: 'CDAT_INVESTMENT_CREATE',
  CDAT_INVESTMENT_REDEEM: 'CDAT_INVESTMENT_REDEEM',
  CDAT_INVESTMENT_CANCEL: 'CDAT_INVESTMENT_CANCEL',
  // Contabilidad
  ACCOUNT_CREATE: 'ACCOUNT_CREATE',
  ACCOUNTING_RULE_CREATE: 'ACCOUNTING_RULE_CREATE',
  JOURNAL_ENTRY_POST: 'JOURNAL_ENTRY_POST',
  JOURNAL_ENTRY_VOID: 'JOURNAL_ENTRY_VOID',
  // Portal asociado
  PORTAL_ACCESS: 'PORTAL_ACCESS',
  PORTAL_DOWNLOAD: 'PORTAL_DOWNLOAD',
  // Integraciones
  STORAGE_UPLOAD: 'STORAGE_UPLOAD',
  NOTIFICATION_SEND: 'NOTIFICATION_SEND',
  NOTIFICATION_TEMPLATE_CREATE: 'NOTIFICATION_TEMPLATE_CREATE',
  // Documentos
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  // Recaudos
  RECEIPT_CREATE: 'RECEIPT_CREATE',
  RECEIPT_VOID: 'RECEIPT_VOID',
  // Fondos sociales
  SOCIAL_FUND_CREATE: 'SOCIAL_FUND_CREATE',
  SOCIAL_FUND_UPDATE: 'SOCIAL_FUND_UPDATE',
  // Reportes
  REPORT_EXPORT: 'REPORT_EXPORT',
  TAX_CERTIFICATE_GENERATE: 'TAX_CERTIFICATE_GENERATE',
  // Tesorería
  BANK_ACCOUNT_CREATE: 'BANK_ACCOUNT_CREATE',
  BANK_ACCOUNT_UPDATE: 'BANK_ACCOUNT_UPDATE',
  BANK_TRANSACTION_CREATE: 'BANK_TRANSACTION_CREATE',
  BANK_TRANSACTION_IMPORT: 'BANK_TRANSACTION_IMPORT',
  BANK_RECONCILIATION_CREATE: 'BANK_RECONCILIATION_CREATE',
  BANK_RECONCILIATION_COMPLETE: 'BANK_RECONCILIATION_COMPLETE',
  CASH_REGISTER_CREATE: 'CASH_REGISTER_CREATE',
  CASH_REGISTER_OPEN: 'CASH_REGISTER_OPEN',
  CASH_REGISTER_CLOSE: 'CASH_REGISTER_CLOSE',
  CASH_MOVEMENT_CREATE: 'CASH_MOVEMENT_CREATE',
} as const;

// Modules
export const MODULES = {
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
  USERS: 'users',
  ROLES: 'roles',
  PARAMS: 'params',
  AUDIT: 'audit',
  SYSTEM: 'system',
  ASSOCIATES: 'associates',
  DOCUMENTS: 'documents',
  CONTRIBUTIONS: 'contributions',
  RECEIPTS: 'receipts',
  CREDITS: 'credits',
  PAYROLL: 'payroll',
  CDATS: 'cdats',
  ACCOUNTING: 'accounting',
  ASSOCIATE_PORTAL: 'associate_portal',
  INTEGRATIONS: 'integrations',
  PORTFOLIO: 'portfolio',
  REPORTS: 'reports',
  SOCIAL_FUNDS: 'social_funds',
  ASSEMBLIES: 'assemblies',
  TREASURY: 'treasury',
} as const;

// System Roles
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_COOP: 'ADMIN_COOP',
  CREDIT_ANALYST: 'CREDIT_ANALYST',
  PORTFOLIO_ANALYST: 'PORTFOLIO_ANALYST',
  OPERATOR: 'OPERATOR',
  TREASURY: 'TREASURY',
  AUDITOR: 'AUDITOR',
  ASSOCIATE: 'ASSOCIATE',
} as const;

// Navigation items for sidebar
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    permission: 'dashboard.view',
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: 'Users',
    permission: 'users.view',
  },
  {
    label: 'Roles',
    href: '/roles',
    icon: 'Shield',
    permission: 'roles.view',
  },
  {
    label: 'Parametrización',
    href: '/parametrizacion',
    icon: 'Settings',
    permission: 'params.view',
    children: [
      { label: 'Catálogos', href: '/parametrizacion/catalogos', permission: 'params.view' },
      { label: 'Configuración', href: '/parametrizacion/configuracion', permission: 'system.config' },
    ],
  },
  {
    label: 'Asociados',
    href: '/asociados',
    icon: 'UserPlus',
    permission: 'associates.view',
  },
  {
    label: 'Recaudos',
    href: '/recaudos',
    icon: 'Receipt',
    permission: 'contributions.create',
  },
  {
    label: 'Aportes',
    href: '/aportes',
    icon: 'Wallet',
    permission: 'contributions.view',
  },
  {
    label: 'Créditos',
    href: '/creditos',
    icon: 'Landmark',
    permission: 'credits.view',
  },
  {
    label: 'Libranzas',
    href: '/libranzas',
    icon: 'FileText',
    permission: 'payroll.view',
  },
  {
    label: 'CDATs',
    href: '/cdats',
    icon: 'PiggyBank',
    permission: 'cdats.view',
  },
  {
    label: 'Contabilidad',
    href: '/contabilidad',
    icon: 'BookOpenCheck',
    permission: 'accounting.view',
  },
  {
    label: 'Fondos Sociales',
    href: '/fondos-sociales',
    icon: 'HeartHandshake',
    permission: 'social_funds.view',
  },
  {
    label: 'Mi Portal',
    href: '/portal-asociado',
    icon: 'UserCircle',
    permission: 'portal.view',
  },
  {
    label: 'Integraciones',
    href: '/integraciones',
    icon: 'CloudCog',
    permission: 'integrations.view',
  },
  {
    label: 'Cartera',
    href: '/cartera',
    icon: 'PieChart',
    permission: 'portfolio.view',
  },
  {
    label: 'Asambleas',
    href: '/asambleas',
    icon: 'Vote',
    permission: 'assemblies.view',
  },
  {
    label: 'Tesorería',
    href: '/tesoreria',
    icon: 'Building2',
    permission: 'treasury.view',
    children: [
      { label: 'Cuentas Bancarias', href: '/tesoreria/cuentas', permission: 'treasury.view' },
      { label: 'Movimientos', href: '/tesoreria/movimientos', permission: 'treasury.view' },
      { label: 'Conciliación', href: '/tesoreria/conciliacion', permission: 'treasury.reconcile' },
      { label: 'Cajas', href: '/tesoreria/cajas', permission: 'treasury.cash' },
    ],
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: 'FileSpreadsheet',
    permission: 'reports.view',
  },
  {
    label: 'Auditoría',
    href: '/auditoria',
    icon: 'FileSearch',
    permission: 'audit.view',
  },
];
