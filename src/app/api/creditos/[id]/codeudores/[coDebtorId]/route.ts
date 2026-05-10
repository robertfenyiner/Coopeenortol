// ============================================================
// CoopManager - Individual Credit Co-debtor API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { removeCreditCoDebtor } from '@/lib/services/credit.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coDebtorId: string }> }
) {
  try {
    const user = await requirePermission('credits.manage_advanced');
    const { id, coDebtorId } = await params;
    const data = await removeCreditCoDebtor(id, coDebtorId, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
