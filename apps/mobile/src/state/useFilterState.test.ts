import { matchesChipPure } from './useFilterState';
import type { PlaceV2Display } from '../data/placeV2Display';

const place = (tags: string[]): PlaceV2Display => ({
  key: 'k',
  name: 'X',
  kind: null,
  category: 'dive',
  street: null,
  cross: null,
  hours: null,
  open: null,
  vibe: null,
  photo: null,
  photoCredit: null,
  pitch: null,
  perfect: null,
  tags,
  insider: null,
  crowd: null,
  distance: null,
  closesIn: null,
  signal: null,
  crowdLevel: null,
  priceTier: null,
  phone: null,
  url: null,
  lat: null,
  lng: null,
});

describe('matchesChipPure', () => {
  it('matches when tag value is in place.tags', () => {
    expect(matchesChipPure(place(['dive', 'beer']), 'dive')).toBe(true);
  });

  it('does not match when tag is absent', () => {
    expect(matchesChipPure(place(['cocktail']), 'dive')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(matchesChipPure(place(['Dive']), 'dive')).toBe(false);
  });

  it('does not substring-match', () => {
    expect(matchesChipPure(place(['happy-hour']), 'happy')).toBe(false);
  });

  it('returns false for empty tags', () => {
    expect(matchesChipPure(place([]), 'dive')).toBe(false);
  });
});
