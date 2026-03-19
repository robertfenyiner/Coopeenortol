// ============================================================
// CoopManager - Perfil API Route (GET info, PUT cambiar contraseña)
// ============================================================

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { compareSync, hashSync } from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from '@/lib/services/audit.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse('No autenticado', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        isActive: true, createdAt: true, lastLoginAt: true,
        userRoles: {
          include: { role: { select: { name: true, code: true } } },
        },
      },
    });

    if (!user) return errorResponse('Usuario no encontrado', 404);

    return successResponse({
      ...user,
      roles: user.userRoles.map((ur) => ({ name: ur.role.name, code: ur.role.code })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse('No autenticado', 401);

    const body = await request.json();
    const { currentPassword, newPassword, firstName, lastName, phone } = body;

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return errorResponse('Usuario no encontrado', 404);

    // Si viene cambio de contraseña
    if (currentPassword && newPassword) {
      if (!compareSync(currentPassword, user.passwordHash)) {
        return errorResponse('Contraseña actual incorrecta', 400);
      }
      if (newPassword.length < 8) {
        return errorResponse('La nueva contraseña debe tener al menos 8 caracteres', 400);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashSync(newPassword, BCRYPT_SALT_ROUNDS) },
      });

      await createAuditLog({
        userId: user.id,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        module: MODULES.AUTH,
        entity: 'User',
        entityId: user.id,
        details: 'Cambio de contraseña desde perfil',
      });

      return successResponse({ passwordChanged: true });
    }

    // Actualizar datos básicos
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: updateData });
    }

    return successResponse({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
