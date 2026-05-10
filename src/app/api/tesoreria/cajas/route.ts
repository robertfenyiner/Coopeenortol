import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createCashRegisterSchema, openCashRegisterSchema, closeCashRegisterSchema, createCashMovementSchema } from '@/lib/validations/schemas';
import {
  getCashRegisters,
  getCashRegisterById,
  createCashRegister,
  openCashRegister,
  closeCashRegister,
  createCashMovement,
} from '@/lib/services/treasury.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('treasury.cash');
    const sp = request.nextUrl.searchParams;

    const detailId = sp.get('id');
    if (detailId) {
      const register = await getCashRegisterById(detailId);
      if (!register) return errorResponse('Caja no encontrada', 404);
      return successResponse(register);
    }

    const result = await getCashRegisters({
      page: parseInt(sp.get('page') || '1'),
      pageSize: parseInt(sp.get('pageSize') || '20'),
      activeOnly: sp.get('activeOnly') === 'true',
    });
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('treasury.cash');
    const body = await request.json();

    // Open cash register
    if (body.action === 'open' && body.id) {
      const data = openCashRegisterSchema.parse(body);
      const result = await openCashRegister(body.id, data, user.id);
      return successResponse(result);
    }

    // Close cash register
    if (body.action === 'close' && body.id) {
      const data = closeCashRegisterSchema.parse(body);
      const result = await closeCashRegister(body.id, data.observations || null, user.id);
      return successResponse(result);
    }

    // Create cash movement
    if (body.cashRegisterId) {
      const data = createCashMovementSchema.parse(body);
      const result = await createCashMovement(data, user.id);
      return successResponse(result, 201);
    }

    // Create new cash register
    const data = createCashRegisterSchema.parse(body);
    const result = await createCashRegister(data, user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
