// ============================================================
// CoopManager - Tax Certificate API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/api-helpers';
import { taxCertificateSchema } from '@/lib/validations/schemas';
import { generateTaxCertificate } from '@/lib/services/report.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('reports.tax_certificate');
    const { searchParams } = new URL(request.url);
    const validated = taxCertificateSchema.parse({
      associateId: searchParams.get('associateId'),
      year: parseInt(searchParams.get('year') || '', 10),
      format: searchParams.get('format') || 'pdf',
    });
    const file = await generateTaxCertificate(validated, user.id);
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
