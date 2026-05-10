import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { assemblyStatusSchema } from '@/lib/validations/schemas';
import { getAssemblyById, updateAssemblyStatus } from '@/lib/services/assembly.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('assemblies.view');
    const { id } = await params;
    const data = await getAssemblyById(id);
    if (!data) return errorResponse('Asamblea no encontrada', 404);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('assemblies.manage');
    const { id } = await params;
    const body = await request.json();
    const validated = assemblyStatusSchema.parse(body);
    const data = await updateAssemblyStatus(id, validated, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
