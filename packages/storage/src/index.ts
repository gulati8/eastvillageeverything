import { Disk } from 'flydrive';
import { FSDriver } from 'flydrive/drivers/fs';
import { S3Driver } from 'flydrive/drivers/s3';
import { S3Client } from '@aws-sdk/client-s3';
import * as path from 'node:path';
import type { PutObjectOptions, PutObjectResult } from './types.js';

export type { PutObjectOptions, PutObjectResult } from './types.js';

const backend = process.env.STORAGE_BACKEND ?? 'local';

let disk: Disk;
let urlFor: (key: string) => string;
let keyToFullKey: (key: string) => string;

if (backend === 'local') {
  const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? 'public/uploads');
  const urlPrefix = (process.env.STORAGE_LOCAL_URL_PREFIX ?? '/uploads').replace(/\/+$/, '');

  disk = new Disk(
    new FSDriver({
      location: localDir,
      visibility: 'public',
    })
  );

  urlFor = (key) => `${urlPrefix}/${key}`;
  keyToFullKey = (key) => key;
} else if (backend === 's3') {
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) throw new Error('STORAGE_S3_BUCKET is required when STORAGE_BACKEND=s3');

  const region = process.env.STORAGE_S3_REGION ?? 'us-east-1';
  const prefix = (process.env.STORAGE_S3_PREFIX ?? '').replace(/^\/+|\/+$/g, '');
  const urlPattern =
    process.env.STORAGE_S3_URL_PATTERN ??
    `https://${bucket}.s3.${region}.amazonaws.com/{key}`;

  const client = new S3Client({ region });
  disk = new Disk(
    new S3Driver({
      client,
      bucket,
      visibility: 'public',
    })
  );

  urlFor = (key) => urlPattern.replace('{key}', prefix ? `${prefix}/${key}` : key);
  keyToFullKey = (key) => (prefix ? `${prefix}/${key}` : key);
} else {
  throw new Error(
    `STORAGE_BACKEND must be 'local' or 's3' (got '${backend}'). Check your .env.`
  );
}

/**
 * Write a buffer to storage. Returns a public URL the browser can fetch.
 *
 * `key` is the relative path under the storage root (e.g. `tag/abc.jpg`).
 * For S3, `STORAGE_S3_PREFIX` is prepended automatically.
 */
export async function putObject(
  body: Buffer,
  options: PutObjectOptions
): Promise<PutObjectResult> {
  const { key, contentType } = options;
  if (key.startsWith('/')) {
    throw new Error(`Storage key must not start with '/' (got '${key}')`);
  }

  await disk.put(keyToFullKey(key), body, { contentType, visibility: 'public' });

  return {
    url: urlFor(key),
    key,
  };
}

export { disk };
