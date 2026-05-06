// ============================================================
// CoopManager - Local File Storage Provider
// ============================================================
// Stores files in ./uploads/documents/{associateId}/

import fs from 'fs/promises';
import path from 'path';
import type { StorageProvider } from './index';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'documents');

export class LocalStorageProvider implements StorageProvider {
  getProviderName(): string {
    return 'local';
  }

  getBucketName(): string | null {
    return null;
  }

  async upload(file: Buffer, filePath: string): Promise<string> {
    const fullPath = path.join(UPLOAD_BASE, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOAD_BASE, filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_BASE, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // If file doesn't exist, ignore
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  getUrl(filePath: string): string {
    return `/api/storage/${filePath}`;
  }
}
