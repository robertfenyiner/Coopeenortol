// ============================================================
// CoopManager - Credit Scoring API Route
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { evaluateCreditScore, getCreditById } from '@/lib/services/credit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('credits.score');
    const { id } = await params;
    const credit = await getCreditById(id);
    return successResponse(credit?.scoreSnapshots || []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission('credits.score');
    const { id } = await params;
    const data = await evaluateCreditScore(id, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
