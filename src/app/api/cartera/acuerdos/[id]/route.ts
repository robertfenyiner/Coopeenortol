// ============================================================
// CoopManager - Individual Payment Agreement API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { updatePaymentAgreementStatusSchema } from '@/lib/validations/schemas';
import { updatePaymentAgreementStatus } from '@/lib/services/portfolio.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('portfolio.agreements');
    const { id } = await params;
    const body = await request.json();
    const validated = updatePaymentAgreementStatusSchema.parse(body);
    const data = await updatePaymentAgreementStatus(id, validated, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
