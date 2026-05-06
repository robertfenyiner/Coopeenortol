// ============================================================
// CoopManager - Integrations Status API Route
// ============================================================

import { successResponse, handleApiError, requirePermission } from '@/lib/api-helpers';
import { getStorageProvider } from '@/lib/storage';

export async function GET() {
  try {
    await requirePermission('integrations.view');
    const storage = getStorageProvider();
    return successResponse({
      storage: {
        provider: storage.getProviderName(),
        bucket: storage.getBucketName(),
        configured: true,
      },
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        provider: process.env.EMAIL_API_URL ? 'http_api' : 'disabled',
      },
      whatsapp: {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        provider: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'meta_cloud_api' : 'disabled',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
