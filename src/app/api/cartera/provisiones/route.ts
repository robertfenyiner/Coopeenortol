// ============================================================
// CoopManager - Portfolio Provisions API Route
// ============================================================

import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { calculatePortfolioProvisions } from '@/lib/services/portfolio.service';

export async function POST() {
  try {
    const user = await requirePermission('portfolio.provision');
    const data = await calculatePortfolioProvisions(user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
