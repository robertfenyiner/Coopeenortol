// ============================================================
// CoopManager - Payroll Flat File Generation API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { generatePayrollBatchFile } from '@/lib/services/payroll-deduction.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('payroll.generate');
    const { id } = await params;
    const file = await generatePayrollBatchFile(id, user.id);
    return successResponse(file);
  } catch (error) {
    return handleApiError(error);
  }
}
