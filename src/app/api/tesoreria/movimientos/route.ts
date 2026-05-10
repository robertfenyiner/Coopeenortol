import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createBankTransactionSchema, importBankTransactionsSchema } from '@/lib/validations/schemas';
import { getBankTransactions, createBankTransaction, importBankTransactions } from '@/lib/services/treasury.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('treasury.view');
    const sp = request.nextUrl.searchParams;
    const result = await getBankTransactions({
      bankAccountId: sp.get('bankAccountId') || undefined,
      page: parseInt(sp.get('page') || '1'),
      pageSize: parseInt(sp.get('pageSize') || '30'),
      search: sp.get('search') || undefined,
      status: sp.get('status') || undefined,
      dateFrom: sp.get('dateFrom') || undefined,
      dateTo: sp.get('dateTo') || undefined,
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

    // Check if it's an import or single transaction
    if (body.content) {
      const data = importBankTransactionsSchema.parse(body);
      const result = await importBankTransactions(data.bankAccountId, data.content, user.id);
      return successResponse(result, 201);
    }

    const data = createBankTransactionSchema.parse(body);
    const result = await createBankTransaction(data, user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
