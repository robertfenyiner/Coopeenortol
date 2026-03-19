// ============================================================
// CoopManager - Catalog Service
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateCatalogInput, CreateCatalogItemInput, UpdateCatalogItemInput } from '@/lib/validations/schemas';

export async function getCatalogs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 50, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { code: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.catalog.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.catalog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCatalogById(id: string) {
  return prisma.catalog.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

export async function getCatalogByCode(code: string) {
  return prisma.catalog.findUnique({
    where: { code },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

export async function createCatalog(input: CreateCatalogInput, createdBy: string) {
  const existing = await prisma.catalog.findUnique({ where: { code: input.code } });
  if (existing) throw new Error('Ya existe un catálogo con ese código');

  const catalog = await prisma.catalog.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description || null,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.PARAMS,
    entity: 'Catalog',
    entityId: catalog.id,
    dataAfter: input,
    details: `Catálogo creado: ${input.name} (${input.code})`,
  });

  return catalog;
}

export async function createCatalogItem(input: CreateCatalogItemInput, createdBy: string) {
  const item = await prisma.catalogItem.create({
    data: {
      catalogId: input.catalogId,
      code: input.code,
      name: input.name,
      description: input.description || null,
      sortOrder: input.sortOrder || 0,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.PARAMS,
    entity: 'CatalogItem',
    entityId: item.id,
    dataAfter: input,
    details: `Ítem de catálogo creado: ${input.name}`,
  });

  return item;
}

export async function updateCatalogItem(id: string, input: UpdateCatalogItemInput, updatedBy: string) {
  const existing = await prisma.catalogItem.findUnique({ where: { id } });
  if (!existing) throw new Error('Ítem no encontrado');

  const item = await prisma.catalogItem.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.metadata !== undefined && { metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null }),
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.UPDATE,
    module: MODULES.PARAMS,
    entity: 'CatalogItem',
    entityId: id,
    dataBefore: { name: existing.name, isActive: existing.isActive },
    dataAfter: input,
  });

  return item;
}

// System Config
export async function getSystemConfigs(module?: string) {
  const where: Record<string, unknown> = {};
  if (module) where.module = module;
  return prisma.systemConfig.findMany({ where, orderBy: [{ module: 'asc' }, { key: 'asc' }] });
}

export async function updateSystemConfig(id: string, value: string, updatedBy: string) {
  const config = await prisma.systemConfig.findUnique({ where: { id } });
  if (!config) throw new Error('Configuración no encontrada');
  if (!config.isEditable) throw new Error('Esta configuración no es editable');

  const updated = await prisma.systemConfig.update({
    where: { id },
    data: { value },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.UPDATE,
    module: MODULES.SYSTEM,
    entity: 'SystemConfig',
    entityId: id,
    dataBefore: { value: config.value },
    dataAfter: { value },
    details: `Configuración actualizada: ${config.key}`,
  });

  return updated;
}
