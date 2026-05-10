import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createBankAccountSchema } from '@/lib/validations/schemas';
import { getBankAccounts, createBankAccount, getTreasurySummary } from '@/lib/services/treasury.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('treasury.view');
    const sp = request.nextUrl.searchParams;
    const view = sp.get('view');

    if (view === 'summary') {
      const summary = await getTreasurySummary();
      return successResponse(summary);
    }

    const result = await getBankAccounts({
      page: parseInt(sp.get('page') || '1'),
      pageSize: parseInt(sp.get('pageSize') || '20'),
      search: sp.get('search') || undefined,
      activeOnly: sp.get('activeOnly') === 'true',
    });
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('treasury.create');
    const body = await request.json();
    const data = createBankAccountSchema.parse(body);
    const result = await createBankAccount(data, user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
