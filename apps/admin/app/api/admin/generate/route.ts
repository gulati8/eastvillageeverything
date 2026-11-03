import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { NeighborhoodModel, PlaceModel, TagModel } from '@eve/db';
import { adminErrorResponse, requireAdminRequest } from '../../../../lib/security';
import { EDITORIAL_FIELDS, isEditorialField, type EditorialField, type EditorialPlace } from '../../../../lib/editorial';
import { EditorialRefusal, EditorialUnreadable, generateEditorial } from '../../../../lib/generate';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Text fields the page may send as its unsaved state; they win over the DB row. */
const FORM_KEYS = ['name', 'address', 'cross_street', 'url', 'specials', 'notes', ...EDITORIAL_FIELDS] as const;
type FormKey = (typeof FORM_KEYS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * POST `{ place_id, fields, form }` → `{ fields, searches, warnings }`.
 *
 * `fields` names the editorial fields to write (`pitch`, `perfect`, `insider`,
 * `vibe`, `crowd`); the response carries all five, `null` for the ones not
 * asked for. `form` is the page's unsaved text (name, address, cross street,
 * website, specials, notes and the five editorial fields) and overrides the
 * DB row for those keys; the row still supplies tags, neighborhood, hours and
 * price tier. Nothing is written: the page decides what to keep and Save
 * persists it.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminRequest(req, { mutation: true });
  } catch (err) {
    return adminErrorResponse(err) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }
  if (!isRecord(body)) return bad('Invalid JSON body.');

  const placeId = typeof body.place_id === 'string' ? body.place_id.trim() : '';
  if (!placeId) return bad('place_id is required.');
  if (!UUID_RE.test(placeId)) return bad('Invalid place_id.');

  const rawFields = body.fields;
  if (!Array.isArray(rawFields) || rawFields.length === 0) return bad('fields must name at least one editorial field.');
  const unknown = rawFields.find((f) => !isEditorialField(f));
  if (unknown !== undefined) return bad(`Unknown field: ${String(unknown).slice(0, 40)}`);
  const fields: EditorialField[] = EDITORIAL_FIELDS.filter((f) => rawFields.includes(f));

  const form = isRecord(body.form) ? body.form : {};

  const place = await PlaceModel.findById(placeId);
  if (!place) return bad('That place no longer exists.', 404);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return bad('Generate is not configured. Set ANTHROPIC_API_KEY.', 503);

  const [tags, neighborhood] = await Promise.all([
    TagModel.findAll(),
    place.neighborhood_id ? NeighborhoodModel.findById(place.neighborhood_id) : Promise.resolve(null),
  ]);
  const tagDisplay = new Map(tags.map((t) => [t.value, t.display]));

  // The page's text wins when it sent the key, even blank: a cleared field is
  // blank on the page, whatever the row still holds.
  const text = (key: FormKey, fromRow: string | null | undefined): string | null => {
    const sent = form[key];
    if (typeof sent === 'string') return sent.trim() || null;
    return fromRow?.trim() || null;
  };

  const context: EditorialPlace = {
    name: text('name', place.name) ?? place.name,
    address: text('address', place.address),
    cross_street: text('cross_street', place.cross_street),
    neighborhood: neighborhood?.display ?? null,
    url: text('url', place.url),
    tags: (place.tags ?? []).map((value) => tagDisplay.get(value) ?? value),
    hours: place.hours_json?.weekdayDescriptions ?? [],
    price_tier: place.price_tier ?? null,
    specials: text('specials', place.specials),
    notes: text('notes', place.notes),
    current: {
      pitch: text('pitch', place.pitch),
      perfect: text('perfect', place.perfect),
      insider: text('insider', place.insider),
      vibe: text('vibe', place.vibe),
      crowd: text('crowd', place.crowd),
    },
  };

  const started = Date.now();
  const tag = `admin generate place=${placeId} fields=${fields.join(',')}`;
  const client = new Anthropic({ apiKey });
  try {
    const result = await generateEditorial(client, context, fields);
    console.log(`${tag} searches=${result.searches} in=${result.input_tokens} out=${result.output_tokens} ms=${Date.now() - started}`);
    return NextResponse.json({ fields: result.fields, searches: result.searches, warnings: result.warnings });
  } catch (err) {
    const ms = Date.now() - started;
    if (err instanceof EditorialRefusal) {
      console.log(`${tag} refusal ms=${ms}`);
      return bad('Claude declined to write this one.', 422);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error(`${tag} auth error ms=${ms}`);
      return bad('The Anthropic key was rejected.', 503);
    }
    if (err instanceof Anthropic.RateLimitError) {
      console.error(`${tag} rate limited ms=${ms}`);
      return bad('Claude is busy. Try again in a minute.', 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`${tag} api error status=${err.status ?? 'none'} ms=${ms}`);
      return bad(err.message, 502);
    }
    if (err instanceof EditorialUnreadable) {
      console.error(`${tag} unreadable ms=${ms}`);
      return bad(err.message, 502);
    }
    console.error(`${tag} failed ms=${ms}`, err);
    return bad('Generate failed.', 500);
  }
}
