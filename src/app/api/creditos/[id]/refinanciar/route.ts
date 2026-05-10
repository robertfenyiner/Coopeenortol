// ============================================================
// CoopManager - Credit Refinancing API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { refinanceCreditSchema } from '@/lib/validations/schemas';
import { refinanceCredit } from '@/lib/services/credit.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('credits.refinance');
    const { id } = await params;
    const body = await request.json();
    const validated = refinanceCreditSchema.parse(body);
    const data = await refinanceCredit(id, validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
