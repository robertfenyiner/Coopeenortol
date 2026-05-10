import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { castAssemblyBallotSchema } from '@/lib/validations/schemas';
import { castAssemblyBallot } from '@/lib/services/assembly.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  try {
    const user = await requirePermission('assemblies.vote');
    const { voteId } = await params;
    const body = await request.json();
    const validated = castAssemblyBallotSchema.parse(body);
    const data = await castAssemblyBallot(voteId, validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
