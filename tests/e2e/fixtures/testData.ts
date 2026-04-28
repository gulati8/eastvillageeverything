/**
 * Realistic test data factories.
 * Using plausible names, addresses, and values to surface real rendering issues.
 */

export const places = {
  happyHourBar: {
    name: "McSorley's Old Ale House",
    address: '15 E 7th St, New York, NY 10003',
    phone: '2124748307',
    url: 'https://mcsorleysoldalehouse.nyc',
    specials: 'Mon–Fri 5–7pm: $4 drafts, $6 house wine',
    categories: 'Bar, Pub',
    notes: 'Cash only. Oldest continuously operating bar in NYC.',
  },
  restaurant: {
    name: "Veselka",
    address: '144 2nd Ave, New York, NY 10003',
    phone: '2122289682',
    url: 'https://veselka.com',
    specials: 'Happy Hour Mon–Fri 3–6pm',
    categories: 'Ukrainian Diner',
    notes: "Open 24 hours. Don't miss the borscht.",
  },
  minimalPlace: {
    name: "Tompkins Square Bagels",
    address: '',
    phone: '',
    url: '',
    specials: '',
    categories: '',
    notes: '',
  },
  specialChars: {
    name: "O'Hanlon's Bar & Grill",
    address: "St. Mark's Place & 2nd Ave",
    phone: '2125551234',
    url: 'https://example.com',
    specials: "Tues: 2-for-1 apps — chef's choice",
    categories: "Bar & Grill",
    notes: 'Patio seating. Kid-friendly until 9pm.',
  },
} as const;

export const tags = {
  happyHour: {
    value: 'happy-hour',
    display: 'Happy Hour',
    sort_order: '1',
  },
  bar: {
    value: 'bar',
    display: 'Bar',
    sort_order: '2',
  },
  restaurant: {
    value: 'restaurant',
    display: 'Restaurant',
    sort_order: '3',
  },
  childTag: {
    value: 'beer-special',
    display: 'Beer Special',
    sort_order: '10',
  },
} as const;

export const invalidTagValues = [
  'Has Spaces',
  'UPPERCASE',
  'special!chars',
  'underscore_value',
];
