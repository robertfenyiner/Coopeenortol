// ============================================================
// CoopManager - Contribution Service (Fase 3)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateContributionInput } from '@/lib/validations/schemas';

// ------------------------------------------------------------
// Generar número de recibo correlativo
// ------------------------------------------------------------
export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const lastReceipt = await prisma.paymentReceipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastReceipt) {
    const lastNum = parseInt(lastReceipt.receiptNumber.split('-').pop() || '0', 10);
    nextNumber = lastNum + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// ------------------------------------------------------------
// Obtener o crear cuenta de ahorro para un tipo de aporte
// ------------------------------------------------------------
async function getOrCreateSavingsAccount(
  associateId: string,
  accountType: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) {
  let account = await tx.savingsAccount.findUnique({
    where: { associateId_accountType: { associateId, accountType } },
  });

  if (!account) {
    account = await tx.savingsAccount.create({
      data: { associateId, accountType, balance: 0 },
    });
  }

  return account;
}

// ------------------------------------------------------------
// Listar aportes con filtros y paginación
// ------------------------------------------------------------
export async function getContributions(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  associateId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { status: 'APLICADO' };

  if (params.type) where.type = params.type;
  if (params.associateId) where.associateId = params.associateId;

  if (params.dateFrom || params.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
    if (params.dateTo) dateFilter.lte = new Date(params.dateTo + 'T23:59:59');
    where.createdAt = dateFilter;
  }

  if (params.search) {
    where.OR = [
      { associate: { associateNumber: { contains: params.search, mode: 'insensitive' } } },
      { associate: { person: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { associate: { person: { lastName: { contains: params.search, mode: 'insensitive' } } } },
      { reference: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.contribution.findMany({
      where,
      include: {
        associate: {
          include: {
            person: {
              select: {
                firstName: true,
                lastName: true,
                secondLastName: true,
                documentNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contribution.count({ where }),
    prisma.contribution.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalAmount: summary._sum.amount || 0,
  };
}

// ------------------------------------------------------------
// Obtener detalle de un aporte
// ------------------------------------------------------------
export async function getContributionById(id: string) {
  return prisma.contribution.findUnique({
    where: { id },
    include: {
      associate: {
        include: {
          person: {
            select: {
              firstName: true,
              lastName: true,
              secondLastName: true,
              documentType: true,
              documentNumber: true,
            },
          },
        },
      },
      savingsAccount: true,
      receipt: true,
    },
  });
}

// ------------------------------------------------------------
// Crear un aporte individual
// ------------------------------------------------------------
export async function createContribution(input: CreateContributionInput, createdBy: string) {
  // Verificar que el asociado existe y está activo
  const associate = await prisma.associate.findUnique({
    where: { id: input.associateId },
    include: { person: true },
  });
  if (!associate) throw new Error('Asociado no encontrado');
  if (associate.status !== 'ACTIVO') throw new Error('El asociado no está activo');

  const contribution = await prisma.$transaction(async (tx) => {
    // 1. Obtener o crear cuenta de ahorro
    const account = await getOrCreateSavingsAccount(input.associateId, input.type, tx);

    // 2. Crear el aporte
    const newContribution = await tx.contribution.create({
      data: {
        associateId: input.associateId,
        savingsAccountId: account.id,
        type: input.type,
        amount: input.amount,
        periodYear: input.periodYear || null,
        periodMonth: input.periodMonth || null,
        paymentMethod: input.paymentMethod || null,
        reference: input.reference || null,
        observations: input.observations || null,
        status: 'APLICADO',
        createdBy,
      },
    });

    // 3. Actualizar saldo de la cuenta
    await tx.savingsAccount.update({
      where: { id: account.id },
      data: { balance: { increment: input.amount } },
    });

    return newContribution;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CONTRIBUTION,
    module: MODULES.CONTRIBUTIONS,
    entity: 'Contribution',
    entityId: contribution.id,
    dataAfter: {
      associateNumber: associate.associateNumber,
      type: input.type,
      amount: input.amount,
    },
    details: `Aporte ${input.type}: $${input.amount.toLocaleString()} - ${associate.person.firstName} ${associate.person.lastName} (${associate.associateNumber})`,
  });

  return contribution;
}

// ------------------------------------------------------------
// Crear aportes en lote (recibo con múltiples aportes)
// ------------------------------------------------------------
export async function createBatchContributions(
  contributions: CreateContributionInput[],
  paymentMethod: string,
  reference: string | null | undefined,
  observations: string | null | undefined,
  createdBy: string
) {
  const receiptNumber = await generateReceiptNumber();
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  // Verificar que todos los asociados existen y están activos
  const associateIds = [...new Set(contributions.map((c) => c.associateId))];
  const associates = await prisma.associate.findMany({
    where: { id: { in: associateIds } },
    include: { person: true },
  });
  const associateMap = new Map(associates.map((a) => [a.id, a]));

  for (const c of contributions) {
    const a = associateMap.get(c.associateId);
    if (!a) throw new Error(`Asociado ${c.associateId} no encontrado`);
    if (a.status !== 'ACTIVO') throw new Error(`Asociado ${a.associateNumber} no está activo`);
  }

  const receipt = await prisma.$transaction(async (tx) => {
    // 1. Crear recibo
    const newReceipt = await tx.paymentReceipt.create({
      data: {
        receiptNumber,
        associateId: contributions[0].associateId,
        totalAmount,
        paymentMethod,
        reference: reference || null,
        observations: observations || null,
        createdBy,
      },
    });

    // 2. Crear cada aporte y actualizar saldos
    for (const input of contributions) {
      const account = await getOrCreateSavingsAccount(input.associateId, input.type, tx);

      await tx.contribution.create({
        data: {
          associateId: input.associateId,
          savingsAccountId: account.id,
          receiptId: newReceipt.id,
          type: input.type,
          amount: input.amount,
          periodYear: input.periodYear || null,
          periodMonth: input.periodMonth || null,
          paymentMethod,
          reference: reference || null,
          observations: input.observations || null,
          status: 'APLICADO',
          createdBy,
        },
      });

      await tx.savingsAccount.update({
        where: { id: account.id },
        data: { balance: { increment: input.amount } },
      });
    }

    return newReceipt;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CONTRIBUTION,
    module: MODULES.CONTRIBUTIONS,
    entity: 'PaymentReceipt',
    entityId: receipt.id,
    dataAfter: {
      receiptNumber,
      totalAmount,
      contributionCount: contributions.length,
    },
    details: `Recibo ${receiptNumber}: $${totalAmount.toLocaleString()} (${contributions.length} aportes)`,
  });

  return receipt;
}

// ------------------------------------------------------------
// Anular un aporte
// ------------------------------------------------------------
export async function voidContribution(id: string, performedBy: string) {
  const contribution = await prisma.contribution.findUnique({
    where: { id },
    include: { associate: true },
  });
  if (!contribution) throw new Error('Aporte no encontrado');
  if (contribution.status !== 'APLICADO') throw new Error('Este aporte ya fue anulado');

  await prisma.$transaction(async (tx) => {
    await tx.contribution.update({
      where: { id },
      data: { status: 'ANULADO' },
    });

    await tx.savingsAccount.update({
      where: { id: contribution.savingsAccountId },
      data: { balance: { decrement: Number(contribution.amount) } },
    });
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.VOID_CONTRIBUTION,
    module: MODULES.CONTRIBUTIONS,
    entity: 'Contribution',
    entityId: id,
    details: `Aporte anulado: $${Number(contribution.amount).toLocaleString()} (${contribution.type})`,
  });
}

// ------------------------------------------------------------
// Resumen de cuentas de ahorro de un asociado
// ------------------------------------------------------------
export async function getAssociateSavingsSummary(associateId: string) {
  const accounts = await prisma.savingsAccount.findMany({
    where: { associateId, isActive: true },
    orderBy: { accountType: 'asc' },
  });

  const recentContributions = await prisma.contribution.findMany({
    where: { associateId, status: 'APLICADO' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return {
    accounts,
    recentContributions,
    totalBalance,
  };
}
