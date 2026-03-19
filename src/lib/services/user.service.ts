// ============================================================
// CoopManager - User Service
// ============================================================

import prisma from '@/lib/prisma';
import { hashSync, compareSync } from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, AUDIT_ACTIONS, MODULES, MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateUserInput, UpdateUserInput } from '@/lib/validations/schemas';

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  roleId?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.isActive !== undefined) where.isActive = params.isActive;

  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { firstName: { contains: params.search, mode: 'insensitive' } },
      { lastName: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.roleId) {
    where.userRoles = { some: { roleId: params.roleId } };
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createUser(input: CreateUserInput, createdBy: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('Ya existe un usuario con ese correo electrónico');
  }

  const passwordHash = hashSync(input.password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        createdBy,
        updatedBy: createdBy,
      },
    });

    // Assign roles
    if (input.roleIds && input.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({
          userId: newUser.id,
          roleId,
          assignedBy: createdBy,
        })),
      });
    }

    return newUser;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.USERS,
    entity: 'User',
    entityId: user.id,
    dataAfter: { email: input.email, firstName: input.firstName, lastName: input.lastName },
    details: `Usuario creado: ${input.firstName} ${input.lastName} (${input.email})`,
  });

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, updatedBy: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Usuario no encontrado');
  }

  if (input.email && input.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken) {
      throw new Error('Ya existe un usuario con ese correo electrónico');
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ...(input.email && { email: input.email }),
        ...(input.firstName && { firstName: input.firstName }),
        ...(input.lastName && { lastName: input.lastName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedBy,
      },
    });

    // Update roles if provided
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (input.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: id,
            roleId,
            assignedBy: updatedBy,
          })),
        });
      }
    }

    return updated;
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.UPDATE,
    module: MODULES.USERS,
    entity: 'User',
    entityId: id,
    dataBefore: { email: existing.email, firstName: existing.firstName, lastName: existing.lastName, isActive: existing.isActive },
    dataAfter: input,
    details: `Usuario actualizado: ${user.firstName} ${user.lastName}`,
  });

  return user;
}

export async function toggleUserStatus(id: string, updatedBy: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('Usuario no encontrado');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive, updatedBy },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    module: MODULES.USERS,
    entity: 'User',
    entityId: id,
    dataBefore: { isActive: user.isActive },
    dataAfter: { isActive: updated.isActive },
    details: `Estado cambiado a ${updated.isActive ? 'activo' : 'inactivo'}: ${user.firstName} ${user.lastName}`,
  });

  return updated;
}

export async function validateCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('Cuenta bloqueada temporalmente. Intente más tarde.');
  }

  const isValid = compareSync(password, user.passwordHash);

  if (!isValid) {
    const attempts = user.failedAttempts + 1;
    const updateData: Record<string, unknown> = { failedAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      updateData.failedAttempts = 0;
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      module: MODULES.AUTH,
      details: `Intento fallido ${attempts}/${MAX_LOGIN_ATTEMPTS}`,
    });

    return null;
  }

  // Reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  return user;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await getUserById(userId);
  if (!user) return [];

  const permissions = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code);
    }
  }
  return Array.from(permissions);
}
