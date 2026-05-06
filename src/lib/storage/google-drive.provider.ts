// ============================================================
// CoopManager - Google Drive Storage Provider
// ============================================================

import crypto from 'crypto';
import type { StorageProvider } from './index';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  return value;
}

export class GoogleDriveStorageProvider implements StorageProvider {
  private readonly accessToken = requiredEnv('GOOGLE_DRIVE_ACCESS_TOKEN');
  private readonly folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

  getProviderName(): string {
    return 'google_drive';
  }

  getBucketName(): string | null {
    return this.folderId;
  }

  async upload(file: Buffer, filePath: string, mimeType: string): Promise<string> {
    const metadata = {
      name: filePath.split('/').pop() || filePath,
      parents: this.folderId ? [this.folderId] : undefined,
      appProperties: { coopmanagerPath: filePath },
    };
    const boundary = `coopmanager_${crypto.randomUUID()}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      file,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) throw new Error(`Error subiendo a Google Drive: ${res.status} ${await res.text()}`);
    const json = await res.json() as { id: string };
    return json.id;
  }

  async download(fileId: string): Promise<Buffer> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`Error descargando de Google Drive: ${res.status} ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(fileId: string): Promise<void> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`Error eliminando de Google Drive: ${res.status} ${await res.text()}`);
  }

  getUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}
