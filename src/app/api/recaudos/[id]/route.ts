// ============================================================
// CoopManager - Individual Receipt API Route
// ============================================================

import { NextRequest } from 'next/server';
import { getReceiptById, voidReceipt } from '@/lib/services/receipt.service';
import { successResponse, handleApiError, requirePermission, errorResponse } from '@/lib/api-helpers';

// GET: Detalle de recibo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('contributions.view');
    const { id } = await params;
    const receipt = await getReceiptById(id);
    if (!receipt) return errorResponse('Recibo no encontrado', 404);
    return successResponse(receipt);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Anular recibo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('contributions.create');
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'void') {
      await voidReceipt(id, user.id);
      return successResponse({ voided: true });
    }

    return errorResponse('Acción no válida', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
