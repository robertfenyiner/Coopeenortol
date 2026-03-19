// ============================================================
// CoopManager - Asociado Individual API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { getAssociateById, updateAssociate, changeAssociateStatus } from '@/lib/services/associate.service';
import { updateAssociateSchema, changeAssociateStatusSchema } from '@/lib/validations/schemas';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('associates.view');
    const { id } = await params;
    const associate = await getAssociateById(id);

    if (!associate) {
      return errorResponse('Asociado no encontrado', 404);
    }

    return successResponse(associate);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('associates.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = updateAssociateSchema.parse(body);
    const updated = await updateAssociate(id, validated, user.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Cambiar estado del asociado
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('associates.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = changeAssociateStatusSchema.parse(body);
    const updated = await changeAssociateStatus(id, validated.status, validated.reason, user.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
