// ============================================================
// CoopManager - Associate Portal Summary API Route
// ============================================================

import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { getAssociatePortalSummary } from '@/lib/services/associate-portal.service';

export async function GET() {
  try {
    const user = await requirePermission('portal.view');
    const data = await getAssociatePortalSummary(user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
