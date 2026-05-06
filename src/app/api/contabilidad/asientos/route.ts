// ============================================================
// CoopManager - Accounting Journal Entries API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createJournalEntrySchema } from '@/lib/validations/schemas';
import { createJournalEntry, getJournalEntries } from '@/lib/services/accounting.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('accounting.view');
    const { searchParams } = new URL(request.url);
    const data = await getJournalEntries({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      search: searchParams.get('search') || undefined,
      sourceModule: searchParams.get('sourceModule') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('accounting.post');
    const body = await request.json();
    const validated = createJournalEntrySchema.parse(body);
    const data = await createJournalEntry(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
