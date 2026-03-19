// ============================================================
// CoopManager - Storage Provider Factory
// ============================================================
// Abstraction layer for file storage. Switch providers via
// STORAGE_PROVIDER env var: 'local' | 'google_drive' | 's3' | etc.

import { LocalStorageProvider } from './local.provider';

export interface StorageProvider {
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
    // Future providers:
    // case 'google_drive':
    //   _provider = new GoogleDriveProvider();
    //   break;
    // case 's3':
    //   _provider = new S3Provider();
    //   break;
    default:
      console.warn(`Unknown storage provider "${providerType}", falling back to local`);
      _provider = new LocalStorageProvider();
  }

  return _provider!;
}
