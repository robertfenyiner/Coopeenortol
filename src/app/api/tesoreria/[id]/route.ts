import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { updateBankAccountSchema } from '@/lib/validations/schemas';
import { getBankAccountById, updateBankAccount } from '@/lib/services/treasury.service';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('treasury.view');
    const { id } = await params;
    const account = await getBankAccountById(id);
    if (!account) return errorResponse('Cuenta bancaria no encontrada', 404);
    return successResponse(account);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('treasury.create');
    const { id } = await params;
    const body = await request.json();
    const data = updateBankAccountSchema.parse(body);
    const result = await updateBankAccount(id, data, user.id);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
