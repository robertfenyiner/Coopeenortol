// ============================================================
// CoopManager - Report Export API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/api-helpers';
import { reportExportSchema } from '@/lib/validations/schemas';
import { generateReportExport } from '@/lib/services/report.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('reports.export');
    const { searchParams } = new URL(request.url);
    const validated = reportExportSchema.parse({
      report: searchParams.get('report'),
      format: searchParams.get('format'),
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });
    const file = await generateReportExport(validated, user.id);
    return new NextResponse(file.content, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
