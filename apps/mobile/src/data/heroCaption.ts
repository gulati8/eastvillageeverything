import type { PlacePhotoDisplay } from './placeV2Display';

/**
 * Caption under the detail hero. Once the detail response has loaded
 * (`photos` is an array) the caption belongs to the page being shown; before
 * that the screen only has the list row's place-level attribution or credit.
 * An empty gallery has nothing to credit.
 */
export function heroCaption(
  photos: PlacePhotoDisplay[] | null,
  index: number,
  legacyAttribution: string | null,
  legacyCredit: string | null,
): string | null {
  if (photos === null) return legacyAttribution ?? legacyCredit ?? null;
  return photos[index]?.caption ?? null;
}
