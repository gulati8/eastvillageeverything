/**
 * DetailSaveButton — the floating bookmark on the detail screen.
 *
 * Runs in the `node` jest environment; react-native, the icon and the theme
 * hook are mocked so the component can be called as a plain function and the
 * returned element inspected (same approach as PhotoAttribution.test.ts).
 */

import React from 'react';

jest.mock('react-native', () => ({
  Pressable: (props: any) => React.createElement('Pressable', props),
  StyleSheet: { create: (s: any) => s },
}));

jest.mock('../../icons/BookmarkIcon', () => ({
  BookmarkIcon: (props: any) => React.createElement('BookmarkIcon', props),
}));

// jest.setup.ts mocks expo-haptics without the ImpactFeedbackStyle enum the
// component reads; this test-local mock adds it.
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}), { virtual: true });

jest.mock('../../theme/useTheme', () => ({
  useTheme: () => ({
    colors: { accent: '#C8451B', ink: '#16110C' },
  }),
}));

import * as Haptics from 'expo-haptics';
import { DetailSaveButton } from '../DetailSaveButton';

type IconEl = React.ReactElement<{ color: string; filled: boolean }>;
type ButtonEl = React.ReactElement<{
  accessibilityLabel: string;
  accessibilityState: { selected: boolean };
  onPress: () => void;
  style: unknown;
  children: IconEl;
}>;

function render(props: Partial<React.ComponentProps<typeof DetailSaveButton>> = {}): ButtonEl {
  return DetailSaveButton({
    name: 'Veselka',
    isSaved: false,
    onToggle: () => undefined,
    ...props,
  }) as ButtonEl;
}

describe('DetailSaveButton', () => {
  it('renders filled in the accent colour when the place is saved', () => {
    const el = render({ isSaved: true });
    const icon = el.props.children;
    expect(icon.props.filled).toBe(true);
    expect(icon.props.color).toBe('#C8451B');
    expect(el.props.accessibilityState).toEqual({ selected: true });
  });

  it('renders an outline in ink when the place is not saved', () => {
    const el = render({ isSaved: false });
    const icon = el.props.children;
    expect(icon.props.filled).toBe(false);
    expect(icon.props.color).toBe('#16110C');
    expect(el.props.accessibilityState).toEqual({ selected: false });
  });

  it('labels the action by place name', () => {
    expect(render({ isSaved: false }).props.accessibilityLabel).toBe('Save Veselka');
    expect(render({ isSaved: true }).props.accessibilityLabel).toBe(
      'Remove Veselka from saved places',
    );
  });

  it('calls onToggle and fires a light haptic on press', () => {
    const onToggle = jest.fn();
    const el = render({ onToggle });
    el.props.onPress();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('passes the positioning style through', () => {
    const style = [{ top: 54 }];
    expect(render({ style }).props.style).toBe(style);
  });
});
