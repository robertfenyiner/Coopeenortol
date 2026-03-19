// ============================================================
// CoopManager - Aportes API Routes (Listar + Crear)
// ============================================================

import { NextRequest } from 'next/server';
import { getContributions, createContribution, createBatchContributions } from '@/lib/services/contribution.service';
import { createContributionSchema, createBatchContributionSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('contributions.view');
    const { searchParams } = new URL(request.url);

    const data = await getContributions({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      associateId: searchParams.get('associateId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('contributions.create');
    const body = await request.json();

    // Verificar si es un batch o individual
    if (body.contributions) {
      const validated = createBatchContributionSchema.parse(body);
      const receipt = await createBatchContributions(
        validated.contributions,
        validated.paymentMethod,
        validated.reference,
        validated.observations,
        user.id
      );
      return successResponse(receipt, 201);
    } else {
      const validated = createContributionSchema.parse(body);
      const contribution = await createContribution(validated, user.id);
      return successResponse(contribution, 201);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
