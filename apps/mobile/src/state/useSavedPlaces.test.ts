import { parseSavedPlaceKeys } from './useSavedPlaces';

describe('parseSavedPlaceKeys', () => {
  it('returns unique string keys in storage order', () => {
    expect(parseSavedPlaceKeys(JSON.stringify(['a', 'b', 'a']))).toEqual(['a', 'b']);
  });

  it('ignores invalid saved key payloads', () => {
    expect(parseSavedPlaceKeys(null)).toEqual([]);
    expect(parseSavedPlaceKeys('not json')).toEqual([]);
    expect(parseSavedPlaceKeys(JSON.stringify({ a: true }))).toEqual([]);
  });

  it('filters non-string and empty values', () => {
    expect(parseSavedPlaceKeys(JSON.stringify(['a', '', 12, null, 'b']))).toEqual(['a', 'b']);
  });
});
