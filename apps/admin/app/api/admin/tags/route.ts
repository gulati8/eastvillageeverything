import { NextResponse } from 'next/server';
import { TagModel } from '@eve/db';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await TagModel.findAll();
  return NextResponse.json(rows.map((t) => ({
    id: t.id, value: t.value, display: t.display, sort_order: t.sort_order,
  })));
}
