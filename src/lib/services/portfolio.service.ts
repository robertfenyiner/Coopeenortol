// ============================================================
// CoopManager - Portfolio / Cartera Service (Fase 6)
// ============================================================

import prisma from '@/lib/prisma';

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
  ]);

  const totalOutstandingAmount = Number(totalOutstanding._sum.outstandingBalance || 0);
  const totalOverdueAmount = Number(totalOverdueBalance._sum.outstandingBalance || 0);
  const healthyAmount = Number(healthyBalance._sum.outstandingBalance || 0);
  const overduePercent = totalOutstandingAmount > 0
    ? Math.round((totalOverdueAmount / totalOutstandingAmount) * 10000) / 100
    : 0;

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
  };
}
