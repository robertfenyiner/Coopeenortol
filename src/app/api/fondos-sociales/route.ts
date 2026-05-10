// ============================================================
// CoopManager - Social Funds API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createSocialFundSchema } from '@/lib/validations/schemas';
import { createSocialFund, getSocialFunds } from '@/lib/services/social-fund.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('social_funds.view');
    const { searchParams } = new URL(request.url);

    const data = await getSocialFunds({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      search: searchParams.get('search') || undefined,
      fundType: searchParams.get('fundType') || undefined,
      activeOnly: searchParams.get('activeOnly') === 'true',
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('social_funds.manage');
    const body = await request.json();
    const validated = createSocialFundSchema.parse(body);
    const data = await createSocialFund(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
