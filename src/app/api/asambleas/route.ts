import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createAssemblySchema } from '@/lib/validations/schemas';
import { createAssembly, getAssemblies } from '@/lib/services/assembly.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('assemblies.view');
    const { searchParams } = new URL(request.url);
    const data = await getAssemblies({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('assemblies.manage');
    const body = await request.json();
    const validated = createAssemblySchema.parse(body);
    const data = await createAssembly(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
