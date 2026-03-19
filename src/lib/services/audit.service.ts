// ============================================================
// CoopManager - Audit Service
// ============================================================

import prisma from '@/lib/prisma';
import { AuditLogEntry } from '@/types';

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        module: entry.module,
        entity: entry.entity,
        entityId: entry.entityId,
        dataBefore: entry.dataBefore ? JSON.parse(JSON.stringify(entry.dataBefore)) : undefined,
        dataAfter: entry.dataAfter ? JSON.parse(JSON.stringify(entry.dataAfter)) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        details: entry.details,
      },
    });
  } catch (error) {
    // Audit log failure should not break the main operation
    console.error('Error creating audit log:', error);
  }
}

export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  module?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.userId) where.userId = params.userId;
  if (params.module) where.module = params.module;
  if (params.action) where.action = params.action;

  if (params.dateFrom || params.dateTo) {
    where.createdAt = {
      ...(params.dateFrom && { gte: params.dateFrom }),
      ...(params.dateTo && { lte: params.dateTo }),
    };
  }

  if (params.search) {
    where.OR = [
      { entity: { contains: params.search, mode: 'insensitive' } },
      { details: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
