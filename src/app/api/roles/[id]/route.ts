// ============================================================
// CoopManager - Single Role API + Permissions List
// ============================================================

import { NextRequest } from 'next/server';
import { getRoleById, updateRole } from '@/lib/services/role.service';
import { updateRoleSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('roles.view');
    const { id } = await params;
    const role = await getRoleById(id);
    return successResponse(role);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('roles.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);
    const updated = await updateRole(id, validated, user.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
