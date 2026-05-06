// ============================================================
// CoopManager - Document Service (Módulo 7)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { getStorageProvider } from '@/lib/storage';
import crypto from 'crypto';
import { sendNotificationFromTemplate } from './notification.service';

// ------------------------------------------------------------
// Listar documentos de un asociado
// ------------------------------------------------------------
export async function getDocumentsByAssociate(associateId: string) {
  return prisma.associateDocument.findMany({
    where: { associateId },
    orderBy: { uploadedAt: 'desc' },
  });
}

// ------------------------------------------------------------
// Subir un documento
// ------------------------------------------------------------
export async function uploadDocument(
  associateId: string,
  file: Buffer,
  fileName: string,
  mimeType: string,
  documentType: string,
  uploadedBy: string
) {
  // Verificar que el asociado existe
  const associate = await prisma.associate.findUnique({
    where: { id: associateId },
    include: { person: true },
  });
  if (!associate) throw new Error('Asociado no encontrado');

  // Generar nombre único para evitar colisiones
  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const storagePath = `${associateId}/${uniqueName}`;

  const storage = getStorageProvider();
  const storageKey = await storage.upload(file, storagePath, mimeType);
  const checksum = crypto.createHash('sha256').update(file).digest('hex');

  const document = await prisma.associateDocument.create({
    data: {
      associateId,
      documentType,
      fileName,
      filePath: storageKey,
      storageProvider: storage.getProviderName(),
      storageBucket: storage.getBucketName(),
      checksum,
      fileSize: file.length,
      mimeType,
      uploadedBy,
    },
  });

  await createAuditLog({
    userId: uploadedBy,
    action: AUDIT_ACTIONS.DOCUMENT_UPLOAD,
    module: MODULES.DOCUMENTS,
    entity: 'AssociateDocument',
    entityId: document.id,
    dataAfter: { fileName, documentType, fileSize: file.length },
    details: `Documento subido: ${fileName} (${documentType}) - ${associate.person.firstName} ${associate.person.lastName}`,
  });

  await sendNotificationFromTemplate({
    templateCode: 'DOCUMENT_UPLOADED_EMAIL',
    recipient: associate.person.email || '',
    variables: {
      firstName: associate.person.firstName,
      fileName,
      documentType,
    },
    createdBy: uploadedBy,
  });

  return document;
}

// ------------------------------------------------------------
// Descargar un documento
// ------------------------------------------------------------
export async function downloadDocument(documentId: string, associateId: string) {
  const doc = await prisma.associateDocument.findFirst({
    where: { id: documentId, associateId },
  });
  if (!doc) throw new Error('Documento no encontrado');

  const storage = getStorageProvider();
  const buffer = await storage.download(doc.filePath);

  return {
    buffer,
    fileName: doc.fileName,
    mimeType: doc.mimeType || 'application/octet-stream',
  };
}

// ------------------------------------------------------------
// Eliminar un documento
// ------------------------------------------------------------
export async function deleteDocument(documentId: string, associateId: string, performedBy: string) {
  const doc = await prisma.associateDocument.findFirst({
    where: { id: documentId, associateId },
  });
  if (!doc) throw new Error('Documento no encontrado');

  // Eliminar del storage
  const storage = getStorageProvider();
  await storage.delete(doc.filePath);

  // Eliminar del BD
  await prisma.associateDocument.delete({
    where: { id: documentId },
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.DOCUMENT_DELETE,
    module: MODULES.DOCUMENTS,
    entity: 'AssociateDocument',
    entityId: documentId,
    dataBefore: { fileName: doc.fileName, documentType: doc.documentType },
    details: `Documento eliminado: ${doc.fileName}`,
  });
}
