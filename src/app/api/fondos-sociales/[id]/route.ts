// ============================================================
// CoopManager - Individual Social Fund API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { updateSocialFundSchema } from '@/lib/validations/schemas';
import { getSocialFundById, updateSocialFund } from '@/lib/services/social-fund.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('social_funds.view');
    const { id } = await params;
    const fund = await getSocialFundById(id);
    if (!fund) return errorResponse('Fondo social no encontrado', 404);
    return successResponse(fund);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('social_funds.manage');
    const { id } = await params;
    const body = await request.json();
    const validated = updateSocialFundSchema.parse(body);
    const data = await updateSocialFund(id, validated, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
