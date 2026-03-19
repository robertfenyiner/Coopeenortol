// ============================================================
// CoopManager - Users API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { getUsers, createUser } from '@/lib/services/user.service';
import { createUserSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('users.view');
    const { searchParams } = new URL(request.url);

    const data = await getUsers({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined,
      roleId: searchParams.get('roleId') || undefined,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('users.create');
    const body = await request.json();
    const validated = createUserSchema.parse(body);
    const newUser = await createUser(validated, user.id);
    return successResponse(newUser, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
