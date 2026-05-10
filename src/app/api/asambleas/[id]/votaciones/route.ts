import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createAssemblyVoteSchema } from '@/lib/validations/schemas';
import { createAssemblyVote } from '@/lib/services/assembly.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('assemblies.manage');
    const { id } = await params;
    const body = await request.json();
    const validated = createAssemblyVoteSchema.parse(body);
    const data = await createAssemblyVote(id, validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
