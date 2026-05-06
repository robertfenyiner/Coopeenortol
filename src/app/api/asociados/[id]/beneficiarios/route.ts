// ============================================================
// CoopManager - Beneficiarios API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { addBeneficiary, removeBeneficiary } from '@/lib/services/associate.service';
import { beneficiarySchema } from '@/lib/validations/schemas';
import { successResponse, errorResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('associates.view');
    const { id } = await params;

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { associateId: id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(beneficiaries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('associates.edit');
    const { id } = await params;
    const body = await request.json();
    const validated = beneficiarySchema.parse(body);
    const beneficiary = await addBeneficiary(id, validated, user.id);
    return successResponse(beneficiary, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const user = await requirePermission('associates.edit');
    const { searchParams } = new URL(request.url);
    const beneficiaryId = searchParams.get('beneficiaryId');

    if (!beneficiaryId) {
      return errorResponse('Se requiere beneficiaryId', 400);
    }

    await removeBeneficiary(beneficiaryId, user.id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
