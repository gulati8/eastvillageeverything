/**
 * EditorialCopy — the pitch / "Perfect when" / "The move" / "Who's there"
 * block on the detail screen. Each section renders only when its field is
 * set; the block renders nothing at all when all four are blank.
 *
 * Runs in the `node` jest environment; react-native and the theme hook are
 * mocked so the component can be called as a plain function and the returned
 * element tree inspected (same approach as PhotoAttribution.test.ts).
 */

import React from 'react';

jest.mock('react-native', () => ({
  StyleSheet: { create: (s: any) => s },
  Text: (props: any) => React.createElement('Text', props),
  View: (props: any) => React.createElement('View', props),
}));

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      ink: '#INK',
      ink2: '#INK2',
      ink3: '#INK3',
      paper2: '#PAPER2',
      accent: '#ACCENT',
    },
    typography: {
      body: { fontFamily: 'Body' },
      displayItalic: { fontFamily: 'DisplayItalic' },
      ui600: { fontFamily: 'Ui600' },
      ui700: { fontFamily: 'Ui700' },
    },
    radii: { md: 14 },
  }),
}));

import { EditorialCopy } from '../EditorialCopy';

type AnyEl = React.ReactElement<any>;

function render(props: Partial<React.ComponentProps<typeof EditorialCopy>> = {}): AnyEl | null {
  return EditorialCopy({ pitch: null, perfect: null, insider: null, crowd: null, ...props }) as AnyEl | null;
}

function childrenOf(el: AnyEl): AnyEl[] {
  const c = el.props.children;
  return (Array.isArray(c) ? c : [c]).flat(Infinity).filter(Boolean) as AnyEl[];
}

function sectionIds(el: AnyEl | null): string[] {
  if (!el) return [];
  return childrenOf(el).map((child) => child.props.testID);
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

function allText(el: AnyEl | string | null): string {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  return childrenOf(el).map((c) => allText(c as AnyEl | string)).join('');
}

function flatStyle(el: AnyEl): Record<string, unknown> {
  return Object.assign({}, ...([el.props.style] as unknown[]).flat(Infinity).filter(Boolean));
}

describe('EditorialCopy', () => {
  it('renders nothing when all four fields are null', () => {
    expect(render()).toBeNull();
  });

  it('renders nothing when all four fields are blank strings', () => {
    expect(render({ pitch: '', perfect: '  ', insider: '\n', crowd: undefined })).toBeNull();
  });

  it('renders only the pitch when only pitch is set', () => {
    const el = render({ pitch: 'A two-sentence pitch. Really.' });
    expect(sectionIds(el)).toEqual(['editorial-pitch']);
    const pitch = findByTestID(el, 'editorial-pitch')!;
    expect(allText(pitch)).toBe('A two-sentence pitch. Really.');
    const style = flatStyle(pitch);
    expect(style.fontSize).toBe(17);
    expect(style.color).toBe('#INK');
    expect(style.fontFamily).toBe('Body');
  });

  it('renders only the "Perfect when" card when only perfect is set', () => {
    const el = render({ perfect: 'you want a quiet drink' });
    expect(sectionIds(el)).toEqual(['editorial-perfect']);
    const card = findByTestID(el, 'editorial-perfect')!;
    const [label, text] = childrenOf(card);
    expect(allText(label)).toBe('PERFECT WHEN');
    expect(flatStyle(label).color).toBe('#ACCENT');
    expect(flatStyle(label).fontFamily).toBe('Ui600');
    expect(flatStyle(label).fontSize).toBe(11);
    expect(allText(text)).toBe('you want a quiet drink.');
    expect(flatStyle(text).fontFamily).toBe('DisplayItalic');
    expect(flatStyle(text).fontSize).toBe(22);
    expect(flatStyle(card).backgroundColor).toBe('#PAPER2');
    expect(flatStyle(card).borderRadius).toBe(14);
  });

  it('appends a period to perfect only when it has no end punctuation', () => {
    const plain = findByTestID(render({ perfect: 'you need a late bite' }), 'editorial-perfect')!;
    expect(allText(childrenOf(plain)[1])).toBe('you need a late bite.');

    const punctuated = findByTestID(render({ perfect: 'you need a late bite!' }), 'editorial-perfect')!;
    expect(allText(childrenOf(punctuated)[1])).toBe('you need a late bite!');

    const quoted = findByTestID(render({ perfect: 'someone says “one more.”' }), 'editorial-perfect')!;
    expect(allText(childrenOf(quoted)[1])).toBe('someone says “one more.”');
  });

  it('renders only "The move" when only insider is set', () => {
    const el = render({ insider: 'Sit at the bar.' });
    expect(sectionIds(el)).toEqual(['editorial-insider']);
    const [label, body] = childrenOf(findByTestID(el, 'editorial-insider')!);
    expect(allText(label)).toBe('THE MOVE');
    expect(flatStyle(label).color).toBe('#INK3');
    expect(flatStyle(label).fontFamily).toBe('Ui700');
    expect(allText(body)).toBe('Sit at the bar.');
    expect(flatStyle(body).fontSize).toBe(16);
    expect(flatStyle(body).color).toBe('#INK2');
    expect(flatStyle(body).fontFamily).toBe('Body');
  });

  it('renders only "Who\'s there" when only crowd is set', () => {
    const el = render({ crowd: 'Regulars and night-shift cooks' });
    expect(sectionIds(el)).toEqual(['editorial-crowd']);
    const [label, body] = childrenOf(findByTestID(el, 'editorial-crowd')!);
    expect(allText(label)).toBe("WHO'S THERE");
    expect(flatStyle(label).color).toBe('#INK3');
    expect(allText(body)).toBe('Regulars and night-shift cooks');
  });

  it('renders all four in spec order when all are set', () => {
    const el = render({ pitch: 'p', perfect: 'q', insider: 'r', crowd: 's' });
    expect(sectionIds(el)).toEqual([
      'editorial-pitch',
      'editorial-perfect',
      'editorial-insider',
      'editorial-crowd',
    ]);
  });

  it('skips a blank field in the middle without leaving a gap element', () => {
    const el = render({ pitch: 'p', perfect: '', insider: 'r', crowd: '   ' });
    expect(sectionIds(el)).toEqual(['editorial-pitch', 'editorial-insider']);
  });

  it('passes the container style through', () => {
    const el = render({ pitch: 'p', style: { marginBottom: 22 } })!;
    expect(flatStyle(el).marginBottom).toBe(22);
  });
});
