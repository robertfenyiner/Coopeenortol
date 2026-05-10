import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { assemblyVoteStatusSchema } from '@/lib/validations/schemas';
import { updateAssemblyVoteStatus } from '@/lib/services/assembly.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  try {
    const user = await requirePermission('assemblies.manage');
    const { voteId } = await params;
    const body = await request.json();
    const validated = assemblyVoteStatusSchema.parse(body);
    const data = await updateAssemblyVoteStatus(voteId, validated, user.id);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
