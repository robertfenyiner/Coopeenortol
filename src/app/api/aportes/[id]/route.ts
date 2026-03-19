// ============================================================
// CoopManager - Aporte Individual API Route (Detalle + Anular)
// ============================================================

import { NextRequest } from 'next/server';
import { getContributionById, voidContribution } from '@/lib/services/contribution.service';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('contributions.view');
    const { id } = await params;
    const contribution = await getContributionById(id);

    if (!contribution) {
      return errorResponse('Aporte no encontrado', 404);
    }

    return successResponse(contribution);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Anular aporte
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('contributions.delete');
    const { id } = await params;
    await voidContribution(id, user.id);
    return successResponse({ voided: true });
  } catch (error) {
    return handleApiError(error);
  }
}
