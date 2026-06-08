import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { putObject } from '@eve/storage';
import { adminErrorResponse, requireAdminRequest } from '../../../../lib/security';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

  const key = `${prefix}/${randomUUID()}.${ext}`;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await putObject(buf, { key, contentType: file.type });
    return NextResponse.json(result);
  } catch (err) {
    console.error('admin upload: storage write failed', err);
    return NextResponse.json({ error: 'Storage write failed' }, { status: 500 });
  }
}
