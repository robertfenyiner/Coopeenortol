// ============================================================
// CoopManager - Associate Self-Service Portal Service (Fase D)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { PortalCreditSimulationInput } from '@/lib/validations/schemas';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function formatCurrency(value: number) {
  return `$ ${value.toLocaleString('es-CO')}`;
}

function fullName(person: { firstName: string; lastName: string; secondLastName?: string | null }) {
  return `${person.firstName} ${person.lastName} ${person.secondLastName || ''}`.trim();
}

async function getPortalAssociate(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      associate: {
        include: {
          person: true,
          savingsAccounts: { where: { isActive: true }, orderBy: { accountType: 'asc' } },
          contributions: { where: { status: 'APLICADO' }, orderBy: { createdAt: 'desc' }, take: 24 },
          credits: {
            orderBy: { createdAt: 'desc' },
            include: {
              amortization: { orderBy: { installmentNumber: 'asc' }, take: 6 },
              payments: { orderBy: { paymentDate: 'desc' }, take: 6 },
            },
          },
          cdatInvestments: { orderBy: { createdAt: 'desc' } },
          documents: { orderBy: { uploadedAt: 'desc' }, take: 20 },
        },
      },
    },
  });

  if (!user?.associate) {
    throw new Error('El usuario no está vinculado a un asociado');
  }
  return user.associate;
}

export async function getAssociatePortalSummary(userId: string) {
  const associate = await getPortalAssociate(userId);
  const savingsBalance = associate.savingsAccounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
  const activeCreditBalance = associate.credits
    .filter((credit) => ['VIGENTE', 'VENCIDO'].includes(credit.status))
    .reduce((sum, credit) => sum + toNumber(credit.outstandingBalance), 0);
  const activeCdatBalance = associate.cdatInvestments
    .filter((investment) => investment.status === 'ACTIVO')
    .reduce((sum, investment) => sum + toNumber(investment.principalAmount), 0);
  const projectedCdatInterest = associate.cdatInvestments
    .filter((investment) => investment.status === 'ACTIVO')
    .reduce((sum, investment) => sum + toNumber(investment.netInterest), 0);

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.PORTAL_ACCESS,
    module: MODULES.ASSOCIATE_PORTAL,
    entity: 'Associate',
    entityId: associate.id,
    details: `Consulta del portal del asociado ${associate.associateNumber}`,
  });

  return {
    associate: {
      id: associate.id,
      associateNumber: associate.associateNumber,
      status: associate.status,
      admissionDate: associate.admissionDate,
      person: associate.person,
    },
    totals: {
      savingsBalance,
      activeCreditBalance,
      activeCdatBalance,
      projectedCdatInterest,
      netPosition: savingsBalance + activeCdatBalance - activeCreditBalance,
    },
    savingsAccounts: associate.savingsAccounts,
    recentContributions: associate.contributions,
    credits: associate.credits,
    cdats: associate.cdatInvestments,
    documents: associate.documents,
  };
}

export async function simulatePortalCredit(input: PortalCreditSimulationInput) {
  const monthlyRate = input.annualRate / 100 / 12;
  const payment = monthlyRate === 0
    ? input.amount / input.termMonths
    : (input.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -input.termMonths));
  const monthlyPayment = Math.round(payment * 100) / 100;
  const totalPayment = Math.round(monthlyPayment * input.termMonths * 100) / 100;
  const totalInterest = Math.round((totalPayment - input.amount) * 100) / 100;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    termMonths: input.termMonths,
    annualRate: input.annualRate,
  };
}

export async function generateAssociateCertificate(userId: string) {
  const associate = await getPortalAssociate(userId);
  const name = fullName(associate.person);
  const now = new Date();

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.PORTAL_DOWNLOAD,
    module: MODULES.ASSOCIATE_PORTAL,
    entity: 'Associate',
    entityId: associate.id,
    details: `Certificado de asociado generado para ${associate.associateNumber}`,
  });

  return {
    fileName: `certificado-${associate.associateNumber}.txt`,
    mimeType: 'text/plain',
    content: [
      'COOPEENORTOL',
      'CERTIFICADO DE ASOCIADO',
      '',
      `Certificamos que ${name}, identificado(a) con ${associate.person.documentType} ${associate.person.documentNumber},`,
      `se encuentra registrado(a) como asociado(a) No. ${associate.associateNumber}.`,
      `Estado actual: ${associate.status}.`,
      associate.admissionDate ? `Fecha de admisión: ${associate.admissionDate.toLocaleDateString('es-CO')}.` : '',
      '',
      `Expedido el ${now.toLocaleDateString('es-CO')} a solicitud del interesado.`,
    ].filter(Boolean).join('\r\n'),
  };
}

export async function generateAssociateStatement(userId: string) {
  const summary = await getAssociatePortalSummary(userId);
  const name = fullName(summary.associate.person);

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.PORTAL_DOWNLOAD,
    module: MODULES.ASSOCIATE_PORTAL,
    entity: 'Associate',
    entityId: summary.associate.id,
    details: `Extracto generado para ${summary.associate.associateNumber}`,
  });

  const lines = [
    'COOPEENORTOL',
    'EXTRACTO CONSOLIDADO DEL ASOCIADO',
    '',
    `${name} · ${summary.associate.associateNumber}`,
    `${summary.associate.person.documentType} ${summary.associate.person.documentNumber}`,
    '',
    `Aportes y ahorros: ${formatCurrency(summary.totals.savingsBalance)}`,
    `Créditos vigentes: ${formatCurrency(summary.totals.activeCreditBalance)}`,
    `CDATs activos: ${formatCurrency(summary.totals.activeCdatBalance)}`,
    `Interés CDAT proyectado: ${formatCurrency(summary.totals.projectedCdatInterest)}`,
    `Posición neta: ${formatCurrency(summary.totals.netPosition)}`,
    '',
    'Últimos aportes:',
    ...summary.recentContributions.slice(0, 10).map((item) =>
      `${item.createdAt.toLocaleDateString('es-CO')} · ${item.type} · ${formatCurrency(toNumber(item.amount))}`
    ),
  ];

  return {
    fileName: `extracto-${summary.associate.associateNumber}.txt`,
    mimeType: 'text/plain',
    content: lines.join('\r\n'),
  };
}
