import { rowItalicLine } from '../rowItalicLine';

describe('rowItalicLine', () => {
  it('prefers `perfect` over tag labels', () => {
    expect(
      rowItalicLine({ perfect: 'you want a quiet drink before dinner', tags: ['dive-bar', 'late-night'] }),
    ).toBe('you want a quiet drink before dinner');
  });

  it('collapses `perfect` to a single line', () => {
    expect(rowItalicLine({ perfect: '  the rain\n  will not stop  ', tags: [] })).toBe(
      'the rain will not stop',
    );
  });

  it('falls back to the first three tag labels when `perfect` is null', () => {
    expect(rowItalicLine({ perfect: null, tags: ['dive-bar', 'late-night', 'live_music', 'cash-only'] })).toBe(
      'Dive Bar · Late Night · Live Music',
    );
  });

  it('treats a blank `perfect` as missing', () => {
    expect(rowItalicLine({ perfect: '   ', tags: ['dive-bar'] })).toBe('Dive Bar');
  });

  it('returns null only when there is neither `perfect` nor any tag', () => {
    expect(rowItalicLine({ perfect: null, tags: [] })).toBeNull();
    expect(rowItalicLine({ perfect: undefined as unknown as null, tags: [] })).toBeNull();
  });
});
