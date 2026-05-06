// ============================================================
// CoopManager - Payroll Conciliation API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { reconcilePayrollBatchSchema } from '@/lib/validations/schemas';
import { reconcilePayrollBatch } from '@/lib/services/payroll-deduction.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('payroll.reconcile');
    const { id } = await params;
    const body = await request.json();
    const validated = reconcilePayrollBatchSchema.parse(body);
    const batch = await reconcilePayrollBatch(id, validated.content, user.id);
    return successResponse(batch);
  } catch (error) {
    return handleApiError(error);
  }
}
