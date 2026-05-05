/** Google Places regularOpeningHours structure stored as JSONB */
export interface HoursJson {
  periods: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
  weekdayDescriptions: string[];
}

/** All EVE places are in Eastern Time */
export const EVE_TIMEZONE = 'America/New_York';

/**
 * Place as returned by the PostgreSQL driver — timestamps are Date objects.
 * Used internally by src/models/place.ts.
 *
 * lat and lng are present from Phase 1 (nullable). Phase 2 will populate them
 * via the geocoding backfill script and admin override UI.
 */
export interface Place {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  url: string | null;
  specials: string | null;
  categories: string | null;
  notes: string | null;
  tags: string[];
  lat?: number | null;
  lng?: number | null;
  created_at: Date;
  updated_at: Date;
  pitch?: string;
  perfect?: string;
  insider?: string;
  crowd?: string;
  vibe?: string;
  crowd_level?: string;
  price_tier?: string;
  cross_street?: string;
  photo_url?: string;
  photo_credit?: string;
  google_place_id?: string;
  hours_json?: HoursJson | null;
  google_price_level?: number;
  enrichment_status?: string;
  enriched_at?: Date;
}

/**
 * Place as serialised in API responses — timestamps are ISO 8601 strings.
 * Used by src/routes/api.ts and consumed by the mobile app.
 */
export interface PlaceResponse {
  key: string;
  name: string;
  address: string | null;
  phone: string | null;
  url: string | null;
  specials: string | null;
  categories: string | null;
  notes: string | null;
  tags: string[];
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  updated_at: string;
  pitch?: string | null;
  perfect?: string | null;
  insider?: string | null;
  crowd?: string | null;
  vibe?: string | null;
  crowd_level?: string | null;
  price_tier?: string | null;
  cross_street?: string | null;
  photo_url?: string | null;
  photo_credit?: string | null;
  google_place_id?: string | null;
  hours_json?: HoursJson | null;
  google_price_level?: number | null;
  enrichment_status?: string | null;
  enriched_at?: string | null;
}
