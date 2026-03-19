// ============================================================
// CoopManager - Role Service
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateRoleInput, UpdateRoleInput } from '@/lib/validations/schemas';

export async function getRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { code: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.role.findMany({
      where,
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.role.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: { select: { userRoles: true } },
    },
  });
}

export async function createRole(input: CreateRoleInput, createdBy: string) {
  const existing = await prisma.role.findUnique({ where: { code: input.code } });
  if (existing) throw new Error('Ya existe un rol con ese código');

  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description || null,
        createdBy,
      },
    });

    if (input.permissionIds && input.permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({
          roleId: newRole.id,
          permissionId,
        })),
      });
    }

    return newRole;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.ROLES,
    entity: 'Role',
    entityId: role.id,
    dataAfter: { code: input.code, name: input.name },
    details: `Rol creado: ${input.name} (${input.code})`,
  });

  return role;
}

export async function updateRole(id: string, input: UpdateRoleInput, updatedBy: string) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) throw new Error('Rol no encontrado');
  if (existing.isSystem) throw new Error('No se puede modificar un rol del sistema');

  const role = await prisma.$transaction(async (tx) => {
    const updated = await tx.role.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    if (input.permissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (input.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    return updated;
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.UPDATE,
    module: MODULES.ROLES,
    entity: 'Role',
    entityId: id,
    dataBefore: { name: existing.name, isActive: existing.isActive },
    dataAfter: input,
    details: `Rol actualizado: ${role.name}`,
  });

  return role;
}

export async function getAllPermissions() {
  return prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });
}
