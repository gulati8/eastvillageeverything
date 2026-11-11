/**
 * Neighborhood helpers: which neighborhood is selected, how the list is
 * narrowed, the switcher's pills, and the strings built from a place's
 * neighborhood (row street line, Maps query).
 */

import type { NeighborhoodSummary } from '@eve/shared-types';
import type { PlaceV2Display } from './placeV2Display';
import {
  ALL_NEIGHBORHOODS,
  filterByNeighborhood,
  mapsQueryText,
  neighborhoodPills,
  neighborhoodTitle,
  resolveNeighborhood,
  streetWithNeighborhood,
} from './neighborhoods';

const ALPHABET: NeighborhoodSummary = {
  id: 'n1', value: 'alphabet-city', display: 'Alphabet City', is_default: true, order: '0',
};
const LES: NeighborhoodSummary = {
  id: 'n2', value: 'lower-east-side', display: 'Lower East Side', is_default: false, order: '10',
};
const NOLITA: NeighborhoodSummary = {
  id: 'n3', value: 'nolita', display: 'Nolita', is_default: false, order: '20',
};
const HOODS = [ALPHABET, LES, NOLITA];

function place(
  name: string,
  hood: NeighborhoodSummary | null,
  street: string | null = '1 Test St',
): PlaceV2Display {
  return {
    key: name,
    name,
    street,
    neighborhood: hood ? { value: hood.value, display: hood.display } : null,
    tags: [],
  } as unknown as PlaceV2Display;
}

const PLACES = [
  place('Ace', ALPHABET),
  place('Bob', ALPHABET),
  place('Chloe', LES),
  place('Stray', null),
];

describe('resolveNeighborhood', () => {
  it('uses the default row when nothing is stored', () => {
    expect(resolveNeighborhood(null, HOODS)).toBe('alphabet-city');
  });

  it('keeps a stored neighborhood that still exists', () => {
    expect(resolveNeighborhood('lower-east-side', HOODS)).toBe('lower-east-side');
  });

  it("keeps a stored 'all'", () => {
    expect(resolveNeighborhood(ALL_NEIGHBORHOODS, HOODS)).toBe(ALL_NEIGHBORHOODS);
  });

  it('falls back to the default when the stored slug no longer exists', () => {
    expect(resolveNeighborhood('renamed-away', HOODS)).toBe('alphabet-city');
  });

  it('falls back to the first row when none is marked default', () => {
    expect(resolveNeighborhood(null, [LES, NOLITA])).toBe('lower-east-side');
  });

  it("is 'all' when there are no neighborhoods at all", () => {
    expect(resolveNeighborhood(null, [])).toBe(ALL_NEIGHBORHOODS);
  });

  it('trusts the stored choice, and is unknown without one, before the neighborhoods load', () => {
    expect(resolveNeighborhood('lower-east-side', undefined)).toBe('lower-east-side');
    expect(resolveNeighborhood(null, undefined)).toBeNull();
  });
});

describe('filterByNeighborhood', () => {
  it('keeps only the selected neighborhood when no search is typed', () => {
    expect(filterByNeighborhood(PLACES, 'lower-east-side', '').map((p) => p.name)).toEqual(['Chloe']);
    expect(filterByNeighborhood(PLACES, 'alphabet-city', '   ').map((p) => p.name)).toEqual(['Ace', 'Bob']);
  });

  it("returns every place for 'all'", () => {
    expect(filterByNeighborhood(PLACES, ALL_NEIGHBORHOODS, '')).toBe(PLACES);
  });

  it('returns every place while a search is typed, whatever is selected', () => {
    expect(filterByNeighborhood(PLACES, 'lower-east-side', 'a')).toBe(PLACES);
  });

  it('returns nothing for a neighborhood with no places', () => {
    expect(filterByNeighborhood(PLACES, 'nolita', '')).toEqual([]);
  });
});

describe('neighborhoodPills', () => {
  it('lists neighborhoods in API order with counts from the list, All last', () => {
    expect(neighborhoodPills(HOODS, PLACES, 'alphabet-city')).toEqual([
      { value: 'alphabet-city', label: 'Alphabet City', count: 2 },
      { value: 'lower-east-side', label: 'Lower East Side', count: 1 },
      { value: ALL_NEIGHBORHOODS, label: 'All', count: 4 },
    ]);
  });

  it('keeps an empty neighborhood only while it is the selected one', () => {
    const values = neighborhoodPills(HOODS, PLACES, 'nolita').map((p) => p.value);
    expect(values).toEqual(['alphabet-city', 'lower-east-side', 'nolita', ALL_NEIGHBORHOODS]);
  });

  it('is just All when the neighborhoods have not loaded', () => {
    expect(neighborhoodPills([], PLACES, ALL_NEIGHBORHOODS)).toEqual([
      { value: ALL_NEIGHBORHOODS, label: 'All', count: 4 },
    ]);
  });
});

describe('neighborhoodTitle', () => {
  it('is the display name of the selected neighborhood', () => {
    expect(neighborhoodTitle('lower-east-side', HOODS, PLACES)).toBe('Lower East Side');
  });

  it("names the 'all' selection", () => {
    expect(neighborhoodTitle(ALL_NEIGHBORHOODS, HOODS, PLACES)).toBe('All neighborhoods');
  });

  it('reads the name off a place when the neighborhoods have not loaded', () => {
    expect(neighborhoodTitle('lower-east-side', undefined, PLACES)).toBe('Lower East Side');
  });

  it('is null while the selection or its name is unknown', () => {
    expect(neighborhoodTitle(null, HOODS, PLACES)).toBeNull();
    expect(neighborhoodTitle('nolita', undefined, PLACES)).toBeNull();
  });
});

describe('streetWithNeighborhood', () => {
  it('joins the street and the neighborhood with a middle dot', () => {
    expect(streetWithNeighborhood(place('Chloe', LES, '81 Ludlow St'))).toBe('81 Ludlow St · Lower East Side');
  });

  it('gives whichever part exists', () => {
    expect(streetWithNeighborhood(place('Chloe', null, '81 Ludlow St'))).toBe('81 Ludlow St');
    expect(streetWithNeighborhood(place('Chloe', LES, null))).toBe('Lower East Side');
    expect(streetWithNeighborhood(place('Chloe', null, null))).toBeNull();
  });
});

describe('mapsQueryText', () => {
  it("uses the place's own neighborhood for a Lower East Side place", () => {
    const text = mapsQueryText(place('Chloe 81', LES, '81 Ludlow St'));
    expect(text).toBe('Chloe 81, 81 Ludlow St, Lower East Side, New York, NY');
    expect(encodeURIComponent(text)).toBe(
      'Chloe%2081%2C%2081%20Ludlow%20St%2C%20Lower%20East%20Side%2C%20New%20York%2C%20NY',
    );
  });

  it('leaves the street out when there is none', () => {
    expect(mapsQueryText(place('The Stone', LES, null))).toBe('The Stone, Lower East Side, New York, NY');
  });

  it("falls back to 'New York' without a neighborhood", () => {
    expect(mapsQueryText(place('Stray', null, '1 Test St'))).toBe('Stray, 1 Test St, New York, New York, NY');
  });
});
