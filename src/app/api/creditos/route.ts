// ============================================================
// CoopManager - Créditos API Routes (Listar + Crear solicitud)
// ============================================================

import { NextRequest } from 'next/server';
import { getCredits, createCredit } from '@/lib/services/credit.service';
import { createCreditSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('credits.view');
    const { searchParams } = new URL(request.url);

    const data = await getCredits({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      creditLine: searchParams.get('creditLine') || undefined,
      associateId: searchParams.get('associateId') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('credits.create');
    const body = await request.json();
    const validated = createCreditSchema.parse(body);
    const credit = await createCredit(validated, user.id);
    return successResponse(credit, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
