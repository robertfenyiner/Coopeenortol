// ============================================================
// CoopManager - Catalog Detail + Items API
// ============================================================

import { NextRequest } from 'next/server';
import { getCatalogById, createCatalogItem } from '@/lib/services/catalog.service';
import { createCatalogItemSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('params.view');
    const { id } = await params;
    const catalog = await getCatalogById(id);
    return successResponse(catalog);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('params.create');
    const { id } = await params;
    const body = await request.json();
    const validated = createCatalogItemSchema.parse({ ...body, catalogId: id });
    const item = await createCatalogItem(validated, user.id);
    return successResponse(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
