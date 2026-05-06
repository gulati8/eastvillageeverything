import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PutObjectOptions, PutObjectResult } from './types.js';

export type { PutObjectOptions, PutObjectResult } from './types.js';

const backend = process.env.STORAGE_BACKEND ?? 'local';

if (backend !== 'local' && backend !== 's3') {
  throw new Error(
    `STORAGE_BACKEND must be 'local' or 's3' (got '${backend}'). Check your .env.`
  );
}

/**
 * Write a buffer to storage. Returns a public URL the browser can fetch.
 */
export async function putObject(
  body: Buffer,
  options: PutObjectOptions
): Promise<PutObjectResult> {
  const { key, contentType } = options;
  if (key.startsWith('/')) {
    throw new Error(`Storage key must not start with '/' (got '${key}')`);
  }

  if (backend === 'local') {
    const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? 'public/uploads');
    const urlPrefix = (process.env.STORAGE_LOCAL_URL_PREFIX ?? '/uploads').replace(/\/+$/, '');
    const dest = path.join(localDir, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return { url: `${urlPrefix}/${key}`, key };
  }

  // S3 backend — lazy-load flydrive and @aws-sdk to avoid ESM issues when backend is local
  const { Disk } = await import('flydrive');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { S3Driver } = require('flydrive/drivers/s3') as { S3Driver: any };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { S3Client } = require('@aws-sdk/client-s3') as { S3Client: any };

  const bucket = process.env.STORAGE_S3_BUCKET;
  const region = process.env.STORAGE_S3_REGION ?? 'us-east-1';
  const prefix = (process.env.STORAGE_S3_PREFIX ?? '').replace(/^\/+|\/+$/g, '');
  const urlPattern =
    process.env.STORAGE_S3_URL_PATTERN ??
    `https://${bucket}.s3.${region}.amazonaws.com/{key}`;

  if (!bucket) throw new Error('STORAGE_S3_BUCKET is required when STORAGE_BACKEND=s3');

  const client = new S3Client({ region });
  const disk = new Disk(
    new S3Driver({
      client,
      bucket,
      visibility: 'public',
      urlBuilder: {
        async generateURL(k: string) {
          return urlPattern.replace('{key}', k);
        },
      },
    })
  );

  const fullKey = prefix ? `${prefix}/${key}` : key;
  await disk.put(fullKey, body, { contentType, visibility: 'public' });

  const urlFor = (k: string) => urlPattern.replace('{key}', prefix ? `${prefix}/${k}` : k);
  return { url: urlFor(key), key };
}
