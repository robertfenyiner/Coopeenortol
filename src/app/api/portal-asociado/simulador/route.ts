// ============================================================
// CoopManager - Associate Portal Credit Simulator API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { portalCreditSimulationSchema } from '@/lib/validations/schemas';
import { simulatePortalCredit } from '@/lib/services/associate-portal.service';

export async function POST(request: NextRequest) {
  try {
    await requirePermission('portal.simulate');
    const body = await request.json();
    const validated = portalCreditSimulationSchema.parse(body);
    const data = await simulatePortalCredit(validated);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
