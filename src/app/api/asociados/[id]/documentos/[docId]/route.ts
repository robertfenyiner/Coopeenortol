// ============================================================
// CoopManager - Individual Document API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { downloadDocument, deleteDocument } from '@/lib/services/document.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

// GET: Descargar documento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requirePermission('associates.view');
    const { docId } = await params;

    const { buffer, fileName, mimeType } = await downloadDocument(docId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const user = await requirePermission('associates.edit');
    const { docId } = await params;
    await deleteDocument(docId, user.id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
