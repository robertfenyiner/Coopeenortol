// ============================================================
// CoopManager - Receipts API Route
// ============================================================

import { NextRequest } from 'next/server';
import { getReceipts } from '@/lib/services/receipt.service';
import { createBatchContributions } from '@/lib/services/contribution.service';
import { createBatchContributionSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission, validationError } from '@/lib/api-helpers';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from '@/lib/services/audit.service';

// GET: Listar recibos
export async function GET(request: NextRequest) {
  try {
    await requirePermission('contributions.view');
    const { searchParams } = new URL(request.url);
    const receipts = await getReceipts({
      page: Number(searchParams.get('page') || '1'),
      pageSize: Number(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });
    return successResponse(receipts);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Crear recaudo en lote
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('contributions.create');
    const body = await request.json();

    const parsed = createBatchContributionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { contributions, paymentMethod, reference, observations } = parsed.data;

    const receipt = await createBatchContributions(
      contributions,
      paymentMethod,
      reference,
      observations,
      user.id
    );

    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.RECEIPT_CREATE,
      module: MODULES.RECEIPTS,
      entity: 'PaymentReceipt',
      entityId: receipt.id,
      details: `Recaudo en lote: ${contributions.length} aportes`,
    });

    return successResponse(receipt, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
