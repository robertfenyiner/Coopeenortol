// ============================================================
// CoopManager - Accounting Service (Fase C)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  CreateAccountingRuleInput,
  CreateChartAccountInput,
  CreateJournalEntryInput,
} from '@/lib/validations/schemas';

export const ACCOUNTING_EVENTS = {
  CONTRIBUTION_APPLIED: 'CONTRIBUTION_APPLIED',
  CREDIT_DISBURSEMENT: 'CREDIT_DISBURSEMENT',
  CREDIT_PAYMENT: 'CREDIT_PAYMENT',
  CDAT_OPENING: 'CDAT_OPENING',
  CDAT_REDEEM_PRINCIPAL: 'CDAT_REDEEM_PRINCIPAL',
  CDAT_INTEREST_EXPENSE: 'CDAT_INTEREST_EXPENSE',
  CDAT_WITHHOLDING: 'CDAT_WITHHOLDING',
  CDAT_CANCEL: 'CDAT_CANCEL',
} as const;

type JournalLineDraft = {
  accountId: string;
  associateId?: string | null;
  description?: string | null;
  debit?: number;
  credit?: number;
  thirdPartyName?: string | null;
};

type JournalEntryDraft = {
  entryDate?: Date;
  description: string;
  sourceModule?: string | null;
  sourceEvent?: string | null;
  sourceEntity?: string | null;
  sourceEntityId?: string | null;
  lines: JournalLineDraft[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function generateJournalEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ASI-${year}-`;
  const last = await prisma.accountingJournalEntry.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: 'desc' },
  });
  const next = last ? parseInt(last.entryNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export async function getChartAccounts(params: { activeOnly?: boolean; search?: string } = {}) {
  const where: Prisma.ChartAccountWhereInput = {};
  if (params.activeOnly) where.isActive = true;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  return prisma.chartAccount.findMany({
    where,
    include: { parent: { select: { code: true, name: true } } },
    orderBy: { code: 'asc' },
  });
}

export async function createChartAccount(input: CreateChartAccountInput, createdBy: string) {
  if (input.parentId) {
    const parent = await prisma.chartAccount.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new Error('Cuenta padre no encontrada');
  }

  const account = await prisma.chartAccount.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description || null,
      accountType: input.accountType,
      nature: input.nature,
      parentId: input.parentId || null,
      level: input.level,
      isMovement: input.isMovement,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.ACCOUNT_CREATE,
    module: MODULES.ACCOUNTING,
    entity: 'ChartAccount',
    entityId: account.id,
    dataAfter: { code: account.code, name: account.name },
    details: `Cuenta contable ${account.code} - ${account.name} creada`,
  });

  return account;
}

export async function getAccountingRules() {
  return prisma.accountingRule.findMany({
    include: { debitAccount: true, creditAccount: true },
    orderBy: [{ module: 'asc' }, { event: 'asc' }],
  });
}

export async function createAccountingRule(input: CreateAccountingRuleInput, createdBy: string) {
  if (input.debitAccountId === input.creditAccountId) {
    throw new Error('La cuenta débito y crédito no pueden ser la misma');
  }

  const [debitAccount, creditAccount] = await Promise.all([
    prisma.chartAccount.findUnique({ where: { id: input.debitAccountId } }),
    prisma.chartAccount.findUnique({ where: { id: input.creditAccountId } }),
  ]);
  if (!debitAccount || !creditAccount) throw new Error('Cuenta contable no encontrada');
  if (!debitAccount.isMovement || !creditAccount.isMovement) {
    throw new Error('Las reglas solo pueden usar cuentas de movimiento');
  }

  const rule = await prisma.accountingRule.create({
    data: {
      code: input.code,
      name: input.name,
      module: input.module,
      event: input.event,
      debitAccountId: input.debitAccountId,
      creditAccountId: input.creditAccountId,
      description: input.description || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.ACCOUNTING_RULE_CREATE,
    module: MODULES.ACCOUNTING,
    entity: 'AccountingRule',
    entityId: rule.id,
    dataAfter: { module: rule.module, event: rule.event },
    details: `Regla contable ${rule.code} creada`,
  });

  return rule;
}

function validateJournalLines(lines: JournalLineDraft[]) {
  if (lines.length < 2) throw new Error('El asiento debe tener al menos dos líneas');
  const normalized = lines.map((line, index) => ({
    ...line,
    lineNumber: index + 1,
    debit: roundMoney(line.debit || 0),
    credit: roundMoney(line.credit || 0),
  }));

  for (const line of normalized) {
    if (line.debit > 0 && line.credit > 0) {
      throw new Error('Una línea no puede tener débito y crédito simultáneamente');
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error('Cada línea debe tener débito o crédito');
    }
  }

  const totalDebit = roundMoney(normalized.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = roundMoney(normalized.reduce((sum, line) => sum + line.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new Error(`Asiento descuadrado: débito ${totalDebit} vs crédito ${totalCredit}`);
  }

  return { lines: normalized, totalDebit, totalCredit };
}

export async function createJournalEntry(input: CreateJournalEntryInput, createdBy: string) {
  return postJournalEntry({
    entryDate: input.entryDate ? new Date(input.entryDate) : undefined,
    description: input.description,
    sourceModule: input.sourceModule || null,
    sourceEvent: input.sourceEvent || null,
    sourceEntity: input.sourceEntity || null,
    sourceEntityId: input.sourceEntityId || null,
    lines: input.lines,
  }, createdBy);
}

export async function postJournalEntry(input: JournalEntryDraft, createdBy: string) {
  const { lines, totalDebit, totalCredit } = validateJournalLines(input.lines);
  const accountIds = [...new Set(lines.map((line) => line.accountId))];
  const accounts = await prisma.chartAccount.findMany({
    where: { id: { in: accountIds }, isActive: true, isMovement: true },
  });
  if (accounts.length !== accountIds.length) {
    throw new Error('Una o más cuentas contables no existen, están inactivas o no son de movimiento');
  }

  const entryNumber = await generateJournalEntryNumber();
  const entry = await prisma.accountingJournalEntry.create({
    data: {
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description,
      sourceModule: input.sourceModule || null,
      sourceEvent: input.sourceEvent || null,
      sourceEntity: input.sourceEntity || null,
      sourceEntityId: input.sourceEntityId || null,
      totalDebit,
      totalCredit,
      postedBy: createdBy,
      createdBy,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          associateId: line.associateId || null,
          lineNumber: line.lineNumber,
          description: line.description || null,
          debit: line.debit,
          credit: line.credit,
          thirdPartyName: line.thirdPartyName || null,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.JOURNAL_ENTRY_POST,
    module: MODULES.ACCOUNTING,
    entity: 'AccountingJournalEntry',
    entityId: entry.id,
    dataAfter: { entryNumber, totalDebit, totalCredit, sourceEvent: input.sourceEvent },
    details: `Asiento ${entryNumber} contabilizado`,
  });

  return entry;
}

export async function postSimpleRuleEntry(params: {
  module: string;
  event: string;
  amount: number;
  description: string;
  sourceEntity: string;
  sourceEntityId: string;
  associateId?: string | null;
  thirdPartyName?: string | null;
  createdBy: string;
}) {
  const amount = roundMoney(params.amount);
  if (amount <= 0) return null;

  const existing = await prisma.accountingJournalEntry.findFirst({
    where: {
      sourceModule: params.module,
      sourceEvent: params.event,
      sourceEntity: params.sourceEntity,
      sourceEntityId: params.sourceEntityId,
      status: { not: 'ANULADO' },
    },
  });
  if (existing) return existing;

  const rule = await prisma.accountingRule.findUnique({
    where: { module_event: { module: params.module, event: params.event } },
  });
  if (!rule || !rule.isActive) return null;

  return postJournalEntry({
    description: params.description,
    sourceModule: params.module,
    sourceEvent: params.event,
    sourceEntity: params.sourceEntity,
    sourceEntityId: params.sourceEntityId,
    lines: [
      {
        accountId: rule.debitAccountId,
        associateId: params.associateId,
        description: params.description,
        debit: amount,
        thirdPartyName: params.thirdPartyName,
      },
      {
        accountId: rule.creditAccountId,
        associateId: params.associateId,
        description: params.description,
        credit: amount,
        thirdPartyName: params.thirdPartyName,
      },
    ],
  }, params.createdBy);
}

async function getMovementAccountsByCode(codes: string[]) {
  const accounts = await prisma.chartAccount.findMany({
    where: { code: { in: codes }, isActive: true, isMovement: true },
  });
  const map = new Map(accounts.map((account) => [account.code, account.id]));
  for (const code of codes) {
    if (!map.has(code)) throw new Error(`Cuenta contable requerida no encontrada: ${code}`);
  }
  return map;
}

export async function postCdatRedemptionEntry(params: {
  investmentId: string;
  certificateNumber: string;
  associateId: string;
  thirdPartyName: string;
  principalAmount: number;
  expectedInterest: number;
  withholdingAmount: number;
  netInterest: number;
  createdBy: string;
}) {
  const existing = await prisma.accountingJournalEntry.findFirst({
    where: {
      sourceModule: MODULES.CDATS,
      sourceEvent: ACCOUNTING_EVENTS.CDAT_REDEEM_PRINCIPAL,
      sourceEntity: 'CdatInvestment',
      sourceEntityId: params.investmentId,
      status: { not: 'ANULADO' },
    },
  });
  if (existing) return existing;

  const accounts = await getMovementAccountsByCode(['210505', '530505', '236505', '111005']);
  const description = `Liquidación CDAT ${params.certificateNumber}`;
  const lines: JournalLineDraft[] = [
    {
      accountId: accounts.get('210505') as string,
      associateId: params.associateId,
      description: `${description} - capital`,
      debit: params.principalAmount,
      thirdPartyName: params.thirdPartyName,
    },
    {
      accountId: accounts.get('530505') as string,
      associateId: params.associateId,
      description: `${description} - intereses`,
      debit: params.expectedInterest,
      thirdPartyName: params.thirdPartyName,
    },
    {
      accountId: accounts.get('111005') as string,
      associateId: params.associateId,
      description: `${description} - pago neto`,
      credit: roundMoney(params.principalAmount + params.netInterest),
      thirdPartyName: params.thirdPartyName,
    },
  ];
  if (params.withholdingAmount > 0) {
    lines.splice(2, 0, {
      accountId: accounts.get('236505') as string,
      associateId: params.associateId,
      description: `${description} - retención`,
      credit: params.withholdingAmount,
      thirdPartyName: params.thirdPartyName,
    });
  }

  return postJournalEntry({
    description,
    sourceModule: MODULES.CDATS,
    sourceEvent: ACCOUNTING_EVENTS.CDAT_REDEEM_PRINCIPAL,
    sourceEntity: 'CdatInvestment',
    sourceEntityId: params.investmentId,
    lines,
  }, params.createdBy);
}

export async function getJournalEntries(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sourceModule?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.AccountingJournalEntryWhereInput = {};

  if (params.sourceModule) where.sourceModule = params.sourceModule;
  if (params.dateFrom || params.dateTo) {
    where.entryDate = {};
    if (params.dateFrom) where.entryDate.gte = new Date(params.dateFrom);
    if (params.dateTo) where.entryDate.lte = new Date(`${params.dateTo}T23:59:59`);
  }
  if (params.search) {
    where.OR = [
      { entryNumber: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { sourceEntityId: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.accountingJournalEntry.findMany({
      where,
      include: {
        lines: {
          include: { account: true, associate: { include: { person: true } } },
          orderBy: { lineNumber: 'asc' },
        },
      },
      orderBy: { entryDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.accountingJournalEntry.count({ where }),
    prisma.accountingJournalEntry.aggregate({
      where,
      _sum: { totalDebit: true, totalCredit: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      totalDebit: toNumber(summary._sum.totalDebit),
      totalCredit: toNumber(summary._sum.totalCredit),
    },
  };
}
