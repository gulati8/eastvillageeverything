import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme/useTheme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
};

export function SearchBar({ value, onChangeText, onSubmit }: Props) {
  const { colors, typography, radii } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
          borderRadius: radii.pill,
        },
      ]}
    >
      {/* Search icon */}
      <Text style={[styles.icon, { color: colors.ink3 }]}>&#x2315;</Text>

      {/* Text input */}
      <TextInput
        style={[
          styles.input,
          {
            fontFamily: typography.ui400.fontFamily,
            color: colors.ink,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Search a name or a feeling"
        placeholderTextColor={colors.ink3}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />

      {/* Clear button */}
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          hitSlop={8}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text style={[styles.clearIcon, { color: colors.ink3 }]}>&#x00D7;</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    // height must fill the container; padding 0 avoids Android default padding
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  clearIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
});
