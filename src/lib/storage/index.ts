// ============================================================
// CoopManager - Storage Provider Factory
// ============================================================
// Abstraction layer for file storage. Switch providers via
// STORAGE_PROVIDER env var: 'local' | 'google_drive' | 's3' | etc.

import { LocalStorageProvider } from './local.provider';
import { S3StorageProvider } from './s3.provider';
import { GoogleDriveStorageProvider } from './google-drive.provider';

export interface StorageProvider {
  getProviderName(): string;
  getBucketName(): string | null;
  /** Upload a file and return the storage key */
  upload(file: Buffer, path: string, mimeType: string): Promise<string>;
  /** Download a file by its storage key */
  download(path: string): Promise<Buffer>;
  /** Delete a file by its storage key */
  delete(path: string): Promise<void>;
  /** Get a URL or path to access the file */
  getUrl(path: string): string;
}

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const providerType = process.env.STORAGE_PROVIDER || 'local';

  switch (providerType) {
    case 'local':
      _provider = new LocalStorageProvider();
      break;
    case 'google_drive':
      _provider = new GoogleDriveStorageProvider();
      break;
    case 's3':
      _provider = new S3StorageProvider();
      break;
    default:
      console.warn(`Unknown storage provider "${providerType}", falling back to local`);
      _provider = new LocalStorageProvider();
  }

  return _provider!;
}
