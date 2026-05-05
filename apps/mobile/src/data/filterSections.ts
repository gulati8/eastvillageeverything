export interface FilterChip {
  value: string;
  label: string;
}

export interface FilterSection {
  key: string;
  title: string;
  chips: FilterChip[];
}

export const FILTER_SECTIONS: FilterSection[] = [
  {
    key: 'move',
    title: "What's the move",
    chips: [
      { value: 'happy',   label: 'Happy hour' },
      { value: 'music',   label: 'Live music' },
      { value: 'date',    label: 'Date night' },
      { value: 'closing', label: 'Closing soon' },
      { value: 'walkin',  label: 'Walk-ins' },
    ],
  },
  {
    key: 'type',
    title: 'Type',
    chips: [
      { value: 'cocktail', label: 'Cocktails' },
      { value: 'dive',     label: 'Dive' },
      { value: 'wine',     label: 'Wine' },
      { value: 'beer',     label: 'Beer' },
      { value: 'coffee',   label: 'Coffee' },
      { value: 'food',     label: 'Food' },
    ],
  },
  {
    key: 'when',
    title: 'When',
    chips: [
      { value: 'now',    label: 'Open now' },
      { value: 'late',   label: 'Open after 12' },
      { value: '24h',    label: '24 hours' },
      { value: 'brunch', label: 'Brunch' },
    ],
  },
  {
    key: 'price',
    title: 'Price',
    chips: [
      { value: '$',   label: '$ Cheap' },
      { value: '$$',  label: '$$ Mid' },
      { value: '$$$', label: '$$$ Splurge' },
    ],
  },
  {
    key: 'vibe',
    title: 'Vibe',
    chips: [
      { value: 'loud',  label: 'Loud' },
      { value: 'quiet', label: 'Quiet' },
      { value: 'cash',  label: 'Cash only' },
      { value: 'solo',  label: 'Good solo' },
      { value: 'group', label: 'Big group' },
    ],
  },
];
