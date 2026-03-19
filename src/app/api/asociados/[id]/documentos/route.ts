// ============================================================
// CoopManager - Associate Documents API Route
// ============================================================

import { NextRequest } from 'next/server';
import { getDocumentsByAssociate, uploadDocument } from '@/lib/services/document.service';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

// GET: Listar documentos del asociado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('associates.view');
    const { id } = await params;
    const documents = await getDocumentsByAssociate(id);
    return successResponse(documents);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Subir un documento (FormData)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('associates.edit');
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string | null;

    if (!file) {
      return successResponse(null, 400);
    }
    if (!documentType) {
      return successResponse(null, 400);
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const { errorResponse } = await import('@/lib/api-helpers');
      return errorResponse('El archivo no debe superar 10MB', 400);
    }

    // Validar tipos permitidos
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedTypes.includes(file.type)) {
      const { errorResponse } = await import('@/lib/api-helpers');
      return errorResponse('Tipo de archivo no permitido. Use PDF, imágenes, Word o Excel.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadDocument(id, buffer, file.name, file.type, documentType, user.id);

    return successResponse(document, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
