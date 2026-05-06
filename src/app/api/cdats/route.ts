// ============================================================
// CoopManager - CDAT Investments API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createCdatInvestmentSchema } from '@/lib/validations/schemas';
import { createCdatInvestment, getCdatInvestments } from '@/lib/services/cdat.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('cdats.view');
    const { searchParams } = new URL(request.url);

    const data = await getCdatInvestments({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      associateId: searchParams.get('associateId') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('cdats.create');
    const body = await request.json();
    const validated = createCdatInvestmentSchema.parse(body);
    const data = await createCdatInvestment(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
