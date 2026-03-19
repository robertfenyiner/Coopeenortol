// ============================================================
// CoopManager - Cartera API Route
// ============================================================

import { getPortfolioSummary } from '@/lib/services/portfolio.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requirePermission('portfolio.view');
    const data = await getPortfolioSummary();
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
