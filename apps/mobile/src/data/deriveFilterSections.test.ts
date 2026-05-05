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
});
