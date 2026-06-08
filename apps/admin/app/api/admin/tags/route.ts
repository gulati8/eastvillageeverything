import { NextResponse, type NextRequest } from 'next/server';
import { TagModel } from '@eve/db';
import { adminErrorResponse, requireAdminRequest } from '../../../../lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireAdminRequest(req);
  } catch (err) {
    return adminErrorResponse(err) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await TagModel.findAll();
  return NextResponse.json(rows.map((t) => ({
    id: t.id, value: t.value, display: t.display, sort_order: t.sort_order,
  })));
}
