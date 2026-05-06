// ============================================================
// CoopManager - Database Seed
// Datos iniciales para Coopeenortol
// ============================================================

import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de CoopManager...');

  // ============================================================
  // 1. PERMISSIONS
  // ============================================================
  const permissionDefinitions = [
    // Dashboard
    { module: 'dashboard', action: 'view', code: 'dashboard.view', description: 'Ver dashboard' },
    // Users
    { module: 'users', action: 'view', code: 'users.view', description: 'Ver usuarios' },
    { module: 'users', action: 'create', code: 'users.create', description: 'Crear usuarios' },
    { module: 'users', action: 'edit', code: 'users.edit', description: 'Editar usuarios' },
    { module: 'users', action: 'delete', code: 'users.delete', description: 'Eliminar usuarios' },
    { module: 'users', action: 'toggle_status', code: 'users.toggle_status', description: 'Activar/desactivar usuarios' },
    // Roles
    { module: 'roles', action: 'view', code: 'roles.view', description: 'Ver roles' },
    { module: 'roles', action: 'create', code: 'roles.create', description: 'Crear roles' },
    { module: 'roles', action: 'edit', code: 'roles.edit', description: 'Editar roles' },
    { module: 'roles', action: 'delete', code: 'roles.delete', description: 'Eliminar roles' },
    { module: 'roles', action: 'assign_permissions', code: 'roles.assign_permissions', description: 'Asignar permisos a roles' },
    // Params
    { module: 'params', action: 'view', code: 'params.view', description: 'Ver parametrización' },
    { module: 'params', action: 'create', code: 'params.create', description: 'Crear catálogos/ítems' },
    { module: 'params', action: 'edit', code: 'params.edit', description: 'Editar catálogos/ítems' },
    { module: 'params', action: 'delete', code: 'params.delete', description: 'Eliminar catálogos/ítems' },
    // Audit
    { module: 'audit', action: 'view', code: 'audit.view', description: 'Ver auditoría' },
    { module: 'audit', action: 'export', code: 'audit.export', description: 'Exportar auditoría' },
    // System
    { module: 'system', action: 'config', code: 'system.config', description: 'Configuración del sistema' },
    { module: 'system', action: 'manage', code: 'system.manage', description: 'Administración del sistema' },
    // Associates (future)
    { module: 'associates', action: 'view', code: 'associates.view', description: 'Ver asociados' },
    { module: 'associates', action: 'create', code: 'associates.create', description: 'Crear asociados' },
    { module: 'associates', action: 'edit', code: 'associates.edit', description: 'Editar asociados' },
    // Credits (future)
    { module: 'credits', action: 'view', code: 'credits.view', description: 'Ver créditos' },
    { module: 'credits', action: 'create', code: 'credits.create', description: 'Crear solicitudes de crédito' },
    { module: 'credits', action: 'edit', code: 'credits.edit', description: 'Gestionar créditos (aprobar, rechazar, desembolsar, pagos)' },
    { module: 'credits', action: 'approve', code: 'credits.approve', description: 'Aprobar créditos' },
    { module: 'credits', action: 'disburse', code: 'credits.disburse', description: 'Desembolsar créditos' },
    // Payroll deductions
    { module: 'payroll', action: 'view', code: 'payroll.view', description: 'Ver libranzas' },
    { module: 'payroll', action: 'create', code: 'payroll.create', description: 'Crear lotes de libranza' },
    { module: 'payroll', action: 'generate', code: 'payroll.generate', description: 'Generar archivos planos de libranza' },
    { module: 'payroll', action: 'send', code: 'payroll.send', description: 'Marcar lotes de libranza como enviados' },
    { module: 'payroll', action: 'reconcile', code: 'payroll.reconcile', description: 'Conciliar pagos de libranza' },
    { module: 'paying_entities', action: 'manage', code: 'paying_entities.manage', description: 'Gestionar entidades pagadoras' },
    // CDATs
    { module: 'cdats', action: 'view', code: 'cdats.view', description: 'Ver CDATs' },
    { module: 'cdats', action: 'create', code: 'cdats.create', description: 'Constituir CDATs' },
    { module: 'cdats', action: 'manage', code: 'cdats.manage', description: 'Gestionar productos CDAT' },
    { module: 'cdats', action: 'redeem', code: 'cdats.redeem', description: 'Liquidar o cancelar CDATs' },
    // Accounting
    { module: 'accounting', action: 'view', code: 'accounting.view', description: 'Ver contabilidad' },
    { module: 'accounting', action: 'manage', code: 'accounting.manage', description: 'Gestionar plan de cuentas y reglas' },
    { module: 'accounting', action: 'post', code: 'accounting.post', description: 'Registrar asientos contables' },
    { module: 'accounting', action: 'export', code: 'accounting.export', description: 'Exportar contabilidad' },
    // Associate Portal
    { module: 'portal', action: 'view', code: 'portal.view', description: 'Ver portal del asociado' },
    { module: 'portal', action: 'download', code: 'portal.download', description: 'Descargar certificados y extractos' },
    { module: 'portal', action: 'simulate', code: 'portal.simulate', description: 'Simular créditos en portal' },
    // Integrations
    { module: 'integrations', action: 'view', code: 'integrations.view', description: 'Ver integraciones' },
    { module: 'integrations', action: 'manage', code: 'integrations.manage', description: 'Gestionar integraciones' },
    { module: 'notifications', action: 'send', code: 'notifications.send', description: 'Enviar notificaciones' },
    // Contributions
    { module: 'contributions', action: 'view', code: 'contributions.view', description: 'Ver aportes' },
    { module: 'contributions', action: 'create', code: 'contributions.create', description: 'Registrar aportes' },
    { module: 'contributions', action: 'edit', code: 'contributions.edit', description: 'Anular aportes' },
    // Portfolio (future)
    { module: 'portfolio', action: 'view', code: 'portfolio.view', description: 'Ver cartera' },
    { module: 'portfolio', action: 'manage', code: 'portfolio.manage', description: 'Gestionar cartera' },
    // Reports (future)
    { module: 'reports', action: 'view', code: 'reports.view', description: 'Ver reportes' },
    { module: 'reports', action: 'export', code: 'reports.export', description: 'Exportar reportes' },
  ];

  console.log('  📋 Creando permisos...');
  const permissions = [];
  for (const perm of permissionDefinitions) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    permissions.push(p);
  }
  console.log(`  ✅ ${permissions.length} permisos creados`);

  // ============================================================
  // 2. ROLES
  // ============================================================
  console.log('  🛡️ Creando roles...');

  const allPermCodes = permissions.map((p) => p.code);
  const viewPermCodes = permissions.filter((p) => p.action === 'view' || p.action === 'export').map((p) => p.code);
  const operatorPermCodes = [
    'dashboard.view', 'users.view', 'params.view',
    'associates.view', 'associates.create', 'associates.edit',
    'contributions.view', 'contributions.create',
    'payroll.view', 'payroll.create',
    'cdats.view', 'cdats.create',
    'accounting.view',
  ];
  const adminPermCodes = allPermCodes.filter((c) => c !== 'system.manage');
  const creditPermCodes = [
    'dashboard.view', 'credits.view', 'credits.create', 'credits.edit', 'credits.approve',
    'associates.view', 'contributions.view', 'reports.view',
  ];
  const portfolioPermCodes = [
    'dashboard.view', 'portfolio.view', 'portfolio.manage',
    'credits.view', 'associates.view', 'contributions.view', 'payroll.view', 'payroll.reconcile', 'reports.view',
  ];
  const treasuryPermCodes = [
    'dashboard.view', 'credits.view', 'credits.disburse', 'credits.edit',
    'contributions.view', 'contributions.create', 'contributions.edit',
    'portfolio.view', 'associates.view',
    'payroll.view', 'payroll.create', 'payroll.generate', 'payroll.send', 'payroll.reconcile', 'paying_entities.manage',
    'cdats.view', 'cdats.create', 'cdats.manage', 'cdats.redeem',
    'accounting.view', 'accounting.manage', 'accounting.post', 'accounting.export',
    'integrations.view', 'integrations.manage', 'notifications.send',
    'reports.view',
  ];
  const associatePermCodes = [
    'portal.view', 'portal.download', 'portal.simulate',
  ];

  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Superadministrador', description: 'Control total de la plataforma', permCodes: allPermCodes },
    { code: 'ADMIN_COOP', name: 'Administrador de Cooperativa', description: 'Gestión completa de una cooperativa', permCodes: adminPermCodes },
    { code: 'CREDIT_ANALYST', name: 'Analista de Créditos', description: 'Evaluación y gestión de créditos', permCodes: creditPermCodes },
    { code: 'PORTFOLIO_ANALYST', name: 'Analista de Cartera', description: 'Seguimiento de cartera y mora', permCodes: portfolioPermCodes },
    { code: 'OPERATOR', name: 'Auxiliar Operativo', description: 'Registro de asociados y movimientos', permCodes: operatorPermCodes },
    { code: 'TREASURY', name: 'Tesorería / Caja', description: 'Recaudos y desembolsos', permCodes: treasuryPermCodes },
    { code: 'AUDITOR', name: 'Revisor / Auditor', description: 'Consulta de auditoría y reportes', permCodes: viewPermCodes },
    { code: 'ASSOCIATE', name: 'Asociado', description: 'Autogestión del asociado', permCodes: associatePermCodes },
  ];

  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: roleData.code },
      update: {},
      create: {
        code: roleData.code,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    });

    // Assign permissions
    const rolePerms = permissions.filter((p) => roleData.permCodes.includes(p.code));
    for (const perm of rolePerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`  ✅ Rol ${roleData.code} con ${rolePerms.length} permisos`);
  }

  // ============================================================
  // 3. SUPER ADMIN USER
  // ============================================================
  console.log('  👤 Creando usuario superadministrador...');

  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@coopeenortol.com' },
    update: {},
    create: {
      email: 'admin@coopeenortol.com',
      passwordHash: hashSync('Admin123!', 12),
      firstName: 'Administrador',
      lastName: 'Sistema',
      phone: null,
      isActive: true,
    },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }
  console.log('  ✅ admin@coopeenortol.com / Admin123!');

  // ============================================================
  // 4. SYSTEM CATALOGS
  // ============================================================
  console.log('  📚 Creando catálogos del sistema...');

  const catalogsData = [
    {
      code: 'TIPO_DOCUMENTO',
      name: 'Tipo de Documento',
      description: 'Tipos de documento de identidad',
      isSystem: true,
      items: [
        { code: 'CC', name: 'Cédula de Ciudadanía', sortOrder: 1 },
        { code: 'CE', name: 'Cédula de Extranjería', sortOrder: 2 },
        { code: 'TI', name: 'Tarjeta de Identidad', sortOrder: 3 },
        { code: 'PP', name: 'Pasaporte', sortOrder: 4 },
        { code: 'NIT', name: 'NIT', sortOrder: 5 },
      ],
    },
    {
      code: 'ESTADO_ASOCIADO',
      name: 'Estado del Asociado',
      description: 'Estados posibles de un asociado',
      isSystem: true,
      items: [
        { code: 'ACTIVO', name: 'Activo', sortOrder: 1 },
        { code: 'INACTIVO', name: 'Inactivo', sortOrder: 2 },
        { code: 'RETIRADO', name: 'Retirado', sortOrder: 3 },
        { code: 'SUSPENDIDO', name: 'Suspendido', sortOrder: 4 },
        { code: 'PENDIENTE', name: 'Pendiente de Aprobación', sortOrder: 5 },
      ],
    },
    {
      code: 'TIPO_APORTE',
      name: 'Tipo de Aporte',
      description: 'Tipos de aportes de los asociados',
      isSystem: true,
      items: [
        { code: 'ORDINARIO', name: 'Aporte Ordinario', sortOrder: 1 },
        { code: 'EXTRAORDINARIO', name: 'Aporte Extraordinario', sortOrder: 2 },
        { code: 'CUOTA_INGRESO', name: 'Cuota de Ingreso', sortOrder: 3 },
      ],
    },
    {
      code: 'TIPO_CREDITO',
      name: 'Tipo de Crédito',
      description: 'Tipos de productos de crédito',
      isSystem: true,
      items: [
        { code: 'LIBRE_INVERSION', name: 'Libre Inversión', sortOrder: 1 },
        { code: 'EDUCACION', name: 'Educación', sortOrder: 2 },
        { code: 'VIVIENDA', name: 'Vivienda', sortOrder: 3 },
        { code: 'VEHICULO', name: 'Vehículo', sortOrder: 4 },
        { code: 'CALAMIDAD', name: 'Calamidad', sortOrder: 5 },
      ],
    },
    {
      code: 'PERIODICIDAD',
      name: 'Periodicidad',
      description: 'Periodicidad de pagos y aportes',
      isSystem: true,
      items: [
        { code: 'SEMANAL', name: 'Semanal', sortOrder: 1 },
        { code: 'QUINCENAL', name: 'Quincenal', sortOrder: 2 },
        { code: 'MENSUAL', name: 'Mensual', sortOrder: 3 },
        { code: 'BIMESTRAL', name: 'Bimestral', sortOrder: 4 },
        { code: 'TRIMESTRAL', name: 'Trimestral', sortOrder: 5 },
      ],
    },
    {
      code: 'ESTADO_CREDITO',
      name: 'Estado del Crédito',
      description: 'Estados del ciclo de vida de un crédito',
      isSystem: true,
      items: [
        { code: 'SOLICITUD', name: 'En Solicitud', sortOrder: 1 },
        { code: 'EN_EVALUACION', name: 'En Evaluación', sortOrder: 2 },
        { code: 'APROBADO', name: 'Aprobado', sortOrder: 3 },
        { code: 'RECHAZADO', name: 'Rechazado', sortOrder: 4 },
        { code: 'DESEMBOLSADO', name: 'Desembolsado', sortOrder: 5 },
        { code: 'VIGENTE', name: 'Vigente', sortOrder: 6 },
        { code: 'VENCIDO', name: 'Vencido', sortOrder: 7 },
        { code: 'PAGADO', name: 'Pagado (Paz y Salvo)', sortOrder: 8 },
        { code: 'CASTIGADO', name: 'Castigado', sortOrder: 9 },
      ],
    },
    // Fase 2 - Catálogos de Personas y Asociados
    {
      code: 'GENERO',
      name: 'Género',
      description: 'Opciones de género',
      isSystem: true,
      items: [
        { code: 'M', name: 'Masculino', sortOrder: 1 },
        { code: 'F', name: 'Femenino', sortOrder: 2 },
        { code: 'O', name: 'Otro', sortOrder: 3 },
        { code: 'ND', name: 'Prefiere no decir', sortOrder: 4 },
      ],
    },
    {
      code: 'ESTADO_CIVIL',
      name: 'Estado Civil',
      description: 'Estado civil de la persona',
      isSystem: true,
      items: [
        { code: 'SOLTERO', name: 'Soltero(a)', sortOrder: 1 },
        { code: 'CASADO', name: 'Casado(a)', sortOrder: 2 },
        { code: 'UNION_LIBRE', name: 'Unión Libre', sortOrder: 3 },
        { code: 'DIVORCIADO', name: 'Divorciado(a)', sortOrder: 4 },
        { code: 'VIUDO', name: 'Viudo(a)', sortOrder: 5 },
      ],
    },
    {
      code: 'PARENTESCO',
      name: 'Parentesco',
      description: 'Relación de parentesco para beneficiarios',
      isSystem: true,
      items: [
        { code: 'CONYUGE', name: 'Cónyuge', sortOrder: 1 },
        { code: 'HIJO', name: 'Hijo(a)', sortOrder: 2 },
        { code: 'PADRE_MADRE', name: 'Padre/Madre', sortOrder: 3 },
        { code: 'HERMANO', name: 'Hermano(a)', sortOrder: 4 },
        { code: 'OTRO', name: 'Otro', sortOrder: 5 },
      ],
    },
    {
      code: 'TIPO_VIVIENDA',
      name: 'Tipo de Vivienda',
      description: 'Tipo de vivienda del asociado',
      isSystem: true,
      items: [
        { code: 'PROPIA', name: 'Propia', sortOrder: 1 },
        { code: 'ARRENDADA', name: 'Arrendada', sortOrder: 2 },
        { code: 'FAMILIAR', name: 'Familiar', sortOrder: 3 },
      ],
    },
    // Fase 3 - Catálogos de Aportes
    {
      code: 'METODO_PAGO',
      name: 'Método de Pago',
      description: 'Métodos de pago aceptados para aportes',
      isSystem: true,
      items: [
        { code: 'EFECTIVO', name: 'Efectivo', sortOrder: 1 },
        { code: 'TRANSFERENCIA', name: 'Transferencia Bancaria', sortOrder: 2 },
        { code: 'NOMINA', name: 'Descuento por Nómina', sortOrder: 3 },
        { code: 'CONSIGNACION', name: 'Consignación Bancaria', sortOrder: 4 },
      ],
    },
  ];

  for (const catData of catalogsData) {
    const catalog = await prisma.catalog.upsert({
      where: { code: catData.code },
      update: {},
      create: {
        code: catData.code,
        name: catData.name,
        description: catData.description,
        isSystem: catData.isSystem,
      },
    });

    for (const item of catData.items) {
      await prisma.catalogItem.upsert({
        where: { catalogId_code: { catalogId: catalog.id, code: item.code } },
        update: {},
        create: {
          catalogId: catalog.id,
          code: item.code,
          name: item.name,
          sortOrder: item.sortOrder,
        },
      });
    }
    console.log(`  ✅ Catálogo ${catData.code} con ${catData.items.length} ítems`);
  }

  // ============================================================
  // 5. SYSTEM CONFIG
  // ============================================================
  console.log('  ⚙️ Creando configuraciones del sistema...');

  const configs = [
    { key: 'coop.name', value: 'Coopeenortol', type: 'string', module: 'general', description: 'Nombre de la cooperativa' },
    { key: 'coop.nit', value: '', type: 'string', module: 'general', description: 'NIT de la cooperativa' },
    { key: 'coop.address', value: '', type: 'string', module: 'general', description: 'Dirección de la cooperativa' },
    { key: 'coop.phone', value: '', type: 'string', module: 'general', description: 'Teléfono de la cooperativa' },
    { key: 'coop.email', value: '', type: 'string', module: 'general', description: 'Correo electrónico de la cooperativa' },
    { key: 'credit.max_debt_ratio', value: '0.40', type: 'number', module: 'credits', description: 'Porcentaje máximo de endeudamiento (0-1)' },
    { key: 'credit.default_rate', value: '1.5', type: 'number', module: 'credits', description: 'Tasa de interés mensual por defecto (%)' },
    { key: 'credit.late_rate', value: '3.0', type: 'number', module: 'credits', description: 'Tasa de interés de mora mensual (%)' },
    { key: 'credit.max_term_months', value: '60', type: 'number', module: 'credits', description: 'Plazo máximo en meses' },
    { key: 'portfolio.days_past_due_warning', value: '30', type: 'number', module: 'portfolio', description: 'Días de mora para alerta' },
    { key: 'portfolio.days_past_due_critical', value: '90', type: 'number', module: 'portfolio', description: 'Días de mora para estado crítico' },
    { key: 'portfolio.payment_priority', value: 'MORA,INTERES,CAPITAL', type: 'string', module: 'portfolio', description: 'Prioridad de aplicación de pagos' },
    { key: 'contribution.default_amount', value: '50000', type: 'number', module: 'contributions', description: 'Monto de aporte ordinario por defecto' },
    { key: 'contribution.periodicity', value: 'MENSUAL', type: 'string', module: 'contributions', description: 'Periodicidad de aportes por defecto' },
    { key: 'storage.provider', value: process.env.STORAGE_PROVIDER || 'local', type: 'string', module: 'integrations', description: 'Proveedor de almacenamiento activo' },
    { key: 'notifications.email.enabled', value: process.env.EMAIL_ENABLED || 'false', type: 'boolean', module: 'integrations', description: 'Habilita envío real de emails' },
    { key: 'notifications.whatsapp.enabled', value: process.env.WHATSAPP_ENABLED || 'false', type: 'boolean', module: 'integrations', description: 'Habilita envío real de WhatsApp' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log(`  ✅ ${configs.length} configuraciones creadas`);

  // ============================================================
  // 6. ACCOUNTING BASE PUC & RULES
  // ============================================================
  console.log('  🧾 Creando plan de cuentas y reglas contables...');

  const accountsData = [
    { code: '110505', name: 'Caja general', accountType: 'ACTIVO', nature: 'DEBIT' },
    { code: '111005', name: 'Bancos nacionales', accountType: 'ACTIVO', nature: 'DEBIT' },
    { code: '130505', name: 'Cartera créditos asociados', accountType: 'ACTIVO', nature: 'DEBIT' },
    { code: '210505', name: 'CDATs por pagar asociados', accountType: 'PASIVO', nature: 'CREDIT' },
    { code: '236505', name: 'Retención en la fuente por pagar', accountType: 'PASIVO', nature: 'CREDIT' },
    { code: '310505', name: 'Aportes sociales asociados', accountType: 'PATRIMONIO', nature: 'CREDIT' },
    { code: '421005', name: 'Ingresos por intereses de crédito', accountType: 'INGRESO', nature: 'CREDIT' },
    { code: '530505', name: 'Gasto intereses CDAT', accountType: 'GASTO', nature: 'DEBIT' },
  ];

  const accountMap = new Map<string, { id: string }>();
  for (const account of accountsData) {
    const saved = await prisma.chartAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        accountType: account.accountType,
        nature: account.nature,
        isMovement: true,
        isActive: true,
      },
      create: {
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        nature: account.nature,
        level: 6,
        isMovement: true,
      },
    });
    accountMap.set(account.code, saved);
  }

  const rulesData = [
    { code: 'CONTRIBUTIONS.CONTRIBUTION_APPLIED', name: 'Aporte aplicado', module: 'contributions', event: 'CONTRIBUTION_APPLIED', debit: '111005', credit: '310505' },
    { code: 'CREDITS.CREDIT_DISBURSEMENT', name: 'Desembolso de crédito', module: 'credits', event: 'CREDIT_DISBURSEMENT', debit: '130505', credit: '111005' },
    { code: 'CREDITS.CREDIT_PAYMENT', name: 'Pago de crédito', module: 'credits', event: 'CREDIT_PAYMENT', debit: '111005', credit: '130505' },
    { code: 'CDATS.CDAT_OPENING', name: 'Apertura de CDAT', module: 'cdats', event: 'CDAT_OPENING', debit: '111005', credit: '210505' },
    { code: 'CDATS.CDAT_CANCEL', name: 'Cancelación de CDAT', module: 'cdats', event: 'CDAT_CANCEL', debit: '210505', credit: '111005' },
  ];

  for (const rule of rulesData) {
    const debitAccount = accountMap.get(rule.debit);
    const creditAccount = accountMap.get(rule.credit);
    if (!debitAccount || !creditAccount) continue;

    await prisma.accountingRule.upsert({
      where: { module_event: { module: rule.module, event: rule.event } },
      update: {
        code: rule.code,
        name: rule.name,
        debitAccountId: debitAccount.id,
        creditAccountId: creditAccount.id,
        isActive: true,
      },
      create: {
        code: rule.code,
        name: rule.name,
        module: rule.module,
        event: rule.event,
        debitAccountId: debitAccount.id,
        creditAccountId: creditAccount.id,
      },
    });
  }
  console.log(`  ✅ ${accountsData.length} cuentas y ${rulesData.length} reglas contables listas`);

  // ============================================================
  // 7. NOTIFICATION TEMPLATES
  // ============================================================
  console.log('  🔔 Creando plantillas de notificación...');

  const notificationTemplates = [
    {
      code: 'DOCUMENT_UPLOADED_EMAIL',
      name: 'Documento cargado',
      channel: 'EMAIL',
      subject: 'Documento cargado en CoopManager',
      body: 'Hola {{firstName}}, tu documento {{fileName}} de tipo {{documentType}} fue cargado correctamente.',
    },
    {
      code: 'CREDIT_PAYMENT_WHATSAPP',
      name: 'Pago de crédito registrado',
      channel: 'WHATSAPP',
      subject: null,
      body: 'Coopeenortol: recibimos tu pago de crédito por {{amount}}. Referencia {{reference}}.',
    },
    {
      code: 'CDAT_MATURITY_EMAIL',
      name: 'Vencimiento CDAT',
      channel: 'EMAIL',
      subject: 'Tu CDAT está próximo a vencer',
      body: 'Hola {{firstName}}, tu CDAT {{certificateNumber}} vence el {{maturityDate}}.',
    },
  ];

  for (const template of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        isActive: true,
      },
      create: template,
    });
  }
  console.log(`  ✅ ${notificationTemplates.length} plantillas listas`);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('   📧 Login: admin@coopeenortol.com');
  console.log('   🔑 Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
