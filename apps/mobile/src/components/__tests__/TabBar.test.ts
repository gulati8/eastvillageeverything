/**
 * TabBar — the two-tab floating capsule nav.
 *
 * Runs in the `node` jest environment; react-native, safe-area, svg, the icon
 * and the theme hook are mocked so the component can be called as a plain
 * function and the returned element tree walked (same approach as
 * TagFilterChips.test.ts and DetailSaveButton.test.ts). expo-blur and
 * react-native-reanimated are mocked globally in jest.setup.ts.
 */

import React from 'react';

jest.mock('react-native', () => ({
  Pressable: (props: any) => React.createElement('Pressable', props),
  StyleSheet: {
    create: (s: any) => s,
    absoluteFill: {},
    absoluteFillObject: {},
    hairlineWidth: 0.5,
  },
  Text: (props: any) => React.createElement('Text', props),
  View: (props: any) => React.createElement('View', props),
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('Svg', props),
  Path: (props: any) => React.createElement('Path', props),
}));

jest.mock('../../icons/BookmarkIcon', () => ({
  BookmarkIcon: (props: any) => React.createElement('BookmarkIcon', props),
}));

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      paper: '#FBF6EE',
      ink: '#16110C',
      ink3: '#8C7E6C',
      line: 'rgba(31,26,20,0.12)',
    },
    typography: { ui600: { fontFamily: 'SchibstedGrotesk_600SemiBold' } },
  }),
}));

import { TabBar, type TabKey } from '../TabBar';

type AnyEl = React.ReactElement<any>;

/** Depth-first collect every element in the tree matching `pred`. */
function collect(node: unknown, pred: (el: AnyEl) => boolean, out: AnyEl[] = []): AnyEl[] {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, pred, out));
    return out;
  }
  if (React.isValidElement(node)) {
    const el = node as AnyEl;
    if (pred(el)) out.push(el);
    collect(el.props.children, pred, out);
  }
  return out;
}

function renderTabs(activeTab: TabKey, onTabPress = jest.fn()) {
  const tree = TabBar({ activeTab, onTabPress });
  const tabs = collect(tree, (el) => el.props.accessibilityRole === 'tab');
  return { tree, tabs, onTabPress };
}

describe('TabBar', () => {
  it('renders exactly two tabs, Home and Saved', () => {
    const { tabs } = renderTabs('home');
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.props.testID)).toEqual(['tab-home', 'tab-saved']);
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Home', 'Saved']);
  });

  it('marks only the active tab as selected', () => {
    const home = renderTabs('home').tabs;
    expect(home[0].props.accessibilityState).toEqual({ selected: true });
    expect(home[1].props.accessibilityState).toEqual({ selected: false });

    const saved = renderTabs('saved').tabs;
    expect(saved[0].props.accessibilityState).toEqual({ selected: false });
    expect(saved[1].props.accessibilityState).toEqual({ selected: true });
  });

  it('pressing the other tab calls onTabPress with its key', () => {
    const { tabs, onTabPress } = renderTabs('home');
    tabs[1].props.onPress();
    expect(onTabPress).toHaveBeenCalledTimes(1);
    expect(onTabPress).toHaveBeenCalledWith('saved');
  });

  it('fills the saved bookmark only when the Saved tab is active', () => {
    // The saved tab's icon is a nested function component; expand it by hand.
    const savedIcon = (activeTab: TabKey): AnyEl => {
      const { tabs } = renderTabs(activeTab);
      const iconEl = collect(tabs[1], (el) => typeof el.type === 'function' && el.props.tab === 'saved')[0];
      return (iconEl.type as (p: any) => AnyEl)(iconEl.props);
    };

    const inactive = savedIcon('home');
    expect((inactive.type as { name: string }).name).toBe('BookmarkIcon');
    expect(inactive.props.filled).toBe(false);
    expect(inactive.props.color).toBe('#8C7E6C');
    expect(inactive.props.strokeWidth).toBe(2.4);

    const active = savedIcon('saved');
    expect(active.props.filled).toBe(true);
    expect(active.props.color).toBe('#FBF6EE');
  });

  it('floats the capsule above the home indicator at two thirds of the screen width', () => {
    const { tree } = renderTabs('home');
    const capsule = collect(tree, (el) => el.props.testID === 'tab-bar')[0];
    const flat = Object.assign({}, ...(capsule.props.style as object[]));
    expect(flat.position).toBe('absolute');
    expect(flat.bottom).toBe(34 + 12);
    expect(flat.width).toBe(260);
  });
});
