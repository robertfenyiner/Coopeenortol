// ============================================================
// CoopManager - Single User API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { getUserById, updateUser, toggleUserStatus } from '@/lib/services/user.service';
import { updateUserSchema } from '@/lib/validations/schemas';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('users.view');
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return successResponse(null);
    
    const { passwordHash: _passwordHash, ...safeUser } = user;
    void _passwordHash;
    return successResponse(safeUser);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('users.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    const updated = await updateUser(id, validated, currentUser.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('users.toggle_status');
    const { id } = await params;
    const updated = await toggleUserStatus(id, currentUser.id);
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
