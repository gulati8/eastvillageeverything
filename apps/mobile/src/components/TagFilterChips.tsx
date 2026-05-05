import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTagsStructured } from '../api/tags';
import { Skeleton } from './Skeleton';
import type { TagSummary } from '@eve/shared-types';

type Props = {
  selected: string | null;
  onSelect: (tag: string | null) => void;
};

export function TagFilterChips({ selected, onSelect }: Props) {
  const { data, isLoading, isError } = useTagsStructured();

  if (isError) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={72} height={32} style={styles.skeletonChip} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Build flat chip list: "All" + parents (with children inline) + standalone
  const chips: TagSummary[] = [];

  if (data) {
    if (Array.isArray(data)) {
      // Server has not yet been deployed with structured-tags support;
      // fall back: render each flat tag as a standalone chip.
      for (const tag of (data as unknown as TagSummary[])) {
        chips.push({
          value: tag.value,
          display: tag.display,
          order: tag.order,
        });
      }
    } else {
      for (const parent of data.parents ?? []) {
        chips.push({ value: parent.value, display: parent.display, order: parent.order });
        for (const child of parent.children ?? []) {
          chips.push(child);
        }
      }
      for (const standalone of data.standalone ?? []) {
        chips.push(standalone);
      }
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={[styles.chip, selected === null && styles.chipSelected]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.chipText, selected === null && styles.chipTextSelected]}>
            All
          </Text>
        </Pressable>
        {chips.map((chip) => (
          <Pressable
            key={chip.value}
            style={[styles.chip, selected === chip.value && styles.chipSelected]}
            onPress={() => onSelect(chip.value)}
          >
            <Text
              style={[
                styles.chipText,
                selected === chip.value && styles.chipTextSelected,
              ]}
            >
              {chip.display}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  skeletonChip: {
    borderRadius: 16,
  },
});
