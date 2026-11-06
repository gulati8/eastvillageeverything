/**
 * HeroGallery — one PhotoFallback until the photos load, then a paged list
 * with a dot per page.
 *
 * Rendered with react-test-renderer; react-native is replaced with host
 * elements (the FlatList mock renders every item so pages can be counted)
 * and PhotoFallback and the theme hook are mocked.
 */

import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const WIDTH = 390;

jest.mock('react-native', () => ({
  View: (props: any) => React.createElement('View', props),
  FlatList: (props: any) =>
    React.createElement(
      'FlatList',
      props,
      props.data.map((item: any, index: number) =>
        React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item, index })),
      ),
    ),
  StyleSheet: { create: (s: any) => s },
  useWindowDimensions: () => ({ width: WIDTH, height: 844 }),
}));

jest.mock('../PhotoFallback', () => ({
  PhotoFallback: (props: any) => React.createElement('PhotoFallback', props),
}));

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    colors: { ink: '#INK', ink3: '#INK3' },
  }),
}));

import { HeroGallery } from '../HeroGallery';
import type { PlacePhotoDisplay } from '../../data/placeV2Display';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return;
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

const fallback = { photo: 'https://img/list.hero.jpg', id: 'k1', name: 'Veselka' };

const threePhotos: PlacePhotoDisplay[] = [
  { key: 'u1', url: 'https://img/1.hero.jpg', caption: 'Amit' },
  { key: 'u2', url: 'https://img/2.hero.jpg', caption: null },
  { key: 'google', url: 'https://img/g.jpg', caption: 'Jane Doe' },
];

function mount(photos: PlacePhotoDisplay[] | null, onPageChange?: (i: number) => void): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(React.createElement(HeroGallery, { photos, fallback, height: 300, onPageChange }));
  });
  return renderer;
}

function fallbacks(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root.findAllByType('PhotoFallback' as any);
}

function flatLists(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root.findAllByType('FlatList' as any);
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as Record<string, unknown>;
}

/** The dot row's children: Views with a 6 px square style. */
function dots(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root
    .findAllByType('View' as any)
    .filter((view) => {
      const style = flatten(view.props.style);
      return style.width === 6 && style.height === 6;
    });
}

describe('HeroGallery', () => {
  it('renders one PhotoFallback from the fallback and no dots while photos are null', () => {
    const renderer = mount(null);
    const fb = fallbacks(renderer);
    expect(fb).toHaveLength(1);
    expect(fb[0].props.photo).toBe(fallback.photo);
    expect(fb[0].props.id).toBe('k1');
    expect(fb[0].props.name).toBe('Veselka');
    expect(fb[0].props.height).toBe(300);
    expect(fb[0].props.borderRadius).toBe(0);
    expect(fb[0].props.showInitials).toBe(false);
    expect(flatLists(renderer)).toHaveLength(0);
    expect(dots(renderer)).toHaveLength(0);
  });

  it('renders one PhotoFallback and no dots for an empty gallery', () => {
    const renderer = mount([]);
    expect(fallbacks(renderer)).toHaveLength(1);
    expect(fallbacks(renderer)[0].props.photo).toBe(fallback.photo);
    expect(flatLists(renderer)).toHaveLength(0);
    expect(dots(renderer)).toHaveLength(0);
  });

  it('renders three pages and three dots for three photos', () => {
    const renderer = mount(threePhotos);
    const [list] = flatLists(renderer);
    expect(list).toBeDefined();
    expect(list.props.horizontal).toBe(true);
    expect(list.props.pagingEnabled).toBe(true);
    expect(list.props.showsHorizontalScrollIndicator).toBe(false);
    expect(list.props.getItemLayout(null, 2)).toEqual({ length: WIDTH, offset: 2 * WIDTH, index: 2 });

    const pages = fallbacks(renderer);
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.props.photo)).toEqual(threePhotos.map((p) => p.url));
    expect(pages.every((p) => p.props.borderRadius === 0 && p.props.showInitials === false)).toBe(true);

    const labels = renderer.root
      .findAllByType('View' as any)
      .map((v) => v.props.accessibilityLabel)
      .filter(Boolean);
    expect(labels).toEqual(['Photo 1 of 3', 'Photo 2 of 3', 'Photo 3 of 3']);

    const dotRow = dots(renderer);
    expect(dotRow).toHaveLength(3);
    expect(dotRow.map((d) => flatten(d.props.style).backgroundColor)).toEqual(['#INK', '#INK3', '#INK3']);
    expect(dotRow.map((d) => flatten(d.props.style).opacity)).toEqual([1, 0.5, 0.5]);
  });

  it('renders no dots for a single photo', () => {
    const renderer = mount([threePhotos[0]]);
    expect(fallbacks(renderer)).toHaveLength(1);
    expect(flatLists(renderer)).toHaveLength(1);
    expect(dots(renderer)).toHaveLength(0);
  });

  it('reports index 2 and moves the active dot after a momentum end at x = 2 * width', () => {
    const onPageChange = jest.fn();
    const renderer = mount(threePhotos, onPageChange);
    const [list] = flatLists(renderer);

    act(() => {
      list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 2 * WIDTH } } });
    });

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(dots(renderer).map((d) => flatten(d.props.style).backgroundColor)).toEqual(['#INK3', '#INK3', '#INK']);
  });
});
