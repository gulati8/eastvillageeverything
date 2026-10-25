import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BookmarkIcon } from '../icons/BookmarkIcon';
import { useTheme } from '../theme/useTheme';

interface DetailSaveButtonProps {
  name: string;
  isSaved: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating bookmark button on the detail screen. Mirrors the row bookmark in
 * `PlaceRow`: filled accent icon when saved, outline when not, and an
 * accessibility label that names the action.
 */
export function DetailSaveButton({ name, isSaved, onToggle, style }: DetailSaveButtonProps) {
  const { colors } = useTheme();

  function handlePress() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? `Remove ${name} from saved places` : `Save ${name}`}
      accessibilityState={{ selected: isSaved }}
      style={style}
    >
      <BookmarkIcon color={isSaved ? colors.accent : colors.ink} filled={isSaved} />
    </Pressable>
  );
}
