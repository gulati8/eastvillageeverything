import { heroCaption } from './heroCaption';
import type { PlacePhotoDisplay } from './placeV2Display';

const photos: PlacePhotoDisplay[] = [
  { key: 'u1', url: 'https://img/1.hero.jpg', caption: 'Amit' },
  { key: 'u2', url: 'https://img/2.hero.jpg', caption: null },
  { key: 'google', url: 'https://img/g.jpg', caption: 'Jane Doe' },
];

describe('heroCaption', () => {
  it('uses the legacy attribution, then credit, while photos have not loaded', () => {
    expect(heroCaption(null, 0, 'Jane Doe', 'Amit')).toBe('Jane Doe');
    expect(heroCaption(null, 0, null, 'Amit')).toBe('Amit');
    expect(heroCaption(null, 0, null, null)).toBeNull();
  });

  it('ignores the index while photos have not loaded', () => {
    expect(heroCaption(null, 2, 'Jane Doe', null)).toBe('Jane Doe');
  });

  it('shows the caption of the current page once photos are loaded', () => {
    expect(heroCaption(photos, 0, 'Legacy', 'LegacyCredit')).toBe('Amit');
    expect(heroCaption(photos, 2, 'Legacy', 'LegacyCredit')).toBe('Jane Doe');
  });

  it('is null for a page without a caption, even when legacy values exist', () => {
    expect(heroCaption(photos, 1, 'Legacy', 'LegacyCredit')).toBeNull();
  });

  it('is null for an empty gallery and for an index past the end', () => {
    expect(heroCaption([], 0, 'Legacy', 'LegacyCredit')).toBeNull();
    expect(heroCaption(photos, 3, 'Legacy', 'LegacyCredit')).toBeNull();
  });
});
