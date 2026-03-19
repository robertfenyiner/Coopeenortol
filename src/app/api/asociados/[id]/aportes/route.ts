// ============================================================
// CoopManager - Resumen de aportes por asociado
// ============================================================

import { NextRequest } from 'next/server';
import { getAssociateSavingsSummary } from '@/lib/services/contribution.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('contributions.view');
    const { id } = await params;
    const summary = await getAssociateSavingsSummary(id);
    return successResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
