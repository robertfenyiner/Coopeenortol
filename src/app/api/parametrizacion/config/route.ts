// ============================================================
// CoopManager - System Config API
// ============================================================

import { NextRequest } from 'next/server';
import { getSystemConfigs, updateSystemConfig } from '@/lib/services/catalog.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('system.config');
    const { searchParams } = new URL(request.url);
    const moduleFilter = searchParams.get('module') || undefined;
    const configs = await getSystemConfigs(moduleFilter);
    return successResponse(configs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission('system.config');
    const body = await request.json();
    const { id, value } = body;
    if (!id || value === undefined) {
      return successResponse(null);
    }
    const updated = await updateSystemConfig(id, String(value), user.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
