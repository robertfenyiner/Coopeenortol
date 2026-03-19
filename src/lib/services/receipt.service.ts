// ============================================================
// CoopManager - Receipt Service (Módulo 9)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';

// ------------------------------------------------------------
// Listar recibos con paginación y búsqueda
// ------------------------------------------------------------
export async function getReceipts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.status) where.status = params.status;

  if (params.dateFrom || params.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
    if (params.dateTo) dateFilter.lte = new Date(params.dateTo + 'T23:59:59');
    where.createdAt = dateFilter;
  }

  if (params.search) {
    where.OR = [
      { receiptNumber: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where,
      include: {
        contributions: {
          include: {
            associate: {
              include: {
                person: {
                  select: { firstName: true, lastName: true, documentNumber: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.paymentReceipt.count({ where }),
    prisma.paymentReceipt.aggregate({
      where,
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalAmount: summary._sum.totalAmount || 0,
  };
}

// ------------------------------------------------------------
// Obtener recibo por ID con detalles
// ------------------------------------------------------------
export async function getReceiptById(id: string) {
  return prisma.paymentReceipt.findUnique({
    where: { id },
    include: {
      contributions: {
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
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// ------------------------------------------------------------
// Anular recibo y todos sus aportes
// ------------------------------------------------------------
export async function voidReceipt(id: string, performedBy: string) {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    include: { contributions: true },
  });
  if (!receipt) throw new Error('Recibo no encontrado');
  if (receipt.status !== 'ACTIVO') throw new Error('Este recibo ya fue anulado');

  await prisma.$transaction(async (tx) => {
    // Anular el recibo
    await tx.paymentReceipt.update({
      where: { id },
      data: { status: 'ANULADO' },
    });

    // Anular cada aporte y revertir saldo
    for (const contribution of receipt.contributions) {
      if (contribution.status === 'APLICADO') {
        await tx.contribution.update({
          where: { id: contribution.id },
          data: { status: 'ANULADO' },
        });

        await tx.savingsAccount.update({
          where: { id: contribution.savingsAccountId },
          data: { balance: { decrement: Number(contribution.amount) } },
        });
      }
    }
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.RECEIPT_VOID,
    module: MODULES.RECEIPTS,
    entity: 'PaymentReceipt',
    entityId: id,
    details: `Recibo ${receipt.receiptNumber} anulado ($${Number(receipt.totalAmount).toLocaleString()}, ${receipt.contributions.length} aportes)`,
  });
}
