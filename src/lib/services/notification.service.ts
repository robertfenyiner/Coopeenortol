// ============================================================
// CoopManager - Notification Service (Fase E)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateNotificationTemplateInput, SendNotificationInput } from '@/lib/validations/schemas';

type RenderVariables = Record<string, string | number | boolean | null | undefined>;

function renderTemplate(template: string, variables: RenderVariables): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

async function sendEmail(params: { recipient: string; subject?: string | null; body: string }) {
  if (process.env.EMAIL_ENABLED !== 'true') {
    return { status: 'OMITIDO', provider: 'email_disabled', providerMessageId: null, errorMessage: null };
  }

  const apiUrl = process.env.EMAIL_API_URL;
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiUrl || !apiKey) throw new Error('EMAIL_API_URL y EMAIL_API_KEY son requeridos para enviar email');

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'notificaciones@coopeenortol.com',
      to: params.recipient,
      subject: params.subject || 'Notificación Coopeenortol',
      text: params.body,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Email falló: ${res.status} ${text}`);
  return { status: 'ENVIADO', provider: 'email_http', providerMessageId: text.slice(0, 120), errorMessage: null };
}

async function sendWhatsApp(params: { recipient: string; body: string }) {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    return { status: 'OMITIDO', provider: 'whatsapp_disabled', providerMessageId: null, errorMessage: null };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error('WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID son requeridos');

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.recipient,
      type: 'text',
      text: { preview_url: false, body: params.body },
    }),
  });
  const json = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok) throw new Error(`WhatsApp falló: ${json.error?.message || res.statusText}`);
  return { status: 'ENVIADO', provider: 'meta_whatsapp', providerMessageId: json.messages?.[0]?.id || null, errorMessage: null };
}

export async function getNotificationTemplates() {
  return prisma.notificationTemplate.findMany({
    orderBy: [{ channel: 'asc' }, { code: 'asc' }],
  });
}

export async function createNotificationTemplate(input: CreateNotificationTemplateInput, createdBy: string) {
  const template = await prisma.notificationTemplate.create({
    data: {
      code: input.code,
      name: input.name,
      channel: input.channel,
      subject: input.subject || null,
      body: input.body,
      createdBy,
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.NOTIFICATION_TEMPLATE_CREATE,
    module: MODULES.INTEGRATIONS,
    entity: 'NotificationTemplate',
    entityId: template.id,
    dataAfter: { code: template.code, channel: template.channel },
    details: `Plantilla de notificación ${template.code} creada`,
  });

  return template;
}

export async function getNotificationLogs(params: { page?: number; pageSize?: number; channel?: string; status?: string }) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where = {
    ...(params.channel && { channel: params.channel }),
    ...(params.status && { status: params.status }),
  };

  const [data, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function sendNotification(input: SendNotificationInput, createdBy: string) {
  const log = await prisma.notificationLog.create({
    data: {
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject || null,
      body: input.body,
      status: 'PENDIENTE',
      createdBy,
    },
  });

  try {
    const result = input.channel === 'WHATSAPP'
      ? await sendWhatsApp({ recipient: input.recipient, body: input.body })
      : await sendEmail({ recipient: input.recipient, subject: input.subject, body: input.body });

    const updated = await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.status,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage,
        sentAt: result.status === 'ENVIADO' ? new Date() : null,
      },
    });

    await createAuditLog({
      userId: createdBy,
      action: AUDIT_ACTIONS.NOTIFICATION_SEND,
      module: MODULES.INTEGRATIONS,
      entity: 'NotificationLog',
      entityId: updated.id,
      dataAfter: { channel: updated.channel, status: updated.status, recipient: updated.recipient },
      details: `Notificación ${updated.channel} ${updated.status}`,
    });

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FALLIDO', errorMessage: message },
    });
  }
}

export async function sendNotificationFromTemplate(params: {
  templateCode: string;
  recipient: string;
  variables: RenderVariables;
  createdBy: string;
}) {
  if (!params.recipient) return null;
  const template = await prisma.notificationTemplate.findUnique({ where: { code: params.templateCode } });
  if (!template || !template.isActive) return null;

  const body = renderTemplate(template.body, params.variables);
  const subject = template.subject ? renderTemplate(template.subject, params.variables) : null;
  const log = await sendNotification({
    channel: template.channel as 'EMAIL' | 'WHATSAPP',
    recipient: params.recipient,
    subject,
    body,
  }, params.createdBy);

  return prisma.notificationLog.update({
    where: { id: log.id },
    data: { templateId: template.id, metadata: { variables: params.variables } },
  });
}
