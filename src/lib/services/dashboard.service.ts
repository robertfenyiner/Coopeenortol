// ============================================================
// CoopManager - Dashboard Service (Fase 5)
// ============================================================

import prisma from '@/lib/prisma';

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    // Asociados
    totalAssociates,
    activeAssociates,
    pendingAssociates,
    newAssociatesThisMonth,

    // Aportes
    totalSavingsBalance,
    contributionsThisMonth,
    contributionsLastMonth,

    // Créditos
    activeCredits,
    pendingRequests,
    overdueCredits,
    totalOutstanding,
    totalDisbursedThisMonth,

    // Actividad reciente
    recentContributions,
    recentCredits,
  ] = await Promise.all([
    // Asociados
    prisma.associate.count(),
    prisma.associate.count({ where: { status: 'ACTIVO' } }),
    prisma.associate.count({ where: { status: 'PENDIENTE' } }),
    prisma.associate.count({ where: { createdAt: { gte: startOfMonth } } }),

    // Aportes - saldo total
    prisma.savingsAccount.aggregate({ _sum: { balance: true } }),
    // Aportes del mes
    prisma.contribution.aggregate({
      where: { status: 'APLICADO', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    // Aportes mes anterior
    prisma.contribution.aggregate({
      where: { status: 'APLICADO', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),

    // Créditos vigentes
    prisma.credit.count({ where: { status: { in: ['VIGENTE', 'VENCIDO'] } } }),
    // Solicitudes pendientes
    prisma.credit.count({ where: { status: { in: ['SOLICITUD', 'EN_EVALUACION'] } } }),
    // Créditos vencidos
    prisma.credit.count({ where: { status: 'VENCIDO' } }),
    // Saldo cartera total
    prisma.credit.aggregate({
      where: { status: { in: ['VIGENTE', 'VENCIDO'] } },
      _sum: { outstandingBalance: true },
    }),
    // Desembolsos del mes
    prisma.credit.aggregate({
      where: { status: { in: ['VIGENTE', 'VENCIDO', 'PAGADO'] }, disbursementDate: { gte: startOfMonth } },
      _sum: { disbursedAmount: true },
      _count: true,
    }),

    // Actividad reciente
    prisma.contribution.findMany({
      where: { status: 'APLICADO' },
      include: {
        associate: { include: { person: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.credit.findMany({
      include: {
        associate: { include: { person: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Calcular variación de aportes mes a mes
  const contributionsThisMonthAmount = Number(contributionsThisMonth._sum.amount || 0);
  const contributionsLastMonthAmount = Number(contributionsLastMonth._sum.amount || 0);
  const contributionGrowth = contributionsLastMonthAmount > 0
    ? Math.round(((contributionsThisMonthAmount - contributionsLastMonthAmount) / contributionsLastMonthAmount) * 100)
    : 0;

  return {
    associates: {
      total: totalAssociates,
      active: activeAssociates,
      pending: pendingAssociates,
      newThisMonth: newAssociatesThisMonth,
    },
    savings: {
      totalBalance: Number(totalSavingsBalance._sum.balance || 0),
      contributionsThisMonth: contributionsThisMonthAmount,
      contributionsCount: contributionsThisMonth._count || 0,
      growthPercent: contributionGrowth,
    },
    credits: {
      active: activeCredits,
      pendingRequests,
      overdue: overdueCredits,
      totalOutstanding: Number(totalOutstanding._sum.outstandingBalance || 0),
      disbursedThisMonth: Number(totalDisbursedThisMonth._sum.disbursedAmount || 0),
      disbursedCount: totalDisbursedThisMonth._count || 0,
    },
    recentActivity: {
      contributions: recentContributions.map((c) => ({
        id: c.id,
        type: c.type,
        amount: Number(c.amount),
        associateName: `${c.associate.person.firstName} ${c.associate.person.lastName}`,
        date: c.createdAt,
      })),
      credits: recentCredits.map((c) => ({
        id: c.id,
        creditNumber: c.creditNumber,
        creditLine: c.creditLine,
        status: c.status,
        amount: Number(c.requestedAmount),
        associateName: `${c.associate.person.firstName} ${c.associate.person.lastName}`,
        date: c.createdAt,
      })),
    },
  };
}
