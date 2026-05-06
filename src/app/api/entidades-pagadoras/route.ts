// ============================================================
// CoopManager - Paying Entities API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createPayingEntitySchema } from '@/lib/validations/schemas';
import { createPayingEntity, getPayingEntities } from '@/lib/services/payroll-deduction.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('payroll.view');
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const data = await getPayingEntities({ activeOnly });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('paying_entities.manage');
    const body = await request.json();
    const validated = createPayingEntitySchema.parse(body);
    const data = await createPayingEntity(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
