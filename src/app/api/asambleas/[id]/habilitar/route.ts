import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { enableActiveAssociates } from '@/lib/services/assembly.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('assemblies.manage');
    const { id } = await params;
    const data = await enableActiveAssociates(id, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
