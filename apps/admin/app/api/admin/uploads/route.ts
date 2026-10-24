import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { putObject } from '@eve/storage';
import { adminErrorResponse, requireAdminRequest } from '../../../../lib/security';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Derived sizes written alongside every upload. The mobile list rows load
 * `thumb`, the detail screen loads `hero`; the original stays untouched.
 * Width-constrained, never enlarged, EXIF orientation applied, transparency
 * flattened to white because the output is always JPEG.
 */
const VARIANTS = [
  { suffix: 'thumb', width: 400, quality: 80 },
  { suffix: 'hero', width: 1200, quality: 85 },
] as const;

async function makeVariant(src: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(src, { animated: false })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminRequest(req, { mutation: true });
  } catch (err) {
    return adminErrorResponse(err) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = fd.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded under field "file"' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB).' }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported MIME type: ${file.type}` }, { status: 415 });
  }

  const prefixRaw = String(fd.get('prefix') ?? 'misc');
  const prefix = prefixRaw.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 16) || 'misc';

  const ext = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
    : (file.type.split('/')[1] ?? 'bin');

  const id = randomUUID();
  const key = `${prefix}/${id}.${ext}`;
  const thumbKey = `${prefix}/${id}.thumb.jpg`;
  const heroKey = `${prefix}/${id}.hero.jpg`;

  const buf = Buffer.from(await file.arrayBuffer());

  let thumb: Buffer;
  let hero: Buffer;
  try {
    [thumb, hero] = await Promise.all(
      VARIANTS.map((v) => makeVariant(buf, v.width, v.quality))
    );
  } catch (err) {
    console.error('admin upload: image decode/resize failed', err);
    return NextResponse.json({ error: 'Could not read that image file.' }, { status: 422 });
  }

  try {
    const [original, thumbResult, heroResult] = await Promise.all([
      putObject(buf, { key, contentType: file.type }),
      putObject(thumb, { key: thumbKey, contentType: 'image/jpeg' }),
      putObject(hero, { key: heroKey, contentType: 'image/jpeg' }),
    ]);
    return NextResponse.json({
      url: original.url,
      key: original.key,
      thumb_url: thumbResult.url,
      thumb_key: thumbResult.key,
      hero_url: heroResult.url,
      hero_key: heroResult.key,
    });
  } catch (err) {
    console.error('admin upload: storage write failed', err);
    return NextResponse.json({ error: 'Storage write failed' }, { status: 500 });
  }
}
