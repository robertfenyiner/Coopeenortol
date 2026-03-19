// ============================================================
// CoopManager - Dashboard API Route
// ============================================================

import { getDashboardStats } from '@/lib/services/dashboard.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requirePermission('dashboard.view');
    const stats = await getDashboardStats();
    return successResponse(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
