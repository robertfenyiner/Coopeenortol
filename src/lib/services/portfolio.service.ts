// ============================================================
// CoopManager - Portfolio / Cartera Service (Fase 6 + H)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  CreatePaymentAgreementInput,
  UpdatePaymentAgreementStatusInput,
} from '@/lib/validations/schemas';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function provisionPolicy(daysOverdue: number): { riskCategory: string; rate: number } {
  if (daysOverdue <= 0) return { riskCategory: 'A', rate: 1 };
  if (daysOverdue <= 30) return { riskCategory: 'B', rate: 5 };
  if (daysOverdue <= 60) return { riskCategory: 'C', rate: 20 };
  if (daysOverdue <= 90) return { riskCategory: 'D', rate: 50 };
  return { riskCategory: 'E', rate: 100 };
}

export async function generateAgreementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ACP-${year}-`;
  const last = await prisma.paymentAgreement.findFirst({
    where: { agreementNumber: { startsWith: prefix } },
    orderBy: { agreementNumber: 'desc' },
  });
  const next = last ? parseInt(last.agreementNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// ------------------------------------------------------------
// Resumen general de cartera
// ------------------------------------------------------------
export async function getPortfolioSummary() {
  const now = new Date();

  const [
    totalActiveCredits,
    totalOverdueCredits,
    totalOutstanding,
    totalOverdueBalance,
    overdueEntries,
    healthyBalance,
    recentPayments,
    activeAgreements,
    activeProvisions,
  ] = await Promise.all([
    // Créditos activos (vigentes + vencidos)
    prisma.credit.count({ where: { status: { in: ['VIGENTE', 'VENCIDO'] } } }),
    // Créditos marcados vencidos
    prisma.credit.count({ where: { status: 'VENCIDO' } }),
    // Saldo total de cartera
    prisma.credit.aggregate({
      where: { status: { in: ['VIGENTE', 'VENCIDO'] } },
      _sum: { outstandingBalance: true },
    }),
    // Saldo solo de créditos vencidos
    prisma.credit.aggregate({
      where: { status: 'VENCIDO' },
      _sum: { outstandingBalance: true },
    }),
    // Cuotas vencidas (pendientes con fecha pasada)
    prisma.amortizationEntry.findMany({
      where: {
        status: 'PENDIENTE',
        dueDate: { lt: now },
        credit: { status: { in: ['VIGENTE', 'VENCIDO'] } },
      },
      include: {
        credit: {
          include: {
            associate: {
              include: {
                person: { select: { firstName: true, lastName: true, documentNumber: true, mobilePhone: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    // Saldo de créditos al día (vigentes)
    prisma.credit.aggregate({
      where: { status: 'VIGENTE' },
      _sum: { outstandingBalance: true },
    }),
    // Últimos pagos
    prisma.creditPayment.findMany({
      include: {
        credit: {
          include: {
            associate: {
              include: { person: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 10,
    }),
    prisma.paymentAgreement.findMany({
      where: { status: 'ACTIVO' },
      include: {
        credit: {
          include: {
            associate: {
              include: { person: { select: { firstName: true, lastName: true, documentNumber: true, mobilePhone: true } } },
            },
          },
        },
        schedule: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.portfolioProvision.findMany({
      where: { status: 'VIGENTE' },
      include: {
        credit: {
          include: {
            associate: {
              include: { person: { select: { firstName: true, lastName: true, documentNumber: true } } },
            },
          },
        },
      },
      orderBy: [{ calculationDate: 'desc' }, { provisionAmount: 'desc' }],
      take: 50,
    }),
  ]);

  const totalOutstandingAmount = Number(totalOutstanding._sum.outstandingBalance || 0);
  const totalOverdueAmount = Number(totalOverdueBalance._sum.outstandingBalance || 0);
  const healthyAmount = Number(healthyBalance._sum.outstandingBalance || 0);
  const overduePercent = totalOutstandingAmount > 0
    ? Math.round((totalOverdueAmount / totalOutstandingAmount) * 10000) / 100
    : 0;
  const totalProvisionAmount = activeProvisions.reduce((sum, item) => sum + toNumber(item.provisionAmount), 0);

  // Agrupar cuotas vencidas por asociado
  const overdueByAssociate: Record<string, {
    associateId: string;
    associateNumber: string;
    name: string;
    document: string;
    phone: string | null;
    creditNumber: string;
    creditId: string;
    overdueInstallments: number;
    totalOverdue: number;
    oldestDueDate: string;
    daysOverdue: number;
  }> = {};

  for (const entry of overdueEntries) {
    const key = `${entry.credit.id}`;
    if (!overdueByAssociate[key]) {
      const daysOverdue = Math.floor((now.getTime() - new Date(entry.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      overdueByAssociate[key] = {
        associateId: entry.credit.associateId,
        associateNumber: entry.credit.associate.associateNumber,
        name: `${entry.credit.associate.person.firstName} ${entry.credit.associate.person.lastName}`,
        document: entry.credit.associate.person.documentNumber,
        phone: entry.credit.associate.person.mobilePhone,
        creditNumber: entry.credit.creditNumber,
        creditId: entry.credit.id,
        overdueInstallments: 0,
        totalOverdue: 0,
        oldestDueDate: entry.dueDate.toISOString(),
        daysOverdue,
      };
    }
    overdueByAssociate[key].overdueInstallments += 1;
    overdueByAssociate[key].totalOverdue += Number(entry.totalAmount);
  }

  const overdueList = Object.values(overdueByAssociate).sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Clasificar por rangos de mora
  const aging = {
    '1-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  };

  for (const item of overdueList) {
    if (item.daysOverdue <= 30) { aging['1-30'].count++; aging['1-30'].amount += item.totalOverdue; }
    else if (item.daysOverdue <= 60) { aging['31-60'].count++; aging['31-60'].amount += item.totalOverdue; }
    else if (item.daysOverdue <= 90) { aging['61-90'].count++; aging['61-90'].amount += item.totalOverdue; }
    else { aging['90+'].count++; aging['90+'].amount += item.totalOverdue; }
  }

  return {
    summary: {
      totalActiveCredits,
      totalOverdueCredits,
      totalOutstanding: totalOutstandingAmount,
      totalOverdue: totalOverdueAmount,
      healthyBalance: healthyAmount,
      overduePercent,
      totalProvisionAmount,
      activeAgreements: activeAgreements.length,
    },
    aging,
    overdueList,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      creditNumber: p.credit.creditNumber,
      associateName: `${p.credit.associate.person.firstName} ${p.credit.associate.person.lastName}`,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
    })),
    provisions: activeProvisions.map((p) => ({
      id: p.id,
      creditId: p.creditId,
      creditNumber: p.credit.creditNumber,
      associateName: `${p.credit.associate.person.firstName} ${p.credit.associate.person.lastName}`,
      riskCategory: p.riskCategory,
      daysOverdue: p.daysOverdue,
      outstandingBalance: toNumber(p.outstandingBalance),
      overdueAmount: toNumber(p.overdueAmount),
      provisionRate: toNumber(p.provisionRate),
      provisionAmount: toNumber(p.provisionAmount),
      calculationDate: p.calculationDate,
    })),
    agreements: activeAgreements.map((agreement) => {
      const nextInstallment = agreement.schedule.find((item) => item.status === 'PENDIENTE');
      return {
        id: agreement.id,
        agreementNumber: agreement.agreementNumber,
        creditId: agreement.creditId,
        creditNumber: agreement.credit.creditNumber,
        associateName: `${agreement.credit.associate.person.firstName} ${agreement.credit.associate.person.lastName}`,
        status: agreement.status,
        agreedAmount: toNumber(agreement.agreedAmount),
        installmentAmount: toNumber(agreement.installmentAmount),
        installments: agreement.installments,
        nextDueDate: nextInstallment?.dueDate || null,
        nextAmount: nextInstallment ? toNumber(nextInstallment.amount) : 0,
      };
    }),
  };
}

export async function calculatePortfolioProvisions(createdBy: string) {
  const now = new Date();
  const credits = await prisma.credit.findMany({
    where: { status: { in: ['VIGENTE', 'VENCIDO'] }, outstandingBalance: { gt: 0 } },
    include: {
      amortization: {
        where: { status: { in: ['PENDIENTE', 'VENCIDO'] } },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  await prisma.portfolioProvision.updateMany({
    where: { status: 'VIGENTE' },
    data: { status: 'REVERSADA' },
  });

  const created = [];
  for (const credit of credits) {
    const overdueEntries = credit.amortization.filter((entry) => entry.dueDate < now);
    const oldest = overdueEntries[0];
    const daysOverdue = oldest ? Math.floor((now.getTime() - oldest.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const overdueAmount = overdueEntries.reduce((sum, entry) => sum + toNumber(entry.totalAmount), 0);
    const policy = provisionPolicy(daysOverdue);
    const outstandingBalance = toNumber(credit.outstandingBalance);
    const provisionAmount = roundMoney(outstandingBalance * (policy.rate / 100));
    const provision = await prisma.portfolioProvision.create({
      data: {
        creditId: credit.id,
        daysOverdue,
        riskCategory: policy.riskCategory,
        outstandingBalance,
        overdueAmount,
        provisionRate: policy.rate,
        provisionAmount,
        createdBy,
        notes: `Provision automatica categoria ${policy.riskCategory}`,
      },
    });
    created.push(provision);
  }

  const totalProvision = created.reduce((sum, item) => sum + toNumber(item.provisionAmount), 0);
  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.PORTFOLIO_PROVISION_CALCULATE,
    module: MODULES.PORTFOLIO,
    entity: 'PortfolioProvision',
    dataAfter: { credits: created.length, totalProvision },
    details: `Provision de cartera calculada para ${created.length} creditos`,
  });

  return { count: created.length, totalProvision, provisions: created };
}

export async function createPaymentAgreement(input: CreatePaymentAgreementInput, createdBy: string) {
  const credit = await prisma.credit.findUnique({
    where: { id: input.creditId },
    include: { associate: { include: { person: true } } },
  });
  if (!credit) throw new Error('Credito no encontrado');
  if (!['VIGENTE', 'VENCIDO'].includes(credit.status)) {
    throw new Error('Solo se pueden crear acuerdos sobre creditos vigentes o vencidos');
  }
  if (input.agreedAmount > toNumber(credit.outstandingBalance)) {
    throw new Error('El monto acordado no puede superar el saldo pendiente');
  }
  if (input.initialPayment >= input.agreedAmount) {
    throw new Error('El pago inicial debe ser menor al monto acordado');
  }

  const agreementNumber = await generateAgreementNumber();
  const startDate = new Date(`${input.startDate}T00:00:00`);
  const financedAmount = roundMoney(input.agreedAmount - input.initialPayment);
  const installmentAmount = roundMoney(financedAmount / input.installments);

  const agreement = await prisma.paymentAgreement.create({
    data: {
      agreementNumber,
      creditId: credit.id,
      agreedAmount: input.agreedAmount,
      initialPayment: input.initialPayment,
      installmentAmount,
      installments: input.installments,
      startDate,
      nextReviewDate: addMonths(startDate, 1),
      reason: input.reason,
      observations: input.observations || null,
      createdBy,
      schedule: {
        create: Array.from({ length: input.installments }, (_, index) => ({
          installmentNumber: index + 1,
          dueDate: addMonths(startDate, index + 1),
          amount: index === input.installments - 1
            ? roundMoney(financedAmount - installmentAmount * (input.installments - 1))
            : installmentAmount,
        })),
      },
    },
    include: { schedule: { orderBy: { installmentNumber: 'asc' } } },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.PAYMENT_AGREEMENT_CREATE,
    module: MODULES.PORTFOLIO,
    entity: 'PaymentAgreement',
    entityId: agreement.id,
    dataAfter: { agreementNumber, creditId: credit.id, agreedAmount: input.agreedAmount, installments: input.installments },
    details: `Acuerdo ${agreementNumber} creado para credito ${credit.creditNumber}`,
  });

  return agreement;
}

export async function updatePaymentAgreementStatus(id: string, input: UpdatePaymentAgreementStatusInput, updatedBy: string) {
  const agreement = await prisma.paymentAgreement.findUnique({ where: { id } });
  if (!agreement) throw new Error('Acuerdo de pago no encontrado');

  const updated = await prisma.paymentAgreement.update({
    where: { id },
    data: {
      status: input.status,
      observations: input.observations ?? agreement.observations,
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.PAYMENT_AGREEMENT_STATUS_CHANGE,
    module: MODULES.PORTFOLIO,
    entity: 'PaymentAgreement',
    entityId: id,
    dataBefore: { status: agreement.status },
    dataAfter: { status: updated.status },
    details: `Acuerdo ${agreement.agreementNumber} cambio a ${updated.status}`,
  });

  return updated;
}
