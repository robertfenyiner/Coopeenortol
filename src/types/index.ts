// ============================================================
// CoopManager - TypeScript Types
// ============================================================

export interface UserWithRoles {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  userRoles: {
    role: {
      id: string;
      code: string;
      name: string;
      rolePermissions: {
        permission: {
          code: string;
          module: string;
          action: string;
        };
      }[];
    };
  }[];
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuditLogEntry {
  userId: string | null;
  action: string;
  module: string;
  entity?: string;
  entityId?: string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}
