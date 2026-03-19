// ============================================================
// CoopManager - Permissions API
// ============================================================

import { getAllPermissions } from '@/lib/services/role.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requirePermission('roles.view');
    const permissions = await getAllPermissions();
    return successResponse(permissions);
  } catch (error) {
    return handleApiError(error);
  }
}
