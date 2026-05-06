// ============================================================
// CoopManager - CDAT Service (Fase B)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  CreateCdatInvestmentInput,
  CreateCdatProductInput,
} from '@/lib/validations/schemas';
import {
  ACCOUNTING_EVENTS,
  postCdatRedemptionEntry,
  postSimpleRuleEntry,
} from './accounting.service';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateCdatReturn(params: {
  principalAmount: number;
  annualRate: number;
  termDays: number;
  interestMode: string;
  withholdingRate: number;
}) {
  const annualRate = params.annualRate / 100;
  const withholdingRate = params.withholdingRate / 100;
  const period = params.termDays / 365;
  const grossInterest = params.interestMode === 'COMPOUND'
    ? params.principalAmount * (Math.pow(1 + annualRate, period) - 1)
    : params.principalAmount * annualRate * period;
  const expectedInterest = roundMoney(grossInterest);
  const withholdingAmount = roundMoney(expectedInterest * withholdingRate);
  const netInterest = roundMoney(expectedInterest - withholdingAmount);

  return {
    expectedInterest,
    withholdingAmount,
    netInterest,
    maturityValue: roundMoney(params.principalAmount + netInterest),
  };
}

export async function generateCdatCertificateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CDAT-${year}-`;
  const last = await prisma.cdatInvestment.findFirst({
    where: { certificateNumber: { startsWith: prefix } },
    orderBy: { certificateNumber: 'desc' },
  });
  const next = last ? parseInt(last.certificateNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function getCdatProducts(params: { activeOnly?: boolean } = {}) {
  return prisma.cdatProduct.findMany({
    where: params.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isActive: 'desc' }, { minTermDays: 'asc' }],
  });
}

export async function createCdatProduct(input: CreateCdatProductInput, createdBy: string) {
  if (input.maxAmount && input.maxAmount < input.minAmount) {
    throw new Error('El monto máximo no puede ser menor al monto mínimo');
  }
  if (input.maxTermDays && input.maxTermDays < input.minTermDays) {
    throw new Error('El plazo máximo no puede ser menor al plazo mínimo');
  }

  const product = await prisma.cdatProduct.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description || null,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount || null,
      minTermDays: input.minTermDays,
      maxTermDays: input.maxTermDays || null,
      annualRate: input.annualRate,
      interestMode: input.interestMode,
      paymentFrequency: input.paymentFrequency,
      withholdingRate: input.withholdingRate,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CDAT_PRODUCT_CREATE,
    module: MODULES.CDATS,
    entity: 'CdatProduct',
    entityId: product.id,
    dataAfter: { code: product.code, annualRate: product.annualRate },
    details: `Producto CDAT ${product.name} creado`,
  });

  return product;
}

export async function getCdatInvestments(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  associateId?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.CdatInvestmentWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.associateId) where.associateId = params.associateId;
  if (params.search) {
    where.OR = [
      { certificateNumber: { contains: params.search, mode: 'insensitive' } },
      { associate: { associateNumber: { contains: params.search, mode: 'insensitive' } } },
      { associate: { person: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { associate: { person: { lastName: { contains: params.search, mode: 'insensitive' } } } },
      { associate: { person: { documentNumber: { contains: params.search, mode: 'insensitive' } } } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.cdatInvestment.findMany({
      where,
      include: {
        product: true,
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
    prisma.cdatInvestment.count({ where }),
    prisma.cdatInvestment.aggregate({
      where,
      _sum: { principalAmount: true, expectedInterest: true, netInterest: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      principalAmount: toNumber(summary._sum.principalAmount),
      expectedInterest: toNumber(summary._sum.expectedInterest),
      netInterest: toNumber(summary._sum.netInterest),
    },
  };
}

export async function getCdatInvestmentById(id: string) {
  return prisma.cdatInvestment.findUnique({
    where: { id },
    include: {
      product: true,
      movements: { orderBy: { performedAt: 'desc' } },
      associate: {
        include: {
          person: {
            select: {
              firstName: true,
              lastName: true,
              secondLastName: true,
              documentType: true,
              documentNumber: true,
              email: true,
              mobilePhone: true,
            },
          },
        },
      },
    },
  });
}

export async function createCdatInvestment(input: CreateCdatInvestmentInput, createdBy: string) {
  const [associate, product] = await Promise.all([
    prisma.associate.findUnique({ where: { id: input.associateId }, include: { person: true } }),
    prisma.cdatProduct.findUnique({ where: { id: input.productId } }),
  ]);
  if (!associate) throw new Error('Asociado no encontrado');
  if (associate.status !== 'ACTIVO') throw new Error('El asociado no está activo');
  if (!product) throw new Error('Producto CDAT no encontrado');
  if (!product.isActive) throw new Error('El producto CDAT no está activo');
  if (input.principalAmount < toNumber(product.minAmount)) {
    throw new Error('El capital está por debajo del mínimo del producto');
  }
  if (product.maxAmount && input.principalAmount > toNumber(product.maxAmount)) {
    throw new Error('El capital supera el máximo del producto');
  }
  if (input.termDays < product.minTermDays) {
    throw new Error('El plazo está por debajo del mínimo del producto');
  }
  if (product.maxTermDays && input.termDays > product.maxTermDays) {
    throw new Error('El plazo supera el máximo del producto');
  }

  const certificateNumber = await generateCdatCertificateNumber();
  const startDate = new Date(input.startDate);
  const maturityDate = addDays(startDate, input.termDays);
  const projection = calculateCdatReturn({
    principalAmount: input.principalAmount,
    annualRate: toNumber(product.annualRate),
    termDays: input.termDays,
    interestMode: product.interestMode,
    withholdingRate: toNumber(product.withholdingRate),
  });

  const investment = await prisma.$transaction(async (tx) => {
    const created = await tx.cdatInvestment.create({
      data: {
        certificateNumber,
        associateId: input.associateId,
        productId: input.productId,
        principalAmount: input.principalAmount,
        annualRate: product.annualRate,
        termDays: input.termDays,
        startDate,
        maturityDate,
        expectedInterest: projection.expectedInterest,
        withholdingAmount: projection.withholdingAmount,
        netInterest: projection.netInterest,
        renewalPolicy: input.renewalPolicy,
        observations: input.observations || null,
        createdBy,
      },
    });

    await tx.cdatMovement.create({
      data: {
        investmentId: created.id,
        movementType: 'APERTURA',
        principalAmount: input.principalAmount,
        netAmount: input.principalAmount,
        observations: 'Constitución inicial del CDAT',
        performedBy: createdBy,
      },
    });

    return created;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CDAT_INVESTMENT_CREATE,
    module: MODULES.CDATS,
    entity: 'CdatInvestment',
    entityId: investment.id,
    dataAfter: { certificateNumber, principalAmount: input.principalAmount, maturityDate },
    details: `CDAT ${certificateNumber} constituido para ${associate.person.firstName} ${associate.person.lastName}`,
  });

  await postSimpleRuleEntry({
    module: MODULES.CDATS,
    event: ACCOUNTING_EVENTS.CDAT_OPENING,
    amount: input.principalAmount,
    description: `Apertura CDAT ${certificateNumber}`,
    sourceEntity: 'CdatInvestment',
    sourceEntityId: investment.id,
    associateId: associate.id,
    thirdPartyName: `${associate.person.firstName} ${associate.person.lastName}`,
    createdBy,
  });

  return getCdatInvestmentById(investment.id);
}

export async function markCdatAsMatured(id: string, performedBy: string) {
  const investment = await prisma.cdatInvestment.findUnique({ where: { id } });
  if (!investment) throw new Error('CDAT no encontrado');
  if (investment.status !== 'ACTIVO') throw new Error('Solo se pueden vencer CDATs activos');

  await prisma.$transaction(async (tx) => {
    await tx.cdatInvestment.update({
      where: { id },
      data: { status: 'VENCIDO', updatedBy: performedBy },
    });
    await tx.cdatMovement.create({
      data: {
        investmentId: id,
        movementType: 'VENCIMIENTO',
        principalAmount: investment.principalAmount,
        interestAmount: investment.expectedInterest,
        withholdingAmount: investment.withholdingAmount,
        netAmount: toNumber(investment.principalAmount) + toNumber(investment.netInterest),
        observations: 'CDAT marcado como vencido',
        performedBy,
      },
    });
  });

  return getCdatInvestmentById(id);
}

export async function redeemCdatInvestment(id: string, observations: string | null | undefined, performedBy: string) {
  const investment = await prisma.cdatInvestment.findUnique({
    where: { id },
    include: { associate: { include: { person: true } } },
  });
  if (!investment) throw new Error('CDAT no encontrado');
  if (!['ACTIVO', 'VENCIDO'].includes(investment.status)) {
    throw new Error('El CDAT no está disponible para liquidación');
  }

  const netAmount = roundMoney(toNumber(investment.principalAmount) + toNumber(investment.netInterest));

  await prisma.$transaction(async (tx) => {
    await tx.cdatInvestment.update({
      where: { id },
      data: {
        status: 'LIQUIDADO',
        redeemedAt: new Date(),
        updatedBy: performedBy,
      },
    });
    await tx.cdatMovement.create({
      data: {
        investmentId: id,
        movementType: 'LIQUIDACION',
        principalAmount: investment.principalAmount,
        interestAmount: investment.expectedInterest,
        withholdingAmount: investment.withholdingAmount,
        netAmount,
        observations: observations || 'Liquidación del CDAT',
        performedBy,
      },
    });
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.CDAT_INVESTMENT_REDEEM,
    module: MODULES.CDATS,
    entity: 'CdatInvestment',
    entityId: id,
    dataAfter: { certificateNumber: investment.certificateNumber, netAmount },
    details: `CDAT ${investment.certificateNumber} liquidado`,
  });

  await postCdatRedemptionEntry({
    investmentId: id,
    certificateNumber: investment.certificateNumber,
    associateId: investment.associateId,
    thirdPartyName: `${investment.associate.person.firstName} ${investment.associate.person.lastName}`,
    principalAmount: toNumber(investment.principalAmount),
    expectedInterest: toNumber(investment.expectedInterest),
    withholdingAmount: toNumber(investment.withholdingAmount),
    netInterest: toNumber(investment.netInterest),
    createdBy: performedBy,
  });

  return getCdatInvestmentById(id);
}

export async function cancelCdatInvestment(id: string, observations: string | null | undefined, performedBy: string) {
  const investment = await prisma.cdatInvestment.findUnique({
    where: { id },
    include: { associate: { include: { person: true } } },
  });
  if (!investment) throw new Error('CDAT no encontrado');
  if (investment.status !== 'ACTIVO') throw new Error('Solo se pueden cancelar CDATs activos');

  await prisma.$transaction(async (tx) => {
    await tx.cdatInvestment.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        cancelledAt: new Date(),
        updatedBy: performedBy,
      },
    });
    await tx.cdatMovement.create({
      data: {
        investmentId: id,
        movementType: 'CANCELACION',
        principalAmount: investment.principalAmount,
        netAmount: investment.principalAmount,
        observations: observations || 'Cancelación anticipada sin intereses',
        performedBy,
      },
    });
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.CDAT_INVESTMENT_CANCEL,
    module: MODULES.CDATS,
    entity: 'CdatInvestment',
    entityId: id,
    details: `CDAT ${investment.certificateNumber} cancelado`,
  });

  await postSimpleRuleEntry({
    module: MODULES.CDATS,
    event: ACCOUNTING_EVENTS.CDAT_CANCEL,
    amount: toNumber(investment.principalAmount),
    description: `Cancelación CDAT ${investment.certificateNumber}`,
    sourceEntity: 'CdatInvestment',
    sourceEntityId: id,
    associateId: investment.associateId,
    thirdPartyName: `${investment.associate.person.firstName} ${investment.associate.person.lastName}`,
    createdBy: performedBy,
  });

  return getCdatInvestmentById(id);
}
