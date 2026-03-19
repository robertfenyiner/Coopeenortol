// ============================================================
// CoopManager - Crédito Individual API Route
// ============================================================

import { NextRequest } from 'next/server';
import { getCreditById, approveCredit, rejectCredit, disburseCredit } from '@/lib/services/credit.service';
import { approveCreditSchema, rejectCreditSchema } from '@/lib/validations/schemas';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('credits.view');
    const { id } = await params;
    const credit = await getCreditById(id);
    if (!credit) return errorResponse('Crédito no encontrado', 404);
    return successResponse(credit);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Acciones sobre el crédito (aprobar, rechazar, desembolsar)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('credits.edit');
    const { id } = await params;
    const body = await request.json();

    switch (body.action) {
      case 'approve': {
        const validated = approveCreditSchema.parse(body);
        const result = await approveCredit(id, validated, user.id);
        return successResponse(result);
      }
      case 'reject': {
        const validated = rejectCreditSchema.parse(body);
        await rejectCredit(id, validated.rejectionReason, user.id);
        return successResponse({ rejected: true });
      }
      case 'disburse': {
        const result = await disburseCredit(id, user.id);
        return successResponse(result);
      }
      default:
        return errorResponse('Acción no válida. Use: approve, reject, disburse', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
