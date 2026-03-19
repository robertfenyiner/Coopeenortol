// ============================================================
// CoopManager - Pagos de Crédito API Route
// ============================================================

import { NextRequest } from 'next/server';
import { registerCreditPayment } from '@/lib/services/credit.service';
import { creditPaymentSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('credits.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = creditPaymentSchema.parse(body);
    const result = await registerCreditPayment(id, validated, user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
