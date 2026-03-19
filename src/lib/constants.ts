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
  // Documentos
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  // Recaudos
  RECEIPT_CREATE: 'RECEIPT_CREATE',
  RECEIPT_VOID: 'RECEIPT_VOID',
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
  PORTFOLIO: 'portfolio',
  REPORTS: 'reports',
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
    label: 'Cartera',
    href: '/cartera',
    icon: 'PieChart',
    permission: 'portfolio.view',
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
