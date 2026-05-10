// ============================================================
// CoopManager - Treasury & Bank Reconciliation Service (Fase J)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import type {
  CreateBankAccountInput,
  UpdateBankAccountInput,
  CreateBankTransactionInput,
  CreateBankReconciliationInput,
  ReconcileItemInput,
  CreateCashRegisterInput,
  OpenCashRegisterInput,
  CreateCashMovementInput,
} from '@/lib/validations/schemas';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// ============================================================
// BANK ACCOUNTS
// ============================================================

export async function getBankAccounts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
} = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.BankAccountWhereInput = {};

  if (params.activeOnly) where.isActive = true;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: 'insensitive' } },
      { bankName: { contains: params.search, mode: 'insensitive' } },
      { accountNumber: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      include: { chartAccount: { select: { id: true, code: true, name: true } } },
      orderBy: [{ isActive: 'desc' }, { bankName: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.bankAccount.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getBankAccountById(id: string) {
  return prisma.bankAccount.findUnique({
    where: { id },
    include: { chartAccount: { select: { id: true, code: true, name: true } } },
  });
}

export async function createBankAccount(input: CreateBankAccountInput, createdBy: string) {
  const account = await prisma.bankAccount.create({
    data: {
      code: input.code.trim().toUpperCase(),
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountType: input.accountType,
      currency: input.currency || 'COP',
      chartAccountId: input.chartAccountId || null,
      contactName: input.contactName || null,
      contactPhone: input.contactPhone || null,
      contactEmail: input.contactEmail || null,
      observations: input.observations || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.BANK_ACCOUNT_CREATE,
    module: MODULES.TREASURY,
    entity: 'BankAccount',
    entityId: account.id,
    dataAfter: { code: account.code, bankName: account.bankName, accountNumber: account.accountNumber },
    details: `Cuenta bancaria ${account.code} - ${account.bankName} creada`,
  });

  return account;
}

export async function updateBankAccount(id: string, input: UpdateBankAccountInput, updatedBy: string) {
  const current = await prisma.bankAccount.findUnique({ where: { id } });
  if (!current) throw new Error('Cuenta bancaria no encontrada');

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
      ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.chartAccountId !== undefined ? { chartAccountId: input.chartAccountId || null } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName || null } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone || null } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail || null } : {}),
      ...(input.observations !== undefined ? { observations: input.observations || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.BANK_ACCOUNT_UPDATE,
    module: MODULES.TREASURY,
    entity: 'BankAccount',
    entityId: account.id,
    dataBefore: { bankName: current.bankName, accountType: current.accountType, isActive: current.isActive },
    dataAfter: { bankName: account.bankName, accountType: account.accountType, isActive: account.isActive },
    details: `Cuenta bancaria ${account.code} actualizada`,
  });

  return account;
}

// ============================================================
// BANK TRANSACTIONS
// ============================================================

export async function getBankTransactions(params: {
  bankAccountId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 30, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.BankTransactionWhereInput = {};

  if (params.bankAccountId) where.bankAccountId = params.bankAccountId;
  if (params.status) where.reconciliationStatus = params.status;
  if (params.search) {
    where.OR = [
      { description: { contains: params.search, mode: 'insensitive' } },
      { reference: { contains: params.search, mode: 'insensitive' } },
      { thirdPartyName: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.dateFrom || params.dateTo) {
    where.transactionDate = {};
    if (params.dateFrom) where.transactionDate.gte = new Date(params.dateFrom);
    if (params.dateTo) where.transactionDate.lte = new Date(params.dateTo);
  }

  const [data, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      include: { bankAccount: { select: { id: true, code: true, bankName: true } } },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.bankTransaction.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createBankTransaction(input: CreateBankTransactionInput, createdBy: string) {
  const bankAccount = await prisma.bankAccount.findUnique({ where: { id: input.bankAccountId } });
  if (!bankAccount) throw new Error('Cuenta bancaria no encontrada');

  const balanceChange = input.transactionType === 'CREDITO' ? input.amount : -input.amount;

  const [tx] = await prisma.$transaction([
    prisma.bankTransaction.create({
      data: {
        bankAccountId: input.bankAccountId,
        transactionDate: new Date(input.transactionDate),
        valueDate: input.valueDate ? new Date(input.valueDate) : null,
        reference: input.reference || null,
        description: input.description,
        transactionType: input.transactionType,
        amount: input.amount,
        runningBalance: toNumber(bankAccount.currentBalance) + balanceChange,
        thirdPartyName: input.thirdPartyName || null,
        thirdPartyDoc: input.thirdPartyDoc || null,
        isManual: true,
        createdBy,
      },
    }),
    prisma.bankAccount.update({
      where: { id: input.bankAccountId },
      data: { currentBalance: { increment: balanceChange } },
    }),
  ]);

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.BANK_TRANSACTION_CREATE,
    module: MODULES.TREASURY,
    entity: 'BankTransaction',
    entityId: tx.id,
    dataAfter: { amount: input.amount, type: input.transactionType, description: input.description },
    details: `Movimiento bancario manual registrado - ${input.transactionType} $${input.amount}`,
  });

  return tx;
}

export async function importBankTransactions(
  bankAccountId: string,
  csvContent: string,
  createdBy: string,
) {
  const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
  if (!bankAccount) throw new Error('Cuenta bancaria no encontrada');

  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('El archivo debe tener al menos una línea de datos');

  const batchId = `IMP-${Date.now()}`;
  const transactions: Prisma.BankTransactionCreateManyInput[] = [];

  // Skip header line, parse CSV: date;reference;description;type;amount;thirdParty
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.trim());
    if (cols.length < 5) continue;

    const [dateStr, reference, description, typeStr, amountStr, thirdParty] = cols;
    const transactionType = typeStr.toUpperCase() === 'CREDITO' ? 'CREDITO' : 'DEBITO';
    const amount = Math.abs(parseFloat(amountStr));
    if (isNaN(amount) || amount <= 0) continue;

    transactions.push({
      bankAccountId,
      transactionDate: new Date(dateStr),
      reference: reference || null,
      description: description || 'Sin descripción',
      transactionType,
      amount,
      thirdPartyName: thirdParty || null,
      importBatchId: batchId,
      sourceFile: 'csv_import',
      isManual: false,
      createdBy,
    });
  }

  if (transactions.length === 0) throw new Error('No se encontraron transacciones válidas en el archivo');

  const result = await prisma.bankTransaction.createMany({ data: transactions });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.BANK_TRANSACTION_IMPORT,
    module: MODULES.TREASURY,
    entity: 'BankTransaction',
    entityId: batchId,
    dataAfter: { batchId, count: result.count, bankAccountId },
    details: `Importación de ${result.count} movimientos bancarios - Lote ${batchId}`,
  });

  return { batchId, imported: result.count };
}

// ============================================================
// BANK RECONCILIATION
// ============================================================

async function generateReconciliationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const last = await prisma.bankReconciliation.findFirst({
    where: { reconciliationNumber: { startsWith: prefix } },
    orderBy: { reconciliationNumber: 'desc' },
    select: { reconciliationNumber: true },
  });

  let seq = 1;
  if (last) {
    const num = parseInt(last.reconciliationNumber.replace(prefix, ''));
    if (!isNaN(num)) seq = num + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function getBankReconciliations(params: {
  bankAccountId?: string;
  page?: number;
  pageSize?: number;
  status?: string;
} = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.BankReconciliationWhereInput = {};

  if (params.bankAccountId) where.bankAccountId = params.bankAccountId;
  if (params.status) where.status = params.status;

  const [data, total] = await Promise.all([
    prisma.bankReconciliation.findMany({
      where,
      include: {
        bankAccount: { select: { id: true, code: true, bankName: true, accountNumber: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.bankReconciliation.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getBankReconciliationById(id: string) {
  return prisma.bankReconciliation.findUnique({
    where: { id },
    include: {
      bankAccount: { select: { id: true, code: true, bankName: true, accountNumber: true } },
      items: {
        include: {
          bankTransaction: { select: { id: true, description: true, reference: true, transactionDate: true, amount: true, transactionType: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function createBankReconciliation(input: CreateBankReconciliationInput, createdBy: string) {
  const reconciliationNumber = await generateReconciliationNumber();

  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      reconciliationNumber,
      bankAccountId: input.bankAccountId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      bankBalance: input.bankBalance,
      bookBalance: input.bookBalance,
      difference: Math.round((input.bankBalance - input.bookBalance) * 100) / 100,
      observations: input.observations || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.BANK_RECONCILIATION_CREATE,
    module: MODULES.TREASURY,
    entity: 'BankReconciliation',
    entityId: reconciliation.id,
    dataAfter: { reconciliationNumber, bankBalance: input.bankBalance, bookBalance: input.bookBalance },
    details: `Conciliación ${reconciliationNumber} iniciada`,
  });

  return reconciliation;
}

export async function addReconciliationItem(reconciliationId: string, input: ReconcileItemInput, createdBy: string) {
  const reconciliation = await prisma.bankReconciliation.findUnique({ where: { id: reconciliationId } });
  if (!reconciliation) throw new Error('Conciliación no encontrada');
  if (reconciliation.status !== 'EN_PROCESO') throw new Error('La conciliación no está en proceso');

  const difference = Math.round((input.bankAmount - input.bookAmount) * 100) / 100;

  const item = await prisma.bankReconciliationItem.create({
    data: {
      reconciliationId,
      bankTransactionId: input.bankTransactionId || null,
      journalEntryId: input.journalEntryId || null,
      matchType: input.matchType || 'MANUAL',
      bankAmount: input.bankAmount,
      bookAmount: input.bookAmount,
      difference,
      status: difference === 0 ? 'CONCILIADO' : 'PENDIENTE_LIBROS',
      observations: input.observations || null,
      createdBy,
    },
  });

  // Mark bank transaction as reconciled
  if (input.bankTransactionId) {
    await prisma.bankTransaction.update({
      where: { id: input.bankTransactionId },
      data: { reconciliationStatus: 'CONCILIADO' },
    });
  }

  // Update reconciliation counters
  const counts = await prisma.bankReconciliationItem.groupBy({
    by: ['status'],
    where: { reconciliationId },
    _count: true,
  });
  const matched = counts.find((c) => c.status === 'CONCILIADO')?._count || 0;
  const total = counts.reduce((s, c) => s + c._count, 0);

  await prisma.bankReconciliation.update({
    where: { id: reconciliationId },
    data: {
      totalItems: total,
      matchedItems: matched,
      unmatchedItems: total - matched,
    },
  });

  return item;
}

export async function completeBankReconciliation(id: string, updatedBy: string) {
  const reconciliation = await prisma.bankReconciliation.findUnique({ where: { id } });
  if (!reconciliation) throw new Error('Conciliación no encontrada');
  if (reconciliation.status !== 'EN_PROCESO') throw new Error('La conciliación no está en proceso');

  const updated = await prisma.bankReconciliation.update({
    where: { id },
    data: {
      status: 'COMPLETADA',
      completedAt: new Date(),
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.BANK_RECONCILIATION_COMPLETE,
    module: MODULES.TREASURY,
    entity: 'BankReconciliation',
    entityId: id,
    dataAfter: {
      reconciliationNumber: updated.reconciliationNumber,
      matchedItems: updated.matchedItems,
      unmatchedItems: updated.unmatchedItems,
    },
    details: `Conciliación ${updated.reconciliationNumber} completada`,
  });

  return updated;
}

// ============================================================
// CASH REGISTERS
// ============================================================

export async function getCashRegisters(params: {
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
} = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.CashRegisterWhereInput = {};

  if (params.activeOnly) where.isActive = true;

  const [data, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.cashRegister.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCashRegisterById(id: string) {
  return prisma.cashRegister.findUnique({
    where: { id },
    include: {
      movements: {
        orderBy: { performedAt: 'desc' },
        take: 50,
      },
    },
  });
}

export async function createCashRegister(input: CreateCashRegisterInput, createdBy: string) {
  const register = await prisma.cashRegister.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name,
      location: input.location || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CASH_REGISTER_CREATE,
    module: MODULES.TREASURY,
    entity: 'CashRegister',
    entityId: register.id,
    dataAfter: { code: register.code, name: register.name },
    details: `Caja ${register.code} - ${register.name} creada`,
  });

  return register;
}

async function generateMovementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOV-${year}-`;
  const last = await prisma.cashMovement.findFirst({
    where: { movementNumber: { startsWith: prefix } },
    orderBy: { movementNumber: 'desc' },
    select: { movementNumber: true },
  });

  let seq = 1;
  if (last) {
    const num = parseInt(last.movementNumber.replace(prefix, ''));
    if (!isNaN(num)) seq = num + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function openCashRegister(id: string, input: OpenCashRegisterInput, openedBy: string) {
  const register = await prisma.cashRegister.findUnique({ where: { id } });
  if (!register) throw new Error('Caja no encontrada');
  if (register.status === 'ABIERTA') throw new Error('La caja ya está abierta');

  const movementNumber = await generateMovementNumber();

  const [updated] = await prisma.$transaction([
    prisma.cashRegister.update({
      where: { id },
      data: {
        status: 'ABIERTA',
        openedAt: new Date(),
        openedBy,
        openingBalance: input.openingBalance,
        currentBalance: input.openingBalance,
        closedAt: null,
        closedBy: null,
      },
    }),
    prisma.cashMovement.create({
      data: {
        cashRegisterId: id,
        movementNumber,
        movementType: 'APERTURA',
        concept: 'Apertura de caja',
        amount: input.openingBalance,
        previousBalance: 0,
        newBalance: input.openingBalance,
        observations: input.observations || null,
        performedBy: openedBy,
      },
    }),
  ]);

  await createAuditLog({
    userId: openedBy,
    action: AUDIT_ACTIONS.CASH_REGISTER_OPEN,
    module: MODULES.TREASURY,
    entity: 'CashRegister',
    entityId: id,
    dataAfter: { openingBalance: input.openingBalance },
    details: `Caja ${register.code} abierta con saldo $${input.openingBalance}`,
  });

  return updated;
}

export async function closeCashRegister(id: string, observations: string | null, closedBy: string) {
  const register = await prisma.cashRegister.findUnique({ where: { id } });
  if (!register) throw new Error('Caja no encontrada');
  if (register.status !== 'ABIERTA') throw new Error('La caja no está abierta');

  const movementNumber = await generateMovementNumber();
  const closingBalance = toNumber(register.currentBalance);

  const [updated] = await prisma.$transaction([
    prisma.cashRegister.update({
      where: { id },
      data: {
        status: 'CERRADA',
        closedAt: new Date(),
        closedBy,
      },
    }),
    prisma.cashMovement.create({
      data: {
        cashRegisterId: id,
        movementNumber,
        movementType: 'CIERRE',
        concept: 'Cierre de caja',
        amount: closingBalance,
        previousBalance: closingBalance,
        newBalance: closingBalance,
        observations,
        performedBy: closedBy,
      },
    }),
  ]);

  await createAuditLog({
    userId: closedBy,
    action: AUDIT_ACTIONS.CASH_REGISTER_CLOSE,
    module: MODULES.TREASURY,
    entity: 'CashRegister',
    entityId: id,
    dataAfter: { closingBalance },
    details: `Caja ${register.code} cerrada con saldo $${closingBalance}`,
  });

  return updated;
}

export async function createCashMovement(input: CreateCashMovementInput, performedBy: string) {
  const register = await prisma.cashRegister.findUnique({ where: { id: input.cashRegisterId } });
  if (!register) throw new Error('Caja no encontrada');
  if (register.status !== 'ABIERTA') throw new Error('La caja no está abierta');

  const currentBalance = toNumber(register.currentBalance);
  const change = input.movementType === 'INGRESO' ? input.amount : -input.amount;
  const newBalance = Math.round((currentBalance + change) * 100) / 100;

  if (newBalance < 0) throw new Error('Saldo insuficiente en caja');

  const movementNumber = await generateMovementNumber();

  const [movement] = await prisma.$transaction([
    prisma.cashMovement.create({
      data: {
        cashRegisterId: input.cashRegisterId,
        movementNumber,
        movementType: input.movementType,
        concept: input.concept,
        amount: input.amount,
        previousBalance: currentBalance,
        newBalance,
        reference: input.reference || null,
        thirdPartyName: input.thirdPartyName || null,
        observations: input.observations || null,
        performedBy,
      },
    }),
    prisma.cashRegister.update({
      where: { id: input.cashRegisterId },
      data: { currentBalance: newBalance },
    }),
  ]);

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.CASH_MOVEMENT_CREATE,
    module: MODULES.TREASURY,
    entity: 'CashMovement',
    entityId: movement.id,
    dataAfter: { movementType: input.movementType, amount: input.amount, concept: input.concept, newBalance },
    details: `Movimiento de caja ${movementNumber} - ${input.movementType} $${input.amount}`,
  });

  return movement;
}

// ============================================================
// TREASURY DASHBOARD SUMMARY
// ============================================================

export async function getTreasurySummary() {
  const [bankAccounts, cashRegisters, pendingTransactions, recentReconciliations] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { isActive: true },
      select: { id: true, code: true, bankName: true, accountNumber: true, accountType: true, currentBalance: true },
      orderBy: { bankName: 'asc' },
    }),
    prisma.cashRegister.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, status: true, currentBalance: true, openedAt: true },
      orderBy: { code: 'asc' },
    }),
    prisma.bankTransaction.count({ where: { reconciliationStatus: 'PENDIENTE' } }),
    prisma.bankReconciliation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { bankAccount: { select: { code: true, bankName: true } } },
    }),
  ]);

  const totalBankBalance = bankAccounts.reduce((s, a) => s + toNumber(a.currentBalance), 0);
  const totalCashBalance = cashRegisters.reduce((s, c) => s + toNumber(c.currentBalance), 0);
  const openCashRegisters = cashRegisters.filter((c) => c.status === 'ABIERTA').length;

  return {
    bankAccounts,
    cashRegisters,
    pendingTransactions,
    recentReconciliations,
    totals: {
      totalBankBalance,
      totalCashBalance,
      totalLiquidity: totalBankBalance + totalCashBalance,
      openCashRegisters,
      totalBankAccounts: bankAccounts.length,
    },
  };
}
