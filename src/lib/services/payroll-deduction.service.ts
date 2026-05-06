// ============================================================
// CoopManager - Payroll Deduction Service (Fase A)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  CreatePayingEntityInput,
  CreatePayrollBatchInput,
} from '@/lib/validations/schemas';
import {
  GeneratedPayrollFile,
  PayrollFileRow,
  generatePayrollFile,
} from './payroll-file-generator.service';
import { createContribution } from './contribution.service';
import { registerCreditPayment } from './credit.service';

type PayrollConciliationStatus = 'APLICADO' | 'RECHAZADO' | 'PARCIAL';

interface ConciliationRow {
  documentNumber: string;
  conceptCode: string;
  paidAmount: number;
  status: PayrollConciliationStatus;
  rejectionReason?: string;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function generatePayrollBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LIB-${year}-`;

  const last = await prisma.payrollDeductionBatch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: 'desc' },
  });

  const next = last ? parseInt(last.batchNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function getPayingEntities(params: { activeOnly?: boolean } = {}) {
  return prisma.payingEntity.findMany({
    where: params.activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createPayingEntity(input: CreatePayingEntityInput, createdBy: string) {
  const entity = await prisma.payingEntity.create({
    data: {
      code: input.code,
      name: input.name,
      nit: input.nit || null,
      entityType: input.entityType,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      fileFormat: input.fileFormat,
      separator: input.separator,
      encoding: input.encoding,
      paymentCycle: input.paymentCycle,
      cutoffDay: input.cutoffDay || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.PAYROLL,
    entity: 'PayingEntity',
    entityId: entity.id,
    dataAfter: { code: entity.code, name: entity.name },
    details: `Entidad pagadora ${entity.name} creada`,
  });

  return entity;
}

export async function getPayrollBatches(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  payingEntityId?: string;
  periodYear?: number;
  periodMonth?: number;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.PayrollDeductionBatchWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.payingEntityId) where.payingEntityId = params.payingEntityId;
  if (params.periodYear) where.periodYear = params.periodYear;
  if (params.periodMonth) where.periodMonth = params.periodMonth;
  if (params.search) {
    where.OR = [
      { batchNumber: { contains: params.search, mode: 'insensitive' } },
      { payingEntity: { name: { contains: params.search, mode: 'insensitive' } } },
      { payingEntity: { code: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.payrollDeductionBatch.findMany({
      where,
      include: { payingEntity: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.payrollDeductionBatch.count({ where }),
    prisma.payrollDeductionBatch.aggregate({
      where,
      _sum: { totalAmount: true, appliedAmount: true, rejectedAmount: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      totalAmount: toNumber(summary._sum.totalAmount),
      appliedAmount: toNumber(summary._sum.appliedAmount),
      rejectedAmount: toNumber(summary._sum.rejectedAmount),
    },
  };
}

export async function getPayrollBatchById(id: string) {
  return prisma.payrollDeductionBatch.findUnique({
    where: { id },
    include: {
      payingEntity: true,
      details: {
        orderBy: { lineNumber: 'asc' },
        include: {
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
      },
    },
  });
}

async function getDefaultContributionAmount(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'contribution.default_amount' },
  });
  return config ? Number(config.value) : 0;
}

async function buildPayrollDetails(input: CreatePayrollBatchInput, createdBy: string) {
  const rows: Prisma.PayrollDeductionDetailCreateManyInput[] = [];
  let lineNumber = 1;

  if (input.includeContributions) {
    const defaultAmount = await getDefaultContributionAmount();
    if (defaultAmount > 0) {
      const associates = await prisma.associate.findMany({
        where: { status: 'ACTIVO' },
        include: { person: true },
        orderBy: { associateNumber: 'asc' },
      });

      for (const associate of associates) {
        rows.push({
          batchId: '',
          associateId: associate.id,
          lineNumber: lineNumber++,
          documentType: associate.person.documentType,
          documentNumber: associate.person.documentNumber,
          associateNumber: associate.associateNumber,
          fullName: `${associate.person.firstName} ${associate.person.lastName} ${associate.person.secondLastName || ''}`.trim(),
          payrollCode: associate.person.employer || null,
          conceptCode: 'APORTE_ORDINARIO',
          conceptType: 'APORTE',
          amount: defaultAmount,
          createdBy,
          sourcePayload: { accountType: 'ORDINARIO' },
        });
      }
    }
  }

  if (input.includeCredits) {
    const start = new Date(Date.UTC(input.periodYear, input.periodMonth - 1, 1));
    const end = new Date(Date.UTC(input.periodYear, input.periodMonth, 0, 23, 59, 59));
    const entries = await prisma.amortizationEntry.findMany({
      where: {
        status: 'PENDIENTE',
        dueDate: { gte: start, lte: end },
        credit: { status: { in: ['VIGENTE', 'VENCIDO'] } },
      },
      include: {
        credit: {
          include: {
            associate: { include: { person: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    });

    for (const entry of entries) {
      const associate = entry.credit.associate;
      rows.push({
        batchId: '',
        associateId: associate.id,
        creditId: entry.creditId,
        amortizationEntryId: entry.id,
        lineNumber: lineNumber++,
        documentType: associate.person.documentType,
        documentNumber: associate.person.documentNumber,
        associateNumber: associate.associateNumber,
        fullName: `${associate.person.firstName} ${associate.person.lastName} ${associate.person.secondLastName || ''}`.trim(),
        payrollCode: associate.person.employer || null,
        conceptCode: `CREDITO_${entry.credit.creditNumber}`,
        conceptType: 'CREDITO',
        amount: entry.totalAmount,
        createdBy,
        sourcePayload: {
          creditNumber: entry.credit.creditNumber,
          installmentNumber: entry.installmentNumber,
          dueDate: entry.dueDate.toISOString(),
        },
      });
    }
  }

  return rows;
}

export async function createPayrollBatch(input: CreatePayrollBatchInput, createdBy: string) {
  const entity = await prisma.payingEntity.findUnique({ where: { id: input.payingEntityId } });
  if (!entity) throw new Error('Entidad pagadora no encontrada');
  if (!entity.isActive) throw new Error('La entidad pagadora no estÃ¡ activa');
  if (!input.includeContributions && !input.includeCredits) {
    throw new Error('Debe incluir al menos un concepto para generar el lote');
  }

  const batchNumber = await generatePayrollBatchNumber();
  const preparedRows = await buildPayrollDetails(input, createdBy);
  if (preparedRows.length === 0) {
    throw new Error('No hay conceptos pendientes para el periodo seleccionado');
  }

  const totalAmount = preparedRows.reduce((sum, row) => sum + Number(row.amount), 0);

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.payrollDeductionBatch.create({
      data: {
        batchNumber,
        payingEntityId: input.payingEntityId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        includeContributions: input.includeContributions,
        includeCredits: input.includeCredits,
        totalRecords: preparedRows.length,
        totalAmount,
        observations: input.observations || null,
        createdBy,
      },
    });

    await tx.payrollDeductionDetail.createMany({
      data: preparedRows.map((row) => ({ ...row, batchId: created.id })),
    });

    return created;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.PAYROLL_BATCH_CREATE,
    module: MODULES.PAYROLL,
    entity: 'PayrollDeductionBatch',
    entityId: batch.id,
    dataAfter: { batchNumber, totalAmount, totalRecords: preparedRows.length },
    details: `Lote de libranza ${batchNumber} creado con ${preparedRows.length} registros`,
  });

  return getPayrollBatchById(batch.id);
}

function toFileRows(batch: NonNullable<Awaited<ReturnType<typeof getPayrollBatchById>>>): PayrollFileRow[] {
  return batch.details
    .filter((detail) => detail.status !== 'ANULADO')
    .map((detail) => ({
      lineNumber: detail.lineNumber,
      documentType: detail.documentType,
      documentNumber: detail.documentNumber,
      associateNumber: detail.associateNumber,
      fullName: detail.fullName,
      payrollCode: detail.payrollCode,
      conceptCode: detail.conceptCode,
      conceptType: detail.conceptType,
      amount: toNumber(detail.amount),
    }));
}

export async function generatePayrollBatchFile(id: string, generatedBy: string): Promise<GeneratedPayrollFile> {
  const batch = await getPayrollBatchById(id);
  if (!batch) throw new Error('Lote de libranza no encontrado');
  if (batch.status === 'ANULADO') throw new Error('No se puede generar un lote anulado');

  const file = generatePayrollFile(toFileRows(batch), {
    format: batch.payingEntity.fileFormat as 'CSV' | 'TXT_FIXED',
    separator: batch.payingEntity.separator,
    payingEntityCode: batch.payingEntity.code,
    periodYear: batch.periodYear,
    periodMonth: batch.periodMonth,
  });

  await prisma.payrollDeductionBatch.update({
    where: { id },
    data: {
      status: 'GENERADO',
      generatedAt: new Date(),
      fileName: file.fileName,
      fileHash: file.hash,
      generationMetadata: {
        mimeType: file.mimeType,
        totalRecords: file.totalRecords,
        totalAmount: file.totalAmount,
      },
      updatedBy: generatedBy,
    },
  });

  await prisma.payrollDeductionDetail.updateMany({
    where: { batchId: id, status: 'PENDIENTE' },
    data: { status: 'ENVIADO', updatedBy: generatedBy },
  });

  await createAuditLog({
    userId: generatedBy,
    action: AUDIT_ACTIONS.PAYROLL_FILE_GENERATE,
    module: MODULES.PAYROLL,
    entity: 'PayrollDeductionBatch',
    entityId: id,
    dataAfter: { fileName: file.fileName, hash: file.hash },
    details: `Archivo plano ${file.fileName} generado`,
  });

  return file;
}

export async function markPayrollBatchAsSent(id: string, sentBy: string) {
  const batch = await prisma.payrollDeductionBatch.findUnique({ where: { id } });
  if (!batch) throw new Error('Lote de libranza no encontrado');
  if (!['GENERADO', 'ENVIADO'].includes(batch.status)) {
    throw new Error('Solo se pueden enviar lotes previamente generados');
  }

  const updated = await prisma.payrollDeductionBatch.update({
    where: { id },
    data: { status: 'ENVIADO', sentAt: new Date(), updatedBy: sentBy },
  });

  await createAuditLog({
    userId: sentBy,
    action: AUDIT_ACTIONS.PAYROLL_BATCH_SEND,
    module: MODULES.PAYROLL,
    entity: 'PayrollDeductionBatch',
    entityId: id,
    details: `Lote de libranza ${batch.batchNumber} marcado como enviado`,
  });

  return updated;
}

function parseConciliation(content: string): ConciliationRow[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.filter((line, index) => !(index === 0 && line.toLowerCase().includes('documento')));

  return rows.map((line) => {
    const [documentNumber, conceptCode, paidAmount, status, rejectionReason] = line.split(';').map((part) => part.trim());
    const normalizedStatus = (status || 'APLICADO').toUpperCase() as PayrollConciliationStatus;
    if (!documentNumber || !conceptCode) {
      throw new Error('Archivo de conciliaciÃ³n invÃ¡lido: documento y concepto son obligatorios');
    }
    if (!['APLICADO', 'RECHAZADO', 'PARCIAL'].includes(normalizedStatus)) {
      throw new Error(`Estado de conciliaciÃ³n invÃ¡lido: ${status}`);
    }

    return {
      documentNumber,
      conceptCode,
      paidAmount: Number(paidAmount || 0),
      status: normalizedStatus,
      rejectionReason: rejectionReason || undefined,
    };
  });
}

export async function reconcilePayrollBatch(id: string, content: string, reconciledBy: string) {
  const batch = await getPayrollBatchById(id);
  if (!batch) throw new Error('Lote de libranza no encontrado');
  if (!['ENVIADO', 'GENERADO', 'CONCILIACION_PARCIAL'].includes(batch.status)) {
    throw new Error('El lote no estÃ¡ en un estado conciliable');
  }

  const rows = parseConciliation(content);
  let appliedCount = 0;
  let rejectedCount = 0;
  let partialCount = 0;
  let appliedAmount = 0;
  let rejectedAmount = 0;

  for (const row of rows) {
    const detail = batch.details.find((item) =>
      item.documentNumber === row.documentNumber && item.conceptCode === row.conceptCode
    );
    if (!detail) continue;

    const requestedAmount = toNumber(detail.amount);
    const isFullPayment = row.status === 'APLICADO' && row.paidAmount >= requestedAmount;

    if (isFullPayment && detail.status !== 'APLICADO') {
      if (detail.conceptType === 'APORTE') {
        const contribution = await createContribution({
          associateId: detail.associateId,
          type: 'ORDINARIO',
          amount: requestedAmount,
          periodYear: batch.periodYear,
          periodMonth: batch.periodMonth,
          paymentMethod: 'NOMINA',
          reference: batch.batchNumber,
          observations: `Aplicado por libranza ${batch.batchNumber}`,
        }, reconciledBy);
        await prisma.payrollDeductionDetail.update({
          where: { id: detail.id },
          data: { contributionId: contribution.id },
        });
      }

      if (detail.conceptType === 'CREDITO' && detail.creditId) {
        const credit = await registerCreditPayment(detail.creditId, {
          amount: requestedAmount,
          paymentMethod: 'NOMINA',
          reference: batch.batchNumber,
          observations: `Aplicado por libranza ${batch.batchNumber}`,
        }, reconciledBy);
        const payment = credit?.payments?.[0];
        await prisma.payrollDeductionDetail.update({
          where: { id: detail.id },
          data: { creditPaymentId: payment?.id || null },
        });
      }
    }

    const nextStatus = row.status === 'APLICADO' && row.paidAmount >= requestedAmount
      ? 'APLICADO'
      : row.status;
    const detailApplied = nextStatus === 'RECHAZADO' ? 0 : Math.min(row.paidAmount, requestedAmount);
    const detailRejected = nextStatus === 'RECHAZADO' ? requestedAmount : Math.max(requestedAmount - detailApplied, 0);

    await prisma.payrollDeductionDetail.update({
      where: { id: detail.id },
      data: {
        status: nextStatus,
        appliedAmount: detailApplied,
        rejectedAmount: detailRejected,
        rejectionReason: row.rejectionReason || null,
        conciliationPayload: { ...row },
        updatedBy: reconciledBy,
      },
    });

    appliedAmount += detailApplied;
    rejectedAmount += detailRejected;
    if (nextStatus === 'APLICADO') appliedCount++;
    if (nextStatus === 'RECHAZADO') rejectedCount++;
    if (nextStatus === 'PARCIAL') partialCount++;
  }

  const pendingCount = await prisma.payrollDeductionDetail.count({
    where: { batchId: id, status: { in: ['PENDIENTE', 'ENVIADO'] } },
  });
  const batchStatus = pendingCount === 0 && partialCount === 0
    ? 'CONCILIADO'
    : 'CONCILIACION_PARCIAL';

  await prisma.payrollDeductionBatch.update({
    where: { id },
    data: {
      status: batchStatus,
      appliedAmount,
      rejectedAmount,
      conciliatedAt: new Date(),
      conciliationMetadata: { appliedCount, rejectedCount, partialCount, pendingCount },
      updatedBy: reconciledBy,
    },
  });

  await createAuditLog({
    userId: reconciledBy,
    action: AUDIT_ACTIONS.PAYROLL_CONCILIATION,
    module: MODULES.PAYROLL,
    entity: 'PayrollDeductionBatch',
    entityId: id,
    dataAfter: { appliedCount, rejectedCount, partialCount, pendingCount },
    details: `Lote ${batch.batchNumber} conciliado`,
  });

  return getPayrollBatchById(id);
}
