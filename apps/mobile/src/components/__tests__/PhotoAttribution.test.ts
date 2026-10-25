/**
 * PhotoAttribution — renders the "Photo: <name>" caption only when a
 * Google photo attribution is present.
 *
 * Runs in the `node` jest environment; react-native and the theme hook are
 * mocked so the component can be called as a plain function and its returned
 * React element inspected.
 */

import React from 'react';

jest.mock('react-native', () => ({
  StyleSheet: { create: (s: any) => s },
  Text: (props: any) => React.createElement('Text', props),
}));

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    colors: { ink3: '#888888' },
    typography: { ui500: { fontFamily: 'Test500' } },
  }),
}));

import { PhotoAttribution } from '../PhotoAttribution';

type Rendered = React.ReactElement<{
  children: unknown;
  style: unknown;
  accessibilityLabel: string;
}> | null;

function renderCaption(attribution: string | null | undefined): Rendered {
  return PhotoAttribution({ attribution }) as Rendered;
}

function textOf(el: NonNullable<Rendered>): string {
  const children = el.props.children;
  return Array.isArray(children) ? children.join('') : String(children);
}

describe('PhotoAttribution', () => {
  it('renders nothing when attribution is null', () => {
    expect(renderCaption(null)).toBeNull();
  });

  it('renders nothing when attribution is undefined', () => {
    expect(renderCaption(undefined)).toBeNull();
  });

  it('renders nothing when attribution is blank', () => {
    expect(renderCaption('')).toBeNull();
    expect(renderCaption('   ')).toBeNull();
  });

  it('renders a "Photo: <name>" caption when attribution is set', () => {
    const el = renderCaption('Jane Doe');
    expect(el).not.toBeNull();
    expect(textOf(el!)).toBe('Photo: Jane Doe');
    expect(el!.props.accessibilityLabel).toBe('Photo by Jane Doe');
  });

  it('trims surrounding whitespace from the name', () => {
    const el = renderCaption('  Sam Lee ');
    expect(textOf(el!)).toBe('Photo: Sam Lee');
  });

  it('uses the muted ink3 colour and ui500 face', () => {
    const el = renderCaption('Jane Doe');
    const flat = Object.assign({}, ...([el!.props.style] as unknown[]).flat(Infinity).filter(Boolean));
    expect(flat.color).toBe('#888888');
    expect(flat.fontFamily).toBe('Test500');
  });
});
