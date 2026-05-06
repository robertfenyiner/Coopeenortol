// ============================================================
// CoopManager - Notifications API Routes
// ============================================================

import { NextRequest } from 'next/server';
import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { sendNotificationSchema } from '@/lib/validations/schemas';
import { getNotificationLogs, sendNotification } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('integrations.view');
    const { searchParams } = new URL(request.url);
    const data = await getNotificationLogs({
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      channel: searchParams.get('channel') || undefined,
      status: searchParams.get('status') || undefined,
    });
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('notifications.send');
    const body = await request.json();
    const validated = sendNotificationSchema.parse(body);
    const data = await sendNotification(validated, user.id);
    return successResponse(data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
