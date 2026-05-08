import { deriveFilterSections, filterSectionsForPlaces } from './deriveFilterSections';
import type { TagsStructuredResponse } from '@eve/shared-types';

describe('deriveFilterSections', () => {
  it('flattens standalone tags and parent children into one mobile tags section', () => {
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
      standalone: [
        { value: 'happy-hour', display: 'Happy Hour', order: '3' },
      ],
    };
    const out = deriveFilterSections(input);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      key: 'tags',
      title: 'Tags',
      chips: [
        { value: 'dive', label: 'Dive', sectionKey: 'tags' },
        { value: 'cocktail', label: 'Cocktail', sectionKey: 'tags' },
        { value: 'happy-hour', label: 'Happy Hour', sectionKey: 'tags' },
      ],
    });
  });

  it('returns empty array if there are no tags', () => {
    expect(deriveFilterSections({ parents: [], standalone: [] })).toEqual([]);
  });

  it('uses standalone tags when no parents are present', () => {
    const out = deriveFilterSections({
      parents: [],
      standalone: [{ value: 'orphan', display: 'Orphan', order: '1' }],
    });
    expect(out).toEqual([
      {
        key: 'tags',
        title: 'Tags',
        chips: [{ value: 'orphan', label: 'Orphan', sectionKey: 'tags' }],
      },
    ]);
  });

  it('sorts the flat section by server-supplied tag order', () => {
    const input: TagsStructuredResponse = {
      parents: [
        {
          value: 'parent',
          display: 'Parent',
          order: '1',
          children: [{ value: 'b', display: 'B', order: '2' }],
        },
      ],
      standalone: [{ value: 'a', display: 'A', order: '1' }],
    };
    const out = deriveFilterSections(input);
    expect(out[0].chips.map((chip) => chip.value)).toEqual(['a', 'b']);
  });

  it('returns empty array for a parent with no children and no standalone tags', () => {
    const out = deriveFilterSections({
      parents: [{ value: 'empty', display: 'Empty', order: '1', children: [] }],
      standalone: [],
    });
    expect(out).toEqual([]);
  });

  // The deployed server may temporarily return the old flat-array shape
  // ([{value,display,order}, …]) instead of {parents, standalone} if the
  // server-side structured handler hasn't shipped yet. Mobile must not
  // still produce the same flat mobile filter model.
  it('maps the legacy flat-array shape to the same tags section', () => {
    const legacy = [
      { value: 'monday', display: 'Monday', order: '1' },
      { value: 'tuesday', display: 'Tuesday', order: '2' },
    ] as unknown as TagsStructuredResponse;
    expect(deriveFilterSections(legacy)).toEqual([
      {
        key: 'tags',
        title: 'Tags',
        chips: [
          { value: 'monday', label: 'Monday', sectionKey: 'tags' },
          { value: 'tuesday', label: 'Tuesday', sectionKey: 'tags' },
        ],
      },
    ]);
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

describe('filterSectionsForPlaces', () => {
  it('keeps only chips that match actual place tags', () => {
    const sections = [
      {
        key: 'type',
        title: 'Type',
        chips: [
          { value: 'dive', label: 'Dive', sectionKey: 'type' },
          { value: 'cocktail', label: 'Cocktail', sectionKey: 'type' },
        ],
      },
      {
        key: 'stale',
        title: 'Stale',
        chips: [
          { value: 'unused', label: 'Unused', sectionKey: 'stale' },
        ],
      },
    ];

    expect(filterSectionsForPlaces(sections, [{ tags: ['dive'] }])).toEqual([
      {
        key: 'type',
        title: 'Type',
        chips: [
          { value: 'dive', label: 'Dive', sectionKey: 'type' },
        ],
      },
    ]);
  });
});
