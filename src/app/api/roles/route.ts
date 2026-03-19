// ============================================================
// CoopManager - Roles API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { getRoles, createRole, getAllPermissions } from '@/lib/services/role.service';
import { createRoleSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('roles.view');
    const { searchParams } = new URL(request.url);

    const data = await getRoles({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('roles.create');
    const body = await request.json();
    const validated = createRoleSchema.parse(body);
    const newRole = await createRole(validated, user.id);
    return successResponse(newRole, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
