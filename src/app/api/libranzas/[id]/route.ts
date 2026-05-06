// ============================================================
// CoopManager - Individual Payroll Deduction Batch API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { getPayrollBatchById, markPayrollBatchAsSent } from '@/lib/services/payroll-deduction.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('payroll.view');
    const { id } = await params;
    const batch = await getPayrollBatchById(id);
    if (!batch) return errorResponse('Lote de libranza no encontrado', 404);
    return successResponse(batch);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('payroll.send');
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'send') {
      const batch = await markPayrollBatchAsSent(id, user.id);
      return successResponse(batch);
    }

    return errorResponse('AcciÃ³n no vÃ¡lida', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
