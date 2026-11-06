/**
 * Pure helpers behind the admin "Generate editorial" route: the field list,
 * the prompt, the output schema and the wording checks. No SDK import, so
 * `node --test lib/editorial.test.mjs` runs this file directly. The call to
 * Claude lives in `lib/generate.ts`.
 *
 * The voice rules and the checks mirror `scripts/ralph/editorial-append.mjs`,
 * which validated the launch batch of copy.
 */

export const EDITORIAL_FIELDS = ['pitch', 'perfect', 'insider', 'vibe', 'crowd'] as const;
export type EditorialField = (typeof EDITORIAL_FIELDS)[number];
export type EditorialFields = Record<EditorialField, string | null>;

export function isEditorialField(value: unknown): value is EditorialField {
  return typeof value === 'string' && (EDITORIAL_FIELDS as readonly string[]).includes(value);
}

/** What the model is told about a place: the DB row with the unsaved form on top. */
export interface EditorialPlace {
  name: string;
  address?: string | null;
  cross_street?: string | null;
  neighborhood?: string | null;
  url?: string | null;
  /** Tag display names in mobile order. */
  tags?: string[];
  /** Weekday hours lines from `hours_json.weekdayDescriptions`. */
  hours?: string[];
  price_tier?: string | null;
  specials?: string | null;
  notes?: string | null;
  /** The editorial fields as they read on the form right now. */
  current?: Partial<Record<EditorialField, string | null | undefined>>;
}

/** Structured-output schema: the five fields, each a string or null. */
export const EDITORIAL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    pitch: { type: ['string', 'null'], description: 'Two sentences in a friend\'s voice about why you would go.' },
    perfect: { type: ['string', 'null'], description: 'Completes "Perfect when…" in under 12 words, without the prefix.' },
    insider: { type: ['string', 'null'], description: 'One concrete sentence a source actually mentioned.' },
    vibe: { type: ['string', 'null'], description: 'Three words joined by " · ".' },
    crowd: { type: ['string', 'null'], description: 'One short phrase about who is there.' },
  },
  required: [...EDITORIAL_FIELDS],
  additionalProperties: false,
} as const;

export const EDITORIAL_SYSTEM_PROMPT = `You write short editorial copy for East Village Everything, a guide to the bars and restaurants of the East Village and nearby neighborhoods in Manhattan. Each place has five editorial fields. You will be told which ones to write.

How to work
- Search the web for the place by name and address. Prefer write-ups and reviews from the last two years and weigh the newest most. Ground everything in what those sources actually praise or warn about.
- Never quote a source verbatim. Never mention Google, Yelp, reviews, reviewers, stars or ratings. Never use "hidden gem", "nestled", "vibrant" or "elevated". No exclamation marks.
- Use the hours and price tier you are given when they help.
- If you find nothing specific about this place, write short neutral copy for pitch and vibe from what you were given, and return null for insider, perfect and crowd. Never invent dishes, prices, policies or people.
- Write only the fields asked for. Return null for every other field. When current copy for other fields is given, keep the new fields consistent with it.

The fields
- pitch: exactly two sentences, in the voice of a friend telling you why you would go.
- perfect: completes the phrase "Perfect when…" in under 12 words. Do not write the words "Perfect when"; give only what follows them, for example "you want a quiet drink before a show".
- insider: one concrete sentence about something a source actually mentioned: a dish, a seat, a time of day, a door policy, a card-only note.
- vibe: exactly three words joined by " · ", for example "dim · loud · leather".
- crowd: one short phrase about who is there, for example "neighborhood regulars and second dates".

Return only the JSON object.`;

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The system prompt and the user message for one generate call. `fields` are
 * the ones to write; the current text of every other field is passed along so
 * a redo of one field stays consistent with the rest.
 */
export function buildEditorialPrompt({ place, fields }: { place: EditorialPlace; fields: readonly EditorialField[] }): { system: string; user: string } {
  const lines: string[] = [`Place: ${clean(place.name) || 'Unnamed place'}`];
  const add = (label: string, value: string | null | undefined) => {
    const v = clean(value);
    if (v) lines.push(`${label}: ${v}`);
  };
  add('Address', place.address);
  add('Cross street', place.cross_street);
  add('Neighborhood', place.neighborhood);
  add('Website', place.url);
  const tags = (place.tags ?? []).map(clean).filter(Boolean);
  if (tags.length) lines.push(`Tags: ${tags.join(', ')}`);
  add('Price tier', place.price_tier);
  const hours = (place.hours ?? []).map(clean).filter(Boolean);
  if (hours.length) {
    lines.push('Hours:');
    for (const h of hours) lines.push(`  ${h}`);
  }
  add('Specials', place.specials);
  add('Notes', place.notes);

  const wanted = EDITORIAL_FIELDS.filter((f) => fields.includes(f));
  const rest = EDITORIAL_FIELDS.filter((f) => !fields.includes(f));
  const kept = rest.filter((f) => clean(place.current?.[f]));
  if (kept.length) {
    lines.push('');
    lines.push('Current copy for the other fields (keep the new fields consistent with these):');
    for (const f of kept) lines.push(`  ${f}: ${clean(place.current?.[f])}`);
  }

  lines.push('');
  lines.push(`Write these fields: ${wanted.join(', ')}.`);
  if (rest.length) lines.push(`Return null for: ${rest.join(', ')}.`);

  return { system: EDITORIAL_SYSTEM_PROMPT, user: lines.join('\n') };
}

const BANNED = /\b(hidden gem|nestled|vibrant|elevated|google|yelp|reviews?|reviewers?|stars?|ratings?)\b/i;

/** Same split rule as `scripts/ralph/editorial-append.mjs`. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\b(a\.m|p\.m|St|Ave|Mt|Dr)\./g, '$1')
    .split(/[.?]\s+|[.?]$/)
    .filter((s) => s.trim());
}

export interface EditorialViolation {
  field: EditorialField;
  message: string;
}

/** Every rule the copy breaks, per field. Null and blank fields are skipped. */
export function editorialViolations(fields: Partial<Record<EditorialField, string | null | undefined>>): EditorialViolation[] {
  const out: EditorialViolation[] = [];
  for (const field of EDITORIAL_FIELDS) {
    const value = clean(fields[field]);
    if (!value) continue;
    if (value.includes('!')) out.push({ field, message: 'has an exclamation mark' });
    const banned = value.match(BANNED);
    if (banned) out.push({ field, message: `uses the banned word "${banned[0]}"` });
  }

  const perfect = clean(fields.perfect);
  if (perfect) {
    const words = perfect.split(/\s+/).length;
    if (words >= 12) out.push({ field: 'perfect', message: `is ${words} words (must be under 12)` });
    if (/^perfect when\b/i.test(perfect)) out.push({ field: 'perfect', message: 'starts with "Perfect when" (write only what follows)' });
  }

  const pitch = clean(fields.pitch);
  if (pitch) {
    const n = splitSentences(pitch).length;
    if (n !== 2) out.push({ field: 'pitch', message: `has ${n} sentence${n === 1 ? '' : 's'} (must be exactly 2)` });
  }

  const vibe = clean(fields.vibe);
  if (vibe) {
    const parts = vibe.split(' · ').map((p) => p.trim());
    if (parts.length !== 3 || parts.some((p) => !p)) {
      out.push({ field: 'vibe', message: `has ${parts.filter(Boolean).length} part${parts.filter(Boolean).length === 1 ? '' : 's'} (must be 3 words joined by " · ")` });
    }
  }

  return out;
}

/** The violations as one line each, `<field>: <message>`. */
export function validateEditorial(fields: Partial<Record<EditorialField, string | null | undefined>>): string[] {
  return editorialViolations(fields).map((v) => `${v.field}: ${v.message}`);
}

/**
 * Turns the model's parsed JSON into the five fields: strings are trimmed,
 * blanks and non-strings become null, extra keys are dropped. Throws when the
 * value is not an object at all.
 */
export function normalizeEditorialOutput(raw: unknown): EditorialFields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Editorial output is not an object');
  }
  const record = raw as Record<string, unknown>;
  const out = {} as EditorialFields;
  for (const field of EDITORIAL_FIELDS) {
    const value = record[field];
    out[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return out;
}

/** Keeps the requested fields and nulls the rest. */
export function pickEditorialFields(all: EditorialFields, fields: readonly EditorialField[]): EditorialFields {
  const out = {} as EditorialFields;
  for (const field of EDITORIAL_FIELDS) {
    out[field] = fields.includes(field) ? all[field] : null;
  }
  return out;
}
