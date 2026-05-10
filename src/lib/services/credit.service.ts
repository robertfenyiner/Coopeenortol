// ============================================================
// CoopManager - Credit Service (Fase 4)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  ApproveCreditInput,
  CreateCreditCoDebtorInput,
  CreateCreditInput,
  CreditPaymentInput,
  RefinanceCreditInput,
} from '@/lib/validations/schemas';
import { ACCOUNTING_EVENTS, postSimpleRuleEntry } from './accounting.service';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// ------------------------------------------------------------
// Generar número de crédito correlativo
// ------------------------------------------------------------
export async function generateCreditNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CRE-${year}-`;

  const last = await prisma.credit.findFirst({
    where: { creditNumber: { startsWith: prefix } },
    orderBy: { creditNumber: 'desc' },
  });

  let next = 1;
  if (last) {
    const lastNum = parseInt(last.creditNumber.split('-').pop() || '0', 10);
    next = lastNum + 1;
  }

  return `${prefix}${String(next).padStart(4, '0')}`;
}

// ------------------------------------------------------------
// Generar tabla de amortización (cuota fija - sistema francés)
// ------------------------------------------------------------
function calculateAmortization(params: {
  amount: number;
  monthlyRate: number;
  termMonths: number;
  startDate: Date;
}) {
  const { amount, monthlyRate, termMonths, startDate } = params;
  const entries: Array<{
    installmentNumber: number;
    dueDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    remainingBalance: number;
  }> = [];

  // Cuota fija = P * r / (1 - (1+r)^-n)
  const rate = monthlyRate / 100;
  let fixedPayment: number;
  if (rate === 0) {
    fixedPayment = amount / termMonths;
  } else {
    fixedPayment = (amount * rate) / (1 - Math.pow(1 + rate, -termMonths));
  }
  fixedPayment = Math.round(fixedPayment * 100) / 100;

  let balance = amount;
  for (let i = 1; i <= termMonths; i++) {
    const interest = Math.round(balance * rate * 100) / 100;
    let principal = Math.round((fixedPayment - interest) * 100) / 100;

    // Última cuota ajusta el residuo
    if (i === termMonths) {
      principal = Math.round(balance * 100) / 100;
    }

    balance = Math.round((balance - principal) * 100) / 100;
    if (balance < 0) balance = 0;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    entries.push({
      installmentNumber: i,
      dueDate,
      principalAmount: principal,
      interestAmount: interest,
      totalAmount: Math.round((principal + interest) * 100) / 100,
      remainingBalance: balance,
    });
  }

  return entries;
}

function calculateFixedPayment(amount: number, monthlyRate: number, termMonths: number): number {
  const rate = monthlyRate / 100;
  const payment = rate === 0
    ? amount / termMonths
    : (amount * rate) / (1 - Math.pow(1 + rate, -termMonths));
  return roundMoney(payment);
}

// ------------------------------------------------------------
// Listar créditos con filtros
// ------------------------------------------------------------
export async function getCredits(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  creditLine?: string;
  associateId?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.status) where.status = params.status;
  if (params.creditLine) where.creditLine = params.creditLine;
  if (params.associateId) where.associateId = params.associateId;

  if (params.search) {
    where.OR = [
      { creditNumber: { contains: params.search, mode: 'insensitive' } },
      { associate: { associateNumber: { contains: params.search, mode: 'insensitive' } } },
      { associate: { person: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { associate: { person: { lastName: { contains: params.search, mode: 'insensitive' } } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.credit.findMany({
      where,
      include: {
        associate: {
          include: {
            person: {
              select: { firstName: true, lastName: true, secondLastName: true, documentNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.credit.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ------------------------------------------------------------
// Detalle de un crédito
// ------------------------------------------------------------
export async function getCreditById(id: string) {
  return prisma.credit.findUnique({
    where: { id },
    include: {
      associate: {
        include: {
          person: {
            select: {
              firstName: true, lastName: true, secondLastName: true,
              documentType: true, documentNumber: true, email: true, mobilePhone: true,
            },
          },
        },
      },
      amortization: { orderBy: { installmentNumber: 'asc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      coDebtors: {
        where: { status: 'ACTIVO' },
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
                  monthlyIncome: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      scoreSnapshots: { orderBy: { evaluatedAt: 'desc' }, take: 5 },
      refinancedFrom: {
        include: { newCredit: { select: { id: true, creditNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      },
      refinancedInto: {
        include: { originalCredit: { select: { id: true, creditNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// ------------------------------------------------------------
// Crear solicitud de crédito
// ------------------------------------------------------------
export async function createCredit(input: CreateCreditInput, createdBy: string) {
  const associate = await prisma.associate.findUnique({
    where: { id: input.associateId },
    include: { person: true },
  });
  if (!associate) throw new Error('Asociado no encontrado');
  if (associate.status !== 'ACTIVO') throw new Error('El asociado no está activo');

  const creditNumber = await generateCreditNumber();

  const credit = await prisma.credit.create({
    data: {
      associateId: input.associateId,
      creditNumber,
      creditLine: input.creditLine,
      requestedAmount: input.requestedAmount,
      interestRate: input.interestRate,
      termMonths: input.termMonths,
      paymentFrequency: input.paymentFrequency,
      purpose: input.purpose || null,
      guaranteeType: input.guaranteeType || null,
      guaranteeDescription: input.guaranteeDescription || null,
      observations: input.observations || null,
      status: 'SOLICITUD',
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREDIT_REQUEST,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: credit.id,
    dataAfter: { creditNumber, requestedAmount: input.requestedAmount, creditLine: input.creditLine },
    details: `Solicitud ${creditNumber}: $${input.requestedAmount.toLocaleString()} - ${associate.person.firstName} ${associate.person.lastName}`,
  });

  return credit;
}

// ------------------------------------------------------------
// Aprobar crédito (genera tabla de amortización)
// ------------------------------------------------------------
export async function approveCredit(id: string, input: ApproveCreditInput, approvedBy: string) {
  const credit = await prisma.credit.findUnique({ where: { id } });
  if (!credit) throw new Error('Crédito no encontrado');
  if (credit.status !== 'SOLICITUD' && credit.status !== 'EN_EVALUACION') {
    throw new Error('Solo se pueden aprobar créditos en solicitud o evaluación');
  }

  const rate = input.interestRate ?? Number(credit.interestRate);
  const term = input.termMonths ?? credit.termMonths;

  await prisma.$transaction(async (tx) => {
    await tx.credit.update({
      where: { id },
      data: {
        status: 'APROBADO',
        approvedAmount: input.approvedAmount,
        interestRate: rate,
        termMonths: term,
        approvedDate: new Date(),
        approvedBy,
        observations: input.observations || credit.observations,
      },
    });

    // Generar tabla de amortización
    const startDate = new Date();
    const entries = calculateAmortization({
      amount: input.approvedAmount,
      monthlyRate: rate,
      termMonths: term,
      startDate,
    });

    for (const entry of entries) {
      await tx.amortizationEntry.create({
        data: {
          creditId: id,
          installmentNumber: entry.installmentNumber,
          dueDate: entry.dueDate,
          principalAmount: entry.principalAmount,
          interestAmount: entry.interestAmount,
          totalAmount: entry.totalAmount,
          remainingBalance: entry.remainingBalance,
        },
      });
    }
  });

  await createAuditLog({
    userId: approvedBy,
    action: AUDIT_ACTIONS.CREDIT_APPROVE,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: id,
    dataAfter: { approvedAmount: input.approvedAmount, interestRate: rate, termMonths: term },
    details: `Crédito ${credit.creditNumber} aprobado: $${input.approvedAmount.toLocaleString()}`,
  });

  return getCreditById(id);
}

// ------------------------------------------------------------
// Rechazar crédito
// ------------------------------------------------------------
export async function rejectCredit(id: string, reason: string, rejectedBy: string) {
  const credit = await prisma.credit.findUnique({ where: { id } });
  if (!credit) throw new Error('Crédito no encontrado');
  if (credit.status !== 'SOLICITUD' && credit.status !== 'EN_EVALUACION') {
    throw new Error('Solo se pueden rechazar créditos en solicitud o evaluación');
  }

  await prisma.credit.update({
    where: { id },
    data: { status: 'RECHAZADO', rejectedDate: new Date(), rejectionReason: reason },
  });

  await createAuditLog({
    userId: rejectedBy,
    action: AUDIT_ACTIONS.CREDIT_REJECT,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: id,
    details: `Crédito ${credit.creditNumber} rechazado: ${reason}`,
  });
}

// ------------------------------------------------------------
// Desembolsar crédito
// ------------------------------------------------------------
export async function disburseCredit(id: string, performedBy: string) {
  const credit = await prisma.credit.findUnique({
    where: { id },
    include: { associate: { include: { person: true } } },
  });
  if (!credit) throw new Error('Crédito no encontrado');
  if (credit.status !== 'APROBADO') throw new Error('Solo se pueden desembolsar créditos aprobados');

  const disbursedAmount = Number(credit.approvedAmount);
  const firstEntry = await prisma.amortizationEntry.findFirst({
    where: { creditId: id },
    orderBy: { installmentNumber: 'asc' },
  });

  await prisma.credit.update({
    where: { id },
    data: {
      status: 'VIGENTE',
      disbursedAmount,
      outstandingBalance: disbursedAmount,
      disbursementDate: new Date(),
      firstPaymentDate: firstEntry?.dueDate || null,
    },
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.CREDIT_DISBURSE,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: id,
    dataAfter: { disbursedAmount },
    details: `Crédito ${credit.creditNumber} desembolsado: $${disbursedAmount.toLocaleString()}`,
  });

  await postSimpleRuleEntry({
    module: MODULES.CREDITS,
    event: ACCOUNTING_EVENTS.CREDIT_DISBURSEMENT,
    amount: disbursedAmount,
    description: `Desembolso crédito ${credit.creditNumber}`,
    sourceEntity: 'Credit',
    sourceEntityId: id,
    associateId: credit.associateId,
    thirdPartyName: `${credit.associate.person.firstName} ${credit.associate.person.lastName}`,
    createdBy: performedBy,
  });

  return getCreditById(id);
}

// ------------------------------------------------------------
// Registrar pago de crédito
// ------------------------------------------------------------
export async function registerCreditPayment(creditId: string, input: CreditPaymentInput, createdBy: string) {
  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    include: { payments: true, associate: { include: { person: true } } },
  });
  if (!credit) throw new Error('Crédito no encontrado');
  if (credit.status !== 'VIGENTE' && credit.status !== 'VENCIDO') {
    throw new Error('Solo se aceptan pagos en créditos vigentes o vencidos');
  }

  const paymentNumber = credit.payments.length + 1;

  // Buscar siguiente cuota pendiente
  const nextEntry = await prisma.amortizationEntry.findFirst({
    where: { creditId, status: 'PENDIENTE' },
    orderBy: { installmentNumber: 'asc' },
  });

  let principalPaid = 0;
  let interestPaid = 0;

  if (nextEntry) {
    interestPaid = Math.min(input.amount, Number(nextEntry.interestAmount));
    principalPaid = input.amount - interestPaid;
  } else {
    principalPaid = input.amount;
  }

  let createdPaymentId = '';

  await prisma.$transaction(async (tx) => {
    // 1. Registrar pago
    const payment = await tx.creditPayment.create({
      data: {
        creditId,
        paymentNumber,
        amount: input.amount,
        principalPaid,
        interestPaid,
        paymentMethod: input.paymentMethod,
        reference: input.reference || null,
        observations: input.observations || null,
        createdBy,
      },
    });
    createdPaymentId = payment.id;

    // 2. Marcar cuota como pagada si corresponde
    if (nextEntry) {
      await tx.amortizationEntry.update({
        where: { id: nextEntry.id },
        data: { status: 'PAGADO', paidDate: new Date(), paidAmount: input.amount },
      });
    }

    // 3. Actualizar saldos del crédito
    const newBalance = Number(credit.outstandingBalance) - principalPaid;
    const updateData: Record<string, unknown> = {
      outstandingBalance: Math.max(newBalance, 0),
      totalPaid: { increment: input.amount },
      totalInterestPaid: { increment: interestPaid },
      lastPaymentDate: new Date(),
    };

    // Si saldo llega a 0, marcar como PAGADO
    if (newBalance <= 0) {
      updateData.status = 'PAGADO';
    }

    await tx.credit.update({ where: { id: creditId }, data: updateData });
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREDIT_PAYMENT,
    module: MODULES.CREDITS,
    entity: 'CreditPayment',
    entityId: creditId,
    dataAfter: { paymentNumber, amount: input.amount, principalPaid, interestPaid },
    details: `Pago #${paymentNumber} al crédito ${credit.creditNumber}: $${input.amount.toLocaleString()}`,
  });

  await postSimpleRuleEntry({
    module: MODULES.CREDITS,
    event: ACCOUNTING_EVENTS.CREDIT_PAYMENT,
    amount: principalPaid,
    description: `Abono a capital crédito ${credit.creditNumber}`,
    sourceEntity: 'CreditPayment',
    sourceEntityId: createdPaymentId,
    associateId: credit.associateId,
    thirdPartyName: `${credit.associate.person.firstName} ${credit.associate.person.lastName}`,
    createdBy,
  });

  return getCreditById(creditId);
}

// ------------------------------------------------------------
// Scoring, codeudores y refinanciacion
// ------------------------------------------------------------
export async function evaluateCreditScore(creditId: string, evaluatedBy: string) {
  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    include: {
      associate: {
        include: {
          person: true,
          savingsAccounts: { where: { isActive: true } },
          cdatInvestments: { where: { status: 'ACTIVO' } },
        },
      },
      coDebtors: {
        where: { status: 'ACTIVO' },
        include: { associate: { include: { person: true } } },
      },
    },
  });
  if (!credit) throw new Error('Credito no encontrado');

  const associateIncome = toNumber(credit.associate.person.monthlyIncome);
  const coDebtorIncome = credit.coDebtors.reduce((sum, coDebtor) => (
    sum + Math.max(toNumber(coDebtor.monthlyIncome), toNumber(coDebtor.associate.person.monthlyIncome))
  ), 0);
  const totalIncome = associateIncome + coDebtorIncome;
  const requestedAmount = toNumber(credit.approvedAmount || credit.requestedAmount);
  const estimatedPayment = calculateFixedPayment(requestedAmount, toNumber(credit.interestRate), credit.termMonths);
  const debtRatio = totalIncome > 0 ? roundMoney((estimatedPayment / totalIncome) * 100) : 100;
  const savingsBalance = credit.associate.savingsAccounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
  const cdatBalance = credit.associate.cdatInvestments.reduce((sum, investment) => sum + toNumber(investment.principalAmount), 0);
  const savingsCoveragePct = requestedAmount > 0 ? roundMoney(((savingsBalance + cdatBalance) / requestedAmount) * 100) : 0;

  const [activeCreditsCount, overdueInstallmentsCount] = await Promise.all([
    prisma.credit.count({
      where: { associateId: credit.associateId, id: { not: credit.id }, status: { in: ['VIGENTE', 'VENCIDO'] } },
    }),
    prisma.amortizationEntry.count({
      where: {
        credit: { associateId: credit.associateId },
        status: { in: ['PENDIENTE', 'VENCIDO'] },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  let score = 100;
  if (debtRatio > 50) score -= 35;
  else if (debtRatio > 40) score -= 25;
  else if (debtRatio > 30) score -= 12;
  if (savingsCoveragePct < 10) score -= 18;
  else if (savingsCoveragePct < 25) score -= 8;
  if (activeCreditsCount > 2) score -= 15;
  else if (activeCreditsCount > 0) score -= 6;
  if (overdueInstallmentsCount > 2) score -= 30;
  else if (overdueInstallmentsCount > 0) score -= 15;
  if (credit.coDebtors.length > 0) score += 8;
  if (associateIncome === 0) score -= 20;
  score = Math.max(0, Math.min(100, score));

  const riskLevel = score >= 75 ? 'BAJO' : score >= 55 ? 'MEDIO' : 'ALTO';
  const recommendation = score >= 75 ? 'APROBAR' : score >= 55 ? 'REVISAR' : 'RECHAZAR';

  const snapshot = await prisma.creditScoreSnapshot.create({
    data: {
      creditId: credit.id,
      score,
      riskLevel,
      recommendation,
      debtRatio,
      savingsCoveragePct,
      activeCreditsCount,
      overdueInstallmentsCount,
      monthlyIncome: totalIncome,
      requestedAmount,
      evaluatedBy,
      createdBy: evaluatedBy,
      details: {
        estimatedPayment,
        associateIncome,
        coDebtorIncome,
        savingsBalance,
        cdatBalance,
        coDebtorsCount: credit.coDebtors.length,
      },
    },
  });

  if (credit.status === 'SOLICITUD') {
    await prisma.credit.update({ where: { id: credit.id }, data: { status: 'EN_EVALUACION' } });
  }

  await createAuditLog({
    userId: evaluatedBy,
    action: AUDIT_ACTIONS.CREDIT_SCORE_EVALUATE,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: credit.id,
    dataAfter: { score, riskLevel, recommendation, debtRatio, savingsCoveragePct },
    details: `Scoring ${score}/100 para credito ${credit.creditNumber}`,
  });

  return snapshot;
}

export async function addCreditCoDebtor(creditId: string, input: CreateCreditCoDebtorInput, createdBy: string) {
  const [credit, associate] = await Promise.all([
    prisma.credit.findUnique({ where: { id: creditId } }),
    prisma.associate.findUnique({ where: { id: input.associateId }, include: { person: true } }),
  ]);
  if (!credit) throw new Error('Credito no encontrado');
  if (!associate) throw new Error('Codeudor no encontrado');
  if (associate.status !== 'ACTIVO') throw new Error('El codeudor debe estar activo');
  if (credit.associateId === input.associateId) throw new Error('El titular no puede ser su propio codeudor');
  if (!['SOLICITUD', 'EN_EVALUACION', 'APROBADO'].includes(credit.status)) {
    throw new Error('Solo se pueden agregar codeudores antes del desembolso');
  }

  const coDebtor = await prisma.creditCoDebtor.create({
    data: {
      creditId,
      associateId: input.associateId,
      relationship: input.relationship || null,
      monthlyIncome: input.monthlyIncome ?? null,
      observations: input.observations || null,
      createdBy,
    },
    include: { associate: { include: { person: true } } },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREDIT_CODEBTOR_ADD,
    module: MODULES.CREDITS,
    entity: 'CreditCoDebtor',
    entityId: coDebtor.id,
    dataAfter: { creditId, associateId: input.associateId },
    details: `Codeudor ${associate.associateNumber} agregado al credito ${credit.creditNumber}`,
  });

  return coDebtor;
}

export async function removeCreditCoDebtor(creditId: string, coDebtorId: string, updatedBy: string) {
  const coDebtor = await prisma.creditCoDebtor.findFirst({
    where: { id: coDebtorId, creditId },
    include: { credit: true },
  });
  if (!coDebtor) throw new Error('Codeudor no encontrado');
  if (!['SOLICITUD', 'EN_EVALUACION', 'APROBADO'].includes(coDebtor.credit.status)) {
    throw new Error('Solo se pueden retirar codeudores antes del desembolso');
  }

  const updated = await prisma.creditCoDebtor.update({
    where: { id: coDebtorId },
    data: { status: 'RETIRADO', updatedBy },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.CREDIT_CODEBTOR_REMOVE,
    module: MODULES.CREDITS,
    entity: 'CreditCoDebtor',
    entityId: coDebtorId,
    dataBefore: { status: coDebtor.status },
    dataAfter: { status: updated.status },
    details: `Codeudor retirado del credito ${coDebtor.credit.creditNumber}`,
  });

  return updated;
}

export async function refinanceCredit(creditId: string, input: RefinanceCreditInput, createdBy: string) {
  const original = await prisma.credit.findUnique({
    where: { id: creditId },
    include: { associate: { include: { person: true } } },
  });
  if (!original) throw new Error('Credito no encontrado');
  if (!['VIGENTE', 'VENCIDO'].includes(original.status)) {
    throw new Error('Solo se pueden refinanciar creditos vigentes o vencidos');
  }
  const previousBalance = toNumber(original.outstandingBalance);
  if (previousBalance <= 0) throw new Error('El credito no tiene saldo para refinanciar');
  if (input.newAmount < previousBalance) {
    throw new Error('El nuevo monto no puede ser menor al saldo pendiente');
  }

  const creditNumber = await generateCreditNumber();
  let newCreditId = '';

  await prisma.$transaction(async (tx) => {
    const newCredit = await tx.credit.create({
      data: {
        associateId: original.associateId,
        creditNumber,
        creditLine: original.creditLine,
        status: 'APROBADO',
        requestedAmount: input.newAmount,
        approvedAmount: input.newAmount,
        interestRate: input.interestRate,
        termMonths: input.termMonths,
        paymentFrequency: original.paymentFrequency,
        purpose: `Refinanciacion de ${original.creditNumber}`,
        guaranteeType: original.guaranteeType,
        guaranteeDescription: original.guaranteeDescription,
        observations: input.observations || input.reason,
        approvedDate: new Date(),
        approvedBy: createdBy,
        createdBy,
      },
    });
    newCreditId = newCredit.id;

    const entries = calculateAmortization({
      amount: input.newAmount,
      monthlyRate: input.interestRate,
      termMonths: input.termMonths,
      startDate: new Date(),
    });
    for (const entry of entries) {
      await tx.amortizationEntry.create({
        data: {
          creditId: newCredit.id,
          installmentNumber: entry.installmentNumber,
          dueDate: entry.dueDate,
          principalAmount: entry.principalAmount,
          interestAmount: entry.interestAmount,
          totalAmount: entry.totalAmount,
          remainingBalance: entry.remainingBalance,
        },
      });
    }

    await tx.credit.update({
      where: { id: original.id },
      data: {
        status: 'PAGADO',
        outstandingBalance: 0,
        observations: `${original.observations || ''}\nRefinanciado por ${creditNumber}: ${input.reason}`.trim(),
      },
    });

    await tx.creditRefinancing.create({
      data: {
        originalCreditId: original.id,
        newCreditId: newCredit.id,
        previousBalance,
        newAmount: input.newAmount,
        previousRate: original.interestRate,
        newRate: input.interestRate,
        previousTermMonths: original.termMonths,
        newTermMonths: input.termMonths,
        reason: input.reason,
        createdBy,
      },
    });
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREDIT_REFINANCE,
    module: MODULES.CREDITS,
    entity: 'Credit',
    entityId: creditId,
    dataAfter: { previousBalance, newAmount: input.newAmount, newCreditId },
    details: `Credito ${original.creditNumber} refinanciado como ${creditNumber}`,
  });

  return getCreditById(newCreditId);
}
