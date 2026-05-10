import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createBankReconciliationSchema, reconcileItemSchema } from '@/lib/validations/schemas';
import {
  getBankReconciliations,
  createBankReconciliation,
  getBankReconciliationById,
  addReconciliationItem,
  completeBankReconciliation,
} from '@/lib/services/treasury.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('treasury.view');
    const sp = request.nextUrl.searchParams;

    const detailId = sp.get('id');
    if (detailId) {
      const rec = await getBankReconciliationById(detailId);
      if (!rec) return errorResponse('Conciliación no encontrada', 404);
      return successResponse(rec);
    }

    const result = await getBankReconciliations({
      bankAccountId: sp.get('bankAccountId') || undefined,
      page: parseInt(sp.get('page') || '1'),
      pageSize: parseInt(sp.get('pageSize') || '20'),
      status: sp.get('status') || undefined,
    });
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('treasury.reconcile');
    const body = await request.json();

    // Adding an item to existing reconciliation
    if (body.reconciliationId) {
      const data = reconcileItemSchema.parse(body);
      const result = await addReconciliationItem(body.reconciliationId, data, user.id);
      return successResponse(result, 201);
    }

    // Complete a reconciliation
    if (body.action === 'complete' && body.id) {
      const result = await completeBankReconciliation(body.id, user.id);
      return successResponse(result);
    }

    // Create new reconciliation
    const data = createBankReconciliationSchema.parse(body);
    const result = await createBankReconciliation(data, user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
