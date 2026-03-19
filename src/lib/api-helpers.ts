import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationError(error: ZodError) {
  const messages = error.issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`);
  return NextResponse.json(
    { success: false, error: 'Errores de validación', details: messages },
    { status: 422 }
  );
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError('No autenticado');
  }
  return user;
}

export async function requirePermission(permission: string) {
  const user = await requireAuth();
  if (!user.permissions.includes(permission) && !user.roles.includes('SUPER_ADMIN')) {
    throw new AuthError('No tiene permisos para realizar esta acción');
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return validationError(error);
  }
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.message === 'No autenticado' ? 401 : 403);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[Prisma Error]', error.code, error.message);
    if (error.code === 'P2002') {
      return errorResponse('Registro duplicado: ya existe un recurso con esos datos', 409);
    }
    if (error.code === 'P2025') {
      return errorResponse('Recurso no encontrado', 404);
    }
    return errorResponse('Error de base de datos', 500);
  }
  if (error instanceof Error) {
    return errorResponse(error.message, 400);
  }
  return errorResponse('Error interno del servidor', 500);
}
