/**
 * PlaceRow — the italic line under the name shows `perfect` when written and
 * falls back to tag labels otherwise.
 *
 * Runs in the `node` jest environment with react-native, the child
 * components, haptics and the theme hook mocked so the row can be called as
 * a plain function and its element tree inspected.
 */

import React from 'react';

jest.mock('react-native', () => ({
  Pressable: (props: any) => React.createElement('Pressable', props),
  View: (props: any) => React.createElement('View', props),
  Text: (props: any) => React.createElement('Text', props),
  StyleSheet: { create: (s: any) => s, hairlineWidth: 1 },
}));

jest.mock('../PhotoFallback', () => ({
  PhotoFallback: (props: any) => React.createElement('PhotoFallback', props),
}));
jest.mock('../SignalPip', () => ({
  SignalPip: (props: any) => React.createElement('SignalPip', props),
}));
jest.mock('../../icons/BookmarkIcon', () => ({
  BookmarkIcon: (props: any) => React.createElement('BookmarkIcon', props),
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}), { virtual: true });

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    colors: { ink: '#INK', ink2: '#INK2', ink3: '#INK3', accent: '#ACCENT', line: '#LINE' },
    typography: {
      ui600: { fontFamily: 'Ui600' },
      body: { fontFamily: 'Body' },
      bodyItalic: { fontFamily: 'BodyItalic' },
    },
  }),
}));

import { PlaceRow } from '../PlaceRow';
import type { PlaceV2Display } from '../../data/placeV2Display';

type AnyEl = React.ReactElement<any>;

function basePlace(overrides: Partial<PlaceV2Display> = {}): PlaceV2Display {
  return {
    key: 'k1',
    name: 'Veselka',
    street: '144 2nd Ave',
    cross: null,
    hours: null,
    hoursJson: null,
    vibe: null,
    photo: null,
    photoThumb: null,
    photoHero: null,
    photoCredit: null,
    photoAttribution: null,
    specials: null,
    notes: null,
    pitch: null,
    perfect: null,
    tags: [],
    insider: null,
    crowd: null,
    distance: null,
    closesIn: null,
    signal: null,
    crowdLevel: null,
    priceTier: null,
    googlePriceLevel: null,
    phone: null,
    url: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

function render(place: PlaceV2Display): AnyEl {
  return PlaceRow({ place, onPress: () => undefined }) as AnyEl;
}

function childrenOf(el: AnyEl): AnyEl[] {
  const c = el.props?.children;
  return (Array.isArray(c) ? c : [c]).flat(Infinity).filter(Boolean) as AnyEl[];
}

function findByTestID(el: AnyEl | null, id: string): AnyEl | null {
  if (!el || typeof el !== 'object') return null;
  if (el.props?.testID === id) return el;
  for (const child of childrenOf(el)) {
    const hit = findByTestID(child, id);
    if (hit) return hit;
  }
  return null;
}

function textOf(el: AnyEl): string {
  return childrenOf(el).map((c) => (typeof c === 'object' ? textOf(c) : String(c))).join('');
}

function flatStyle(el: AnyEl): Record<string, unknown> {
  return Object.assign({}, ...([el.props.style] as unknown[]).flat(Infinity).filter(Boolean));
}

describe('PlaceRow italic line', () => {
  it('shows `perfect` on one line when it is set, even if tags exist', () => {
    const el = render(basePlace({ perfect: 'you want\n a quiet  drink', tags: ['dive-bar', 'late-night'] }));
    const line = findByTestID(el, 'row-italic-line')!;
    expect(line).not.toBeNull();
    expect(textOf(line)).toBe('you want a quiet drink');
    expect(line.props.numberOfLines).toBe(1);
    const style = flatStyle(line);
    expect(style.fontFamily).toBe('BodyItalic');
    expect(style.color).toBe('#INK2');
  });

  it('falls back to tag labels when `perfect` is null', () => {
    const el = render(basePlace({ perfect: null, tags: ['dive-bar', 'late-night'] }));
    expect(textOf(findByTestID(el, 'row-italic-line')!)).toBe('Dive Bar · Late Night');
  });

  it('renders no italic line when there is neither `perfect` nor tags', () => {
    const el = render(basePlace({ perfect: null, tags: [] }));
    expect(findByTestID(el, 'row-italic-line')).toBeNull();
  });
});
