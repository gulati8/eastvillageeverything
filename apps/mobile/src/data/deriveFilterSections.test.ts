import { deriveFilterSections } from './deriveFilterSections';
import type { TagsStructuredResponse } from '@eve/shared-types';

describe('deriveFilterSections', () => {
  it('maps each parent to a section with children as chips', () => {
    const input: TagsStructuredResponse = {
      parents: [
        {
          value: 'type',
          display: 'Type',
          order: '1',
          children: [
            { value: 'dive', display: 'Dive', order: '1' },
            { value: 'cocktail', display: 'Cocktail', order: '2' },
          ],
        },
      ],
      standalone: [],
    };
    const out = deriveFilterSections(input);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      key: 'type',
      title: 'Type',
      chips: [
        { value: 'dive', label: 'Dive', sectionKey: 'type' },
        { value: 'cocktail', label: 'Cocktail', sectionKey: 'type' },
      ],
    });
  });

  it('returns empty array if no parents', () => {
    expect(deriveFilterSections({ parents: [], standalone: [] })).toEqual([]);
  });

  it('drops standalone tags (not rendered in v1)', () => {
    const out = deriveFilterSections({
      parents: [],
      standalone: [{ value: 'orphan', display: 'Orphan', order: '1' }],
    });
    expect(out).toEqual([]);
  });

  it('preserves server-supplied order (does not re-sort)', () => {
    const input: TagsStructuredResponse = {
      parents: [
        { value: 'b', display: 'B', order: '2', children: [] },
        { value: 'a', display: 'A', order: '1', children: [] },
      ],
      standalone: [],
    };
    const out = deriveFilterSections(input);
    expect(out.map((s) => s.key)).toEqual(['b', 'a']);
  });

  it('produces empty chips for a parent with no children', () => {
    const out = deriveFilterSections({
      parents: [{ value: 'empty', display: 'Empty', order: '1', children: [] }],
      standalone: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].chips).toEqual([]);
  });

  // The deployed server may temporarily return the old flat-array shape
  // ([{value,display,order}, …]) instead of {parents, standalone} if the
  // server-side structured handler hasn't shipped yet. Mobile must not
  // crash in that window — return [] and let chips lie dormant until
  // the server is updated.
  it('returns [] when given the legacy flat-array shape (server not yet on structured)', () => {
    const legacy = [
      { value: 'monday', display: 'Monday', order: '1' },
      { value: 'tuesday', display: 'Tuesday', order: '2' },
    ] as unknown as TagsStructuredResponse;
    expect(deriveFilterSections(legacy)).toEqual([]);
  });

  it('returns [] for null / undefined / non-object input', () => {
    expect(deriveFilterSections(null as unknown as TagsStructuredResponse)).toEqual([]);
    expect(deriveFilterSections(undefined as unknown as TagsStructuredResponse)).toEqual([]);
    expect(deriveFilterSections('garbage' as unknown as TagsStructuredResponse)).toEqual([]);
  });

  it('returns [] when parents key is missing', () => {
    expect(deriveFilterSections({ standalone: [] } as unknown as TagsStructuredResponse)).toEqual([]);
  });
});
