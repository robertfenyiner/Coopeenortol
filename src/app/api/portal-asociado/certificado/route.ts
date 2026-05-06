// ============================================================
// CoopManager - Associate Certificate API Route
// ============================================================

import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { generateAssociateCertificate } from '@/lib/services/associate-portal.service';

export async function GET() {
  try {
    const user = await requirePermission('portal.download');
    const data = await generateAssociateCertificate(user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
