/**
 * Reads the place form's text fields out of a FormData. No 'use server'
 * here and no Next or DB imports, so the server actions and a plain
 * `node --test` can both use it.
 *
 * Every text field comes back as a trimmed string, blank included: a blank
 * field means "clear this column", and `PlaceModel.update` turns `''` into
 * `NULL` through its `data.x || null`. Only `neighborhood_id` is `undefined`
 * when blank, because the column is NOT NULL and the model falls back to the
 * default neighborhood. Photos are not read here: `place_photos` is written
 * by `PlacePhotoModel` and mirrored into `places.photo_*`.
 */

export const PLACE_TEXT_FIELDS = [
  'address',
  'cross_street',
  'phone',
  'url',
  'specials',
  'notes',
  'pitch',
  'perfect',
  'insider',
  'crowd',
  'vibe',
] as const;

export type PlaceTextField = (typeof PLACE_TEXT_FIELDS)[number];

export type PlaceFormValues = Record<PlaceTextField, string> & {
  name: string;
  neighborhood_id: string | undefined;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function readPlaceForm(formData: FormData): PlaceFormValues {
  const values = {
    name: text(formData, 'name'),
    neighborhood_id: text(formData, 'neighborhood_id') || undefined,
  } as PlaceFormValues;
  for (const key of PLACE_TEXT_FIELDS) {
    values[key] = text(formData, key);
  }
  return values;
}
