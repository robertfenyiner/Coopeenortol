// ============================================================
// CoopManager - AWS S3 Storage Provider
// ============================================================

import crypto from 'crypto';
import type { StorageProvider } from './index';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  return value;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export class S3StorageProvider implements StorageProvider {
  private readonly bucket = requiredEnv('S3_BUCKET');
  private readonly region = process.env.S3_REGION || 'us-east-1';
  private readonly accessKeyId = requiredEnv('S3_ACCESS_KEY_ID');
  private readonly secretAccessKey = requiredEnv('S3_SECRET_ACCESS_KEY');

  getProviderName(): string {
    return 's3';
  }

  getBucketName(): string | null {
    return this.bucket;
  }

  private endpoint(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeKey(key)}`;
  }

  private signedHeaders(method: string, key: string, payload: Buffer | string, extraHeaders: Record<string, string> = {}) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const payloadHash = sha256(payload);
    const headers = {
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders,
    };
    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map((name) => `${name}:${headers[name as keyof typeof headers]}\n`).join('');
    const signedHeaders = sortedKeys.join(';');
    const canonicalRequest = [
      method,
      `/${encodeKey(key)}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.secretAccessKey}`, dateStamp), this.region), 's3'), 'aws4_request');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  async upload(file: Buffer, filePath: string, mimeType: string): Promise<string> {
    const headers = this.signedHeaders('PUT', filePath, file, { 'content-type': mimeType });
    const res = await fetch(this.endpoint(filePath), { method: 'PUT', headers, body: new Uint8Array(file) });
    if (!res.ok) throw new Error(`Error subiendo a S3: ${res.status} ${await res.text()}`);
    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const headers = this.signedHeaders('GET', filePath, '');
    const res = await fetch(this.endpoint(filePath), { method: 'GET', headers });
    if (!res.ok) throw new Error(`Error descargando de S3: ${res.status} ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(filePath: string): Promise<void> {
    const headers = this.signedHeaders('DELETE', filePath, '');
    const res = await fetch(this.endpoint(filePath), { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`Error eliminando de S3: ${res.status} ${await res.text()}`);
  }

  getUrl(filePath: string): string {
    return this.endpoint(filePath);
  }
}
