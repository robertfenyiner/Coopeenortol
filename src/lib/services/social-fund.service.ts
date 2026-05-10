// ============================================================
// CoopManager - Social Funds Service (Fase F)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  CreateSocialFundInput,
  UpdateSocialFundInput,
} from '@/lib/validations/schemas';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

async function assertActiveDistributionLimit(params: {
  nextPct: number;
  excludeFundId?: string;
}) {
  const activeFunds = await prisma.socialFund.findMany({
    where: {
      isActive: true,
      ...(params.excludeFundId ? { id: { not: params.excludeFundId } } : {}),
    },
    select: { surplusDistributionPct: true },
  });

  const currentTotal = activeFunds.reduce((sum, fund) => sum + toNumber(fund.surplusDistributionPct), 0);
  const nextTotal = Math.round((currentTotal + params.nextPct) * 10000) / 10000;
  if (nextTotal > 100) {
    throw new Error(`La distribucion activa de excedentes no puede superar 100%. Total proyectado: ${nextTotal}%`);
  }
}

export async function getSocialFunds(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
  fundType?: string;
} = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.SocialFundWhereInput = {};

  if (params.activeOnly) where.isActive = true;
  if (params.fundType) where.fundType = params.fundType;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.socialFund.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.socialFund.count({ where }),
    prisma.socialFund.aggregate({
      where: { isActive: true },
      _sum: {
        surplusDistributionPct: true,
        currentBalance: true,
      },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      activeDistributionPct: toNumber(summary._sum.surplusDistributionPct),
      activeBalance: toNumber(summary._sum.currentBalance),
    },
  };
}

export async function getSocialFundById(id: string) {
  return prisma.socialFund.findUnique({ where: { id } });
}

export async function createSocialFund(input: CreateSocialFundInput, createdBy: string) {
  await assertActiveDistributionLimit({ nextPct: input.surplusDistributionPct });

  const fund = await prisma.socialFund.create({
    data: {
      code: normalizeCode(input.code),
      name: input.name,
      description: input.description || null,
      fundType: input.fundType,
      surplusDistributionPct: input.surplusDistributionPct,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.SOCIAL_FUND_CREATE,
    module: MODULES.SOCIAL_FUNDS,
    entity: 'SocialFund',
    entityId: fund.id,
    dataAfter: {
      code: fund.code,
      fundType: fund.fundType,
      surplusDistributionPct: fund.surplusDistributionPct,
      currentBalance: fund.currentBalance,
    },
    details: `Fondo social ${fund.code} - ${fund.name} creado`,
  });

  return fund;
}

export async function updateSocialFund(id: string, input: UpdateSocialFundInput, updatedBy: string) {
  const current = await prisma.socialFund.findUnique({ where: { id } });
  if (!current) throw new Error('Fondo social no encontrado');

  const nextIsActive = input.isActive ?? current.isActive;
  const nextPct = input.surplusDistributionPct ?? toNumber(current.surplusDistributionPct);
  if (nextIsActive) {
    await assertActiveDistributionLimit({ nextPct, excludeFundId: id });
  }

  const fund = await prisma.socialFund.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.fundType !== undefined ? { fundType: input.fundType } : {}),
      ...(input.surplusDistributionPct !== undefined ? { surplusDistributionPct: input.surplusDistributionPct } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.SOCIAL_FUND_UPDATE,
    module: MODULES.SOCIAL_FUNDS,
    entity: 'SocialFund',
    entityId: fund.id,
    dataBefore: {
      name: current.name,
      description: current.description,
      fundType: current.fundType,
      surplusDistributionPct: current.surplusDistributionPct,
      currentBalance: current.currentBalance,
      isActive: current.isActive,
    },
    dataAfter: {
      name: fund.name,
      description: fund.description,
      fundType: fund.fundType,
      surplusDistributionPct: fund.surplusDistributionPct,
      currentBalance: fund.currentBalance,
      isActive: fund.isActive,
    },
    details: `Fondo social ${fund.code} actualizado`,
  });

  return fund;
}
