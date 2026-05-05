export type CategoryKey = 'dive' | 'pub' | 'coffee' | 'diner' | 'punk' | 'cocktail';
export type SignalKind = 'happy' | 'closing' | 'music' | 'walkin' | 'always';
export type CrowdLevel = 'Quiet' | 'Light' | 'Steady' | 'Filling up' | 'Booked till 11';
export type PriceTier = '$' | '$$' | '$$$';
export type SortMode = 'smart' | 'nearest' | 'closing' | 'az';

export interface PlaceSignal {
  kind: SignalKind;
  label: string;
  urgent: boolean;
  eta?: string;
}

export interface PlaceV2Display {
  key: string;         // UUID from API (PlaceResponse.key)
  name: string;
  kind: string | null; // "Dive bar", "Irish pub", etc.
  category: CategoryKey;
  street: string | null;
  cross: string | null;
  hours: string | null;
  open: boolean | null;
  vibe: string | null;
  photo: string | null;
  photoCredit: string | null;
  pitch: string | null;
  perfect: string | null;
  tags: string[];
  insider: string | null;
  crowd: string | null;
  distance: string | null;
  closesIn: string | null;
  signal: PlaceSignal | null;
  crowdLevel: CrowdLevel | null;
  priceTier: PriceTier | null;
  phone: string | null;
  url: string | null;
  lat: number | null;
  lng: number | null;
}
