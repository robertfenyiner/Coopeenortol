import { z } from 'zod';

// ============================================================
// User Validation Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const createUserSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
  phone: z.string().max(30).optional().nullable(),
  roleIds: z.array(z.string().uuid()).min(1, 'Debe asignar al menos un rol'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Correo electrónico inválido').optional(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
});

// ============================================================
// Role Validation Schemas
// ============================================================

export const createRoleSchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(50)
    .regex(/^[A-Z_]+$/, 'El código debe contener solo mayúsculas y guiones bajos'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional().nullable(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

// ============================================================
// Catalog Validation Schemas
// ============================================================

export const createCatalogSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z_]+$/, 'El código debe contener solo mayúsculas y guiones bajos'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const createCatalogItemSchema = z.object({
  catalogId: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateCatalogItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ============================================================
// System Config Validation
// ============================================================

export const updateConfigSchema = z.object({
  value: z.string(),
});

// ============================================================
// Associate Validation Schemas (Fase 2)
// ============================================================

export const beneficiarySchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  relationship: z.string().min(1, 'El parentesco es requerido').max(50),
  percentage: z.number().min(0.01, 'El porcentaje debe ser mayor a 0').max(100, 'El porcentaje no puede exceder 100'),
  phone: z.string().max(30).optional().nullable(),
});

export const createAssociateSchema = z.object({
  // Datos personales
  documentType: z.string().min(1, 'El tipo de documento es requerido'),
  documentNumber: z.string().min(3, 'El número de documento debe tener al menos 3 caracteres').max(30),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
  secondLastName: z.string().max(100).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  birthDate: z.string().optional().nullable(), // ISO date string
  maritalStatus: z.string().max(20).optional().nullable(),
  email: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  mobilePhone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  housingType: z.string().max(20).optional().nullable(),
  // Datos laborales
  occupation: z.string().max(100).optional().nullable(),
  employer: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  monthlyIncome: z.number().min(0).optional().nullable(),
  // Datos de asociado
  observations: z.string().optional().nullable(),
  // Beneficiarios
  beneficiaries: z.array(beneficiarySchema).optional(),
});

export const updateAssociateSchema = z.object({
  // Datos personales
  documentType: z.string().min(1).optional(),
  documentNumber: z.string().min(3).max(30).optional(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  secondLastName: z.string().max(100).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  maritalStatus: z.string().max(20).optional().nullable(),
  email: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  mobilePhone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  housingType: z.string().max(20).optional().nullable(),
  // Datos laborales
  occupation: z.string().max(100).optional().nullable(),
  employer: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  monthlyIncome: z.number().min(0).optional().nullable(),
  // Datos de asociado
  observations: z.string().optional().nullable(),
});

export const changeAssociateStatusSchema = z.object({
  status: z.string().min(1, 'El estado es requerido'),
  reason: z.string().max(500).optional().nullable(),
});

// ============================================================
// Contribution Validation Schemas (Fase 3)
// ============================================================

export const createContributionSchema = z.object({
  associateId: z.string().uuid('El ID del asociado es inválido'),
  type: z.string().min(1, 'El tipo de aporte es requerido'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  periodYear: z.number().int().min(2000).max(2100).optional().nullable(),
  periodMonth: z.number().int().min(1).max(12).optional().nullable(),
  paymentMethod: z.string().max(30).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});

export const createBatchContributionSchema = z.object({
  contributions: z.array(createContributionSchema).min(1, 'Debe incluir al menos un aporte'),
  paymentMethod: z.string().min(1, 'El método de pago es requerido'),
  reference: z.string().max(100).optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});

// ============================================================
// Credit Validation Schemas (Fase 4)
// ============================================================

export const createCreditSchema = z.object({
  associateId: z.string().uuid('El ID del asociado es inválido'),
  creditLine: z.string().min(1, 'La línea de crédito es requerida'),
  requestedAmount: z.number().positive('El monto debe ser mayor a 0'),
  interestRate: z.number().min(0).max(100, 'La tasa debe ser entre 0 y 100'),
  termMonths: z.number().int().min(1).max(360, 'El plazo debe ser entre 1 y 360 meses'),
  paymentFrequency: z.string().min(1, 'La periodicidad es requerida'),
  purpose: z.string().max(500).optional().nullable(),
  guaranteeType: z.string().max(50).optional().nullable(),
  guaranteeDescription: z.string().max(500).optional().nullable(),
  observations: z.string().max(2000).optional().nullable(),
});

export const approveCreditSchema = z.object({
  approvedAmount: z.number().positive('El monto aprobado debe ser mayor a 0'),
  interestRate: z.number().min(0).max(100).optional(),
  termMonths: z.number().int().min(1).max(360).optional(),
  observations: z.string().max(500).optional().nullable(),
});

export const rejectCreditSchema = z.object({
  rejectionReason: z.string().min(1, 'El motivo de rechazo es requerido').max(500),
});

export const creditPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  paymentMethod: z.string().min(1, 'El método de pago es requerido'),
  reference: z.string().max(100).optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateCatalogInput = z.infer<typeof createCatalogSchema>;
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type CreateAssociateInput = z.infer<typeof createAssociateSchema>;
export type UpdateAssociateInput = z.infer<typeof updateAssociateSchema>;
export type ChangeAssociateStatusInput = z.infer<typeof changeAssociateStatusSchema>;
export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type CreateBatchContributionInput = z.infer<typeof createBatchContributionSchema>;
export type CreateCreditInput = z.infer<typeof createCreditSchema>;
export type ApproveCreditInput = z.infer<typeof approveCreditSchema>;
export type RejectCreditInput = z.infer<typeof rejectCreditSchema>;
export type CreditPaymentInput = z.infer<typeof creditPaymentSchema>;
