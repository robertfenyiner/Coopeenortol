// ============================================================
// CoopManager - Payroll Deductions API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createPayrollBatchSchema } from '@/lib/validations/schemas';
import { createPayrollBatch, getPayrollBatches } from '@/lib/services/payroll-deduction.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('payroll.view');
    const { searchParams } = new URL(request.url);

    const data = await getPayrollBatches({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      payingEntityId: searchParams.get('payingEntityId') || undefined,
      periodYear: searchParams.get('periodYear') ? parseInt(searchParams.get('periodYear') || '', 10) : undefined,
      periodMonth: searchParams.get('periodMonth') ? parseInt(searchParams.get('periodMonth') || '', 10) : undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('payroll.create');
    const body = await request.json();
    const validated = createPayrollBatchSchema.parse(body);
    const data = await createPayrollBatch(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
