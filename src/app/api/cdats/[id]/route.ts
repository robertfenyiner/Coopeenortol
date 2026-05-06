// ============================================================
// CoopManager - Individual CDAT Investment API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { cdatActionSchema } from '@/lib/validations/schemas';
import {
  cancelCdatInvestment,
  getCdatInvestmentById,
  markCdatAsMatured,
  redeemCdatInvestment,
} from '@/lib/services/cdat.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('cdats.view');
    const { id } = await params;
    const investment = await getCdatInvestmentById(id);
    if (!investment) return errorResponse('CDAT no encontrado', 404);
    return successResponse(investment);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('cdats.redeem');
    const { id } = await params;
    const body = await request.json();
    const validated = cdatActionSchema.parse(body);

    if (validated.action === 'mark_matured') {
      const result = await markCdatAsMatured(id, user.id);
      return successResponse(result);
    }
    if (validated.action === 'redeem') {
      const result = await redeemCdatInvestment(id, validated.observations, user.id);
      return successResponse(result);
    }
    if (validated.action === 'cancel') {
      const result = await cancelCdatInvestment(id, validated.observations, user.id);
      return successResponse(result);
    }

    return errorResponse('Acción no válida', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
