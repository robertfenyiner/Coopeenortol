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

export const createCreditCoDebtorSchema = z.object({
  associateId: z.string().uuid('El codeudor es invalido'),
  relationship: z.string().max(50).optional().nullable(),
  monthlyIncome: z.number().min(0).optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});

export const refinanceCreditSchema = z.object({
  newAmount: z.number().positive('El nuevo monto debe ser mayor a 0'),
  interestRate: z.number().min(0).max(100, 'La tasa debe estar entre 0 y 100'),
  termMonths: z.number().int().min(1).max(360),
  reason: z.string().min(3, 'El motivo es requerido').max(500),
  observations: z.string().max(2000).optional().nullable(),
});

// ============================================================
// Advanced Portfolio Validation Schemas (Fase H)
// ============================================================

export const createPaymentAgreementSchema = z.object({
  creditId: z.string().uuid('El credito es invalido'),
  agreedAmount: z.number().positive('El monto acordado debe ser mayor a 0'),
  initialPayment: z.number().min(0).default(0),
  installments: z.number().int().min(1).max(60),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  reason: z.string().min(3, 'El motivo es requerido').max(500),
  observations: z.string().max(1000).optional().nullable(),
});

export const updatePaymentAgreementStatusSchema = z.object({
  status: z.enum(['ACTIVO', 'CUMPLIDO', 'INCUMPLIDO', 'CANCELADO']),
  observations: z.string().max(1000).optional().nullable(),
});

// ============================================================
// Payroll Deduction Validation Schemas (Fase A)
// ============================================================

export const createPayingEntitySchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo mayúsculas, números y guiones bajos'),
  name: z.string().min(2, 'El nombre es requerido').max(200),
  nit: z.string().max(30).optional().nullable(),
  entityType: z.string().min(1, 'El tipo de entidad es requerido').max(30),
  contactName: z.string().max(150).optional().nullable(),
  contactEmail: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(30).optional().nullable(),
  fileFormat: z.enum(['CSV', 'TXT_FIXED']).default('CSV'),
  separator: z.string().min(1).max(5).default(';'),
  encoding: z.string().max(20).default('UTF-8'),
  paymentCycle: z.string().max(20).default('MENSUAL'),
  cutoffDay: z.number().int().min(1).max(31).optional().nullable(),
});

export const createPayrollBatchSchema = z.object({
  payingEntityId: z.string().uuid('La entidad pagadora es inválida'),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  includeContributions: z.boolean().default(true),
  includeCredits: z.boolean().default(true),
  observations: z.string().max(2000).optional().nullable(),
});

export const reconcilePayrollBatchSchema = z.object({
  content: z.string().min(1, 'El contenido del archivo es requerido'),
});

// ============================================================
// CDAT Validation Schemas (Fase B)
// ============================================================

export const createCdatProductSchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo mayúsculas, números y guiones bajos'),
  name: z.string().min(2, 'El nombre es requerido').max(150),
  description: z.string().max(500).optional().nullable(),
  minAmount: z.number().positive('El monto mínimo debe ser mayor a 0'),
  maxAmount: z.number().positive().optional().nullable(),
  minTermDays: z.number().int().min(1),
  maxTermDays: z.number().int().min(1).optional().nullable(),
  annualRate: z.number().min(0).max(100),
  interestMode: z.enum(['SIMPLE', 'COMPOUND']).default('SIMPLE'),
  paymentFrequency: z.enum(['VENCIMIENTO', 'MENSUAL', 'TRIMESTRAL']).default('VENCIMIENTO'),
  withholdingRate: z.number().min(0).max(100).default(0),
});

export const createCdatInvestmentSchema = z.object({
  associateId: z.string().uuid('El asociado es inválido'),
  productId: z.string().uuid('El producto CDAT es inválido'),
  principalAmount: z.number().positive('El capital debe ser mayor a 0'),
  termDays: z.number().int().min(1),
  startDate: z.string().min(1, 'La fecha de apertura es requerida'),
  renewalPolicy: z.enum(['NO_RENUEVA', 'RENUEVA_CAPITAL', 'RENUEVA_CAPITAL_INTERES']).default('NO_RENUEVA'),
  observations: z.string().max(2000).optional().nullable(),
});

export const cdatActionSchema = z.object({
  action: z.enum(['mark_matured', 'redeem', 'cancel']),
  observations: z.string().max(500).optional().nullable(),
});

// ============================================================
// Social Funds Validation Schemas (Fase F)
// ============================================================

export const socialFundTypeSchema = z.enum(['EDUCACION', 'SOLIDARIDAD', 'BIENESTAR', 'RESERVA_LEGAL', 'OTRO']);

export const createSocialFundSchema = z.object({
  code: z
    .string()
    .min(2, 'El codigo debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'El codigo debe contener solo mayusculas, numeros y guiones bajos'),
  name: z.string().min(2, 'El nombre es requerido').max(150),
  description: z.string().max(500).optional().nullable(),
  fundType: socialFundTypeSchema,
  surplusDistributionPct: z.number().min(0).max(100, 'El porcentaje no puede exceder 100'),
});

export const updateSocialFundSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  fundType: socialFundTypeSchema.optional(),
  surplusDistributionPct: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Accounting Validation Schemas (Fase C)
// ============================================================

export const createChartAccountSchema = z.object({
  code: z.string().min(2).max(30).regex(/^[0-9.]+$/, 'El código debe ser numérico tipo PUC'),
  name: z.string().min(2, 'El nombre es requerido').max(180),
  description: z.string().max(500).optional().nullable(),
  accountType: z.enum(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO', 'COSTO']),
  nature: z.enum(['DEBIT', 'CREDIT']),
  parentId: z.string().uuid().optional().nullable(),
  level: z.number().int().min(1).max(10).default(1),
  isMovement: z.boolean().default(true),
});

export const createAccountingRuleSchema = z.object({
  code: z.string().min(2).max(60).regex(/^[A-Z0-9_.]+$/),
  name: z.string().min(2).max(180),
  module: z.string().min(2).max(50),
  event: z.string().min(2).max(80),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  description: z.string().max(500).optional().nullable(),
});

export const journalLineSchema = z.object({
  accountId: z.string().uuid(),
  associateId: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  thirdPartyName: z.string().max(200).optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.string().optional().nullable(),
  description: z.string().min(3).max(500),
  sourceModule: z.string().max(50).optional().nullable(),
  sourceEvent: z.string().max(80).optional().nullable(),
  sourceEntity: z.string().max(80).optional().nullable(),
  sourceEntityId: z.string().max(80).optional().nullable(),
  lines: z.array(journalLineSchema).min(2, 'Debe incluir al menos dos líneas'),
});

// ============================================================
// Associate Portal Validation Schemas (Fase D)
// ============================================================

export const portalCreditSimulationSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  annualRate: z.number().min(0).max(100),
  termMonths: z.number().int().min(1).max(360),
});

// ============================================================
// Integrations Validation Schemas (Fase E)
// ============================================================

export const createNotificationTemplateSchema = z.object({
  code: z.string().min(2).max(80).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(150),
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1),
});

export const sendNotificationSchema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  recipient: z.string().min(3).max(255),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1),
});

// ============================================================
// Reports Validation Schemas (Fase G)
// ============================================================

export const reportExportSchema = z.object({
  report: z.enum(['associates', 'contributions', 'credits', 'overdue']),
  format: z.enum(['csv', 'excel', 'pdf']),
  status: z.string().max(30).optional().nullable(),
  type: z.string().max(30).optional().nullable(),
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
});

export const taxCertificateSchema = z.object({
  associateId: z.string().uuid('El asociado es invalido'),
  year: z.number().int().min(2000).max(2100),
  format: z.enum(['pdf', 'excel']).default('pdf'),
});

// ============================================================
// Assemblies & Voting Validation Schemas (Fase I)
// ============================================================

export const assemblyAgendaItemSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  requiresVote: z.boolean().default(false),
});

export const createAssemblySchema = z.object({
  title: z.string().min(3, 'El titulo es requerido').max(200),
  assemblyType: z.enum(['ORDINARIA', 'EXTRAORDINARIA']).default('ORDINARIA'),
  scheduledAt: z.string().min(1, 'La fecha es requerida'),
  location: z.string().max(200).optional().nullable(),
  quorumRequired: z.number().min(0).max(100).default(50),
  description: z.string().max(1000).optional().nullable(),
  agendaItems: z.array(assemblyAgendaItemSchema).default([]),
});

export const assemblyStatusSchema = z.object({
  status: z.enum(['PROGRAMADA', 'ABIERTA', 'CERRADA', 'CANCELADA']),
});

export const createAssemblyVoteSchema = z.object({
  agendaItemId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().nullable(),
  voteType: z.enum(['MAYORIA_SIMPLE', 'MAYORIA_ABSOLUTA', 'CALIFICADA']).default('MAYORIA_SIMPLE'),
  isSecret: z.boolean().default(false),
  options: z.array(z.string().min(1).max(150)).min(2, 'Debe incluir al menos dos opciones'),
});

export const assemblyVoteStatusSchema = z.object({
  status: z.enum(['BORRADOR', 'ABIERTA', 'CERRADA', 'ANULADA']),
});

export const castAssemblyBallotSchema = z.object({
  associateId: z.string().uuid('El asociado es invalido'),
  optionId: z.string().uuid('La opcion es invalida'),
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
export type CreateCreditCoDebtorInput = z.infer<typeof createCreditCoDebtorSchema>;
export type RefinanceCreditInput = z.infer<typeof refinanceCreditSchema>;
export type CreatePaymentAgreementInput = z.infer<typeof createPaymentAgreementSchema>;
export type UpdatePaymentAgreementStatusInput = z.infer<typeof updatePaymentAgreementStatusSchema>;
export type CreatePayingEntityInput = z.infer<typeof createPayingEntitySchema>;
export type CreatePayrollBatchInput = z.infer<typeof createPayrollBatchSchema>;
export type ReconcilePayrollBatchInput = z.infer<typeof reconcilePayrollBatchSchema>;
export type CreateCdatProductInput = z.infer<typeof createCdatProductSchema>;
export type CreateCdatInvestmentInput = z.infer<typeof createCdatInvestmentSchema>;
export type CdatActionInput = z.infer<typeof cdatActionSchema>;
export type CreateSocialFundInput = z.infer<typeof createSocialFundSchema>;
export type UpdateSocialFundInput = z.infer<typeof updateSocialFundSchema>;
export type CreateChartAccountInput = z.infer<typeof createChartAccountSchema>;
export type CreateAccountingRuleInput = z.infer<typeof createAccountingRuleSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type PortalCreditSimulationInput = z.infer<typeof portalCreditSimulationSchema>;
export type CreateNotificationTemplateInput = z.infer<typeof createNotificationTemplateSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type ReportExportInput = z.infer<typeof reportExportSchema>;
export type TaxCertificateInput = z.infer<typeof taxCertificateSchema>;
export type CreateAssemblyInput = z.infer<typeof createAssemblySchema>;
export type AssemblyStatusInput = z.infer<typeof assemblyStatusSchema>;
export type CreateAssemblyVoteInput = z.infer<typeof createAssemblyVoteSchema>;
export type AssemblyVoteStatusInput = z.infer<typeof assemblyVoteStatusSchema>;
export type CastAssemblyBallotInput = z.infer<typeof castAssemblyBallotSchema>;

// ============================================================
// Treasury & Bank Reconciliation Validation Schemas (Fase J)
// ============================================================

export const createBankAccountSchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo mayúsculas, números y guiones bajos'),
  bankName: z.string().min(2, 'El nombre del banco es requerido').max(150),
  accountNumber: z.string().min(3, 'El número de cuenta es requerido').max(50),
  accountType: z.enum(['CORRIENTE', 'AHORROS']),
  currency: z.string().max(10).default('COP'),
  chartAccountId: z.string().uuid().optional().nullable(),
  contactName: z.string().max(150).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  contactEmail: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
  observations: z.string().max(500).optional().nullable(),
});

export const updateBankAccountSchema = z.object({
  bankName: z.string().min(2).max(150).optional(),
  accountType: z.enum(['CORRIENTE', 'AHORROS']).optional(),
  currency: z.string().max(10).optional(),
  chartAccountId: z.string().uuid().optional().nullable(),
  contactName: z.string().max(150).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  contactEmail: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
  observations: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createBankTransactionSchema = z.object({
  bankAccountId: z.string().uuid('La cuenta bancaria es inválida'),
  transactionDate: z.string().min(1, 'La fecha es requerida'),
  valueDate: z.string().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  description: z.string().min(1, 'La descripción es requerida').max(500),
  transactionType: z.enum(['DEBITO', 'CREDITO']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  thirdPartyName: z.string().max(200).optional().nullable(),
  thirdPartyDoc: z.string().max(30).optional().nullable(),
});

export const importBankTransactionsSchema = z.object({
  bankAccountId: z.string().uuid('La cuenta bancaria es inválida'),
  content: z.string().min(1, 'El contenido del archivo es requerido'),
  format: z.enum(['csv', 'ofx']).default('csv'),
});

export const createBankReconciliationSchema = z.object({
  bankAccountId: z.string().uuid('La cuenta bancaria es inválida'),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  bankBalance: z.number().min(0, 'El saldo bancario es requerido'),
  bookBalance: z.number().min(0, 'El saldo en libros es requerido'),
  observations: z.string().max(2000).optional().nullable(),
});

export const reconcileItemSchema = z.object({
  bankTransactionId: z.string().uuid().optional().nullable(),
  journalEntryId: z.string().max(50).optional().nullable(),
  matchType: z.enum(['AUTO', 'MANUAL', 'PARCIAL']).default('MANUAL'),
  bankAmount: z.number(),
  bookAmount: z.number().default(0),
  observations: z.string().max(500).optional().nullable(),
});

export const createCashRegisterSchema = z.object({
  code: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo mayúsculas, números y guiones bajos'),
  name: z.string().min(2, 'El nombre es requerido').max(100),
  location: z.string().max(200).optional().nullable(),
});

export const openCashRegisterSchema = z.object({
  openingBalance: z.number().min(0, 'El saldo de apertura debe ser >= 0'),
  observations: z.string().max(500).optional().nullable(),
});

export const closeCashRegisterSchema = z.object({
  observations: z.string().max(500).optional().nullable(),
});

export const createCashMovementSchema = z.object({
  cashRegisterId: z.string().uuid('La caja es inválida'),
  movementType: z.enum(['INGRESO', 'EGRESO']),
  concept: z.string().min(2, 'El concepto es requerido').max(200),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  reference: z.string().max(100).optional().nullable(),
  thirdPartyName: z.string().max(200).optional().nullable(),
  observations: z.string().max(500).optional().nullable(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type CreateBankTransactionInput = z.infer<typeof createBankTransactionSchema>;
export type ImportBankTransactionsInput = z.infer<typeof importBankTransactionsSchema>;
export type CreateBankReconciliationInput = z.infer<typeof createBankReconciliationSchema>;
export type ReconcileItemInput = z.infer<typeof reconcileItemSchema>;
export type CreateCashRegisterInput = z.infer<typeof createCashRegisterSchema>;
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type CreateCashMovementInput = z.infer<typeof createCashMovementSchema>;
