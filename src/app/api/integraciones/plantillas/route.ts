// ============================================================
// CoopManager - Notification Templates API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { createNotificationTemplateSchema } from '@/lib/validations/schemas';
import { createNotificationTemplate, getNotificationTemplates } from '@/lib/services/notification.service';

export async function GET() {
  try {
    await requirePermission('integrations.view');
    const data = await getNotificationTemplates();
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('integrations.manage');
    const body = await request.json();
    const validated = createNotificationTemplateSchema.parse(body);
    const data = await createNotificationTemplate(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
