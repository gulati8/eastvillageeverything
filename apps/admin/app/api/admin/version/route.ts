import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { adminErrorResponse, requireAdminRequest } from '../../../../lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Identity of the running admin process. Created once when the module loads,
 * so every redeploy (a new container) answers with a new id and a tab opened
 * before the deploy can tell it is out of date. See `components/VersionWatch.tsx`.
 */
const VERSION_ID = randomUUID();

export async function GET(req: NextRequest) {
  try {
    await requireAdminRequest(req);
  } catch (err) {
    return adminErrorResponse(err) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ id: VERSION_ID }, { headers: { 'Cache-Control': 'no-store' } });
}
