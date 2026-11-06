import type { HoursJson } from '@eve/shared-types';

export type SignalKind = 'happy' | 'closing' | 'music' | 'walkin' | 'always';
export type SortMode = 'smart' | 'nearest' | 'closing' | 'az';

export interface PlaceSignal {
  kind: SignalKind;
  label: string;
  urgent: boolean;
  eta?: string;
}

export interface HoursSummary {
  openNow: boolean | null;
  label: string | null;
}

/** One page of the detail hero gallery (from PlaceDetailResponse.photos). */
export interface PlacePhotoDisplay {
  /** Upload id, or 'google' for the single Google Places entry. */
  key: string;
  /** hero_url, falling back to the original url. */
  url: string;
  /** Upload credit or Google author; null when neither is set. */
  caption: string | null;
}

export interface PlaceV2Display {
  key: string;         // UUID from API (PlaceResponse.key)
  name: string;
  street: string | null;
  cross: string | null;
  hours: HoursSummary | null;
  hoursJson: HoursJson | null;
  vibe: string | null;
  /** Original upload (PlaceResponse.photo_url). */
  photo: string | null;
  /** List-row image: photo_thumb_url, falling back to photo_url. */
  photoThumb: string | null;
  /** Detail hero image: photo_hero_url, falling back to photo_url. */
  photoHero: string | null;
  photoCredit: string | null;
  /** Google photo author shown as "Photo: <name>" under the detail hero; null for admin uploads. */
  photoAttribution: string | null;
  /**
   * Every photo for the detail hero gallery. `null` when the response carried
   * no `photos` field (a list row, or a detail seeded from one and not yet
   * refetched); `[]` when the place has none.
   */
  photos: PlacePhotoDisplay[] | null;
  specials: string | null;
  notes: string | null;
  pitch: string | null;
  perfect: string | null;
  tags: string[];
  insider: string | null;
  crowd: string | null;
  distance: string | null;
  closesIn: string | null;
  signal: PlaceSignal | null;
  crowdLevel: string | null;
  priceTier: string | null;
  googlePriceLevel: number | null;
  phone: string | null;
  url: string | null;
  lat: number | null;
  lng: number | null;
}
