// ============================================================
// CoopManager - Asociados API Routes (Listar + Crear)
// ============================================================

import { NextRequest } from 'next/server';
import { getAssociates, createAssociate } from '@/lib/services/associate.service';
import { createAssociateSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('associates.view');
    const { searchParams } = new URL(request.url);

    const data = await getAssociates({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('associates.create');
    const body = await request.json();
    const validated = createAssociateSchema.parse(body);
    const associate = await createAssociate(validated, user.id);
    return successResponse(associate, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
