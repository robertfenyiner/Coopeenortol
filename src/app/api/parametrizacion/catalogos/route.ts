// ============================================================
// CoopManager - Catalogs API
// ============================================================

import { NextRequest } from 'next/server';
import { getCatalogs, createCatalog } from '@/lib/services/catalog.service';
import { createCatalogSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('params.view');
    const { searchParams } = new URL(request.url);

    const data = await getCatalogs({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '50'),
      search: searchParams.get('search') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('params.create');
    const body = await request.json();
    const validated = createCatalogSchema.parse(body);
    const catalog = await createCatalog(validated, user.id);
    return successResponse(catalog, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
