// ============================================================
// CoopManager - Audit Log API
// ============================================================

import { NextRequest } from 'next/server';
import { getAuditLogs } from '@/lib/services/audit.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit.view');
    const { searchParams } = new URL(request.url);

    const data = await getAuditLogs({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '30'),
      userId: searchParams.get('userId') || undefined,
      module: searchParams.get('module') || undefined,
      action: searchParams.get('action') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
