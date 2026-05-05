import { transformPlace } from './transformPlace';
import type { PlaceResponse } from '@eve/shared-types';

describe('transformPlace', () => {
  const baseInput: PlaceResponse = {
    key: 'k1',
    name: 'Test Bar',
    address: '123 Main St',
    phone: '5551234567',
    url: 'https://example.com',
    specials: null,
    categories: 'dive bar',
    notes: null,
    tags: ['dive', 'beer'],
    lat: 40.7,
    lng: -73.98,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    pitch: 'A real dive.',
    crowd_level: 'Steady',
    price_tier: '$',
    photo_url: 'https://img.example.com/a.jpg',
    photo_credit: 'Photographer',
    cross_street: 'between 1st and 2nd',
    vibe: 'gritty',
    perfect: null,
    insider: null,
    crowd: null,
    hours_json: null,
  };

  it('plumbs server fields instead of nulling them', () => {
    const out = transformPlace(baseInput);
    expect(out.pitch).toBe('A real dive.');
    expect(out.priceTier).toBe('$');
    expect(out.crowdLevel).toBe('Steady');
    expect(out.photo).toBe('https://img.example.com/a.jpg');
    expect(out.photoCredit).toBe('Photographer');
    expect(out.cross).toBe('between 1st and 2nd');
    expect(out.vibe).toBe('gritty');
  });

  it('handles nulls without throwing', () => {
    const out = transformPlace({
      ...baseInput,
      pitch: null,
      price_tier: null,
      photo_url: null,
      cross_street: null,
      crowd_level: null,
    });
    expect(out.pitch).toBeNull();
    expect(out.priceTier).toBeNull();
    expect(out.photo).toBeNull();
    expect(out.cross).toBeNull();
    expect(out.crowdLevel).toBeNull();
  });

  it('coerces invalid crowd_level to null', () => {
    const out = transformPlace({ ...baseInput, crowd_level: 'unknown' });
    expect(out.crowdLevel).toBeNull();
  });

  it('coerces invalid price_tier to null', () => {
    const out = transformPlace({ ...baseInput, price_tier: '$$$$' });
    expect(out.priceTier).toBeNull();
  });

  it('passes through tags array', () => {
    const out = transformPlace(baseInput);
    expect(out.tags).toEqual(['dive', 'beer']);
  });

  it('extracts kind from first line of categories', () => {
    const out = transformPlace({ ...baseInput, categories: 'Cocktail bar\nLate night' });
    expect(out.kind).toBe('Cocktail bar');
  });

  it('returns null kind when categories is null', () => {
    const out = transformPlace({ ...baseInput, categories: null });
    expect(out.kind).toBeNull();
  });
});
