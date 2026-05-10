// ============================================================
// CoopManager - Payment Agreements API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createPaymentAgreementSchema } from '@/lib/validations/schemas';
import { createPaymentAgreement } from '@/lib/services/portfolio.service';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('portfolio.agreements');
    const body = await request.json();
    const validated = createPaymentAgreementSchema.parse(body);
    const data = await createPaymentAgreement(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
