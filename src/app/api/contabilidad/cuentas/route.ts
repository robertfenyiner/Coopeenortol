// ============================================================
// CoopManager - Chart Accounts API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createChartAccountSchema } from '@/lib/validations/schemas';
import { createChartAccount, getChartAccounts } from '@/lib/services/accounting.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('accounting.view');
    const { searchParams } = new URL(request.url);
    const data = await getChartAccounts({
      activeOnly: searchParams.get('activeOnly') !== 'false',
      search: searchParams.get('search') || undefined,
    });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('accounting.manage');
    const body = await request.json();
    const validated = createChartAccountSchema.parse(body);
    const data = await createChartAccount(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
