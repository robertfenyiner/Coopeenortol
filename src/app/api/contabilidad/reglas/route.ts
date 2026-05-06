// ============================================================
// CoopManager - Accounting Rules API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createAccountingRuleSchema } from '@/lib/validations/schemas';
import { createAccountingRule, getAccountingRules } from '@/lib/services/accounting.service';

export async function GET() {
  try {
    await requirePermission('accounting.view');
    const data = await getAccountingRules();
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('accounting.manage');
    const body = await request.json();
    const validated = createAccountingRuleSchema.parse(body);
    const data = await createAccountingRule(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
