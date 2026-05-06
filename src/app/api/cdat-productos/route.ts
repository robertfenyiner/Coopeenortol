// ============================================================
// CoopManager - CDAT Products API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createCdatProductSchema } from '@/lib/validations/schemas';
import { createCdatProduct, getCdatProducts } from '@/lib/services/cdat.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('cdats.view');
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const data = await getCdatProducts({ activeOnly });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('cdats.manage');
    const body = await request.json();
    const validated = createCdatProductSchema.parse(body);
    const data = await createCdatProduct(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
