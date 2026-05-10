// ============================================================
// CoopManager - Credit Co-debtors API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createCreditCoDebtorSchema } from '@/lib/validations/schemas';
import { addCreditCoDebtor, getCreditById } from '@/lib/services/credit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('credits.view');
    const { id } = await params;
    const credit = await getCreditById(id);
    return successResponse(credit?.coDebtors || []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('credits.manage_advanced');
    const { id } = await params;
    const body = await request.json();
    const validated = createCreditCoDebtorSchema.parse(body);
    const data = await addCreditCoDebtor(id, validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
