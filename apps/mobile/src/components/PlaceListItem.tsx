import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PlaceResponse } from '@eve/shared-types';

type Props = {
  place: PlaceResponse;
  onPress: () => void;
};

export function PlaceListItem({ place, onPress }: Props) {
  const tagLine = place.tags.length > 0 ? place.tags.join(', ') : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.name}>{place.name}</Text>
      {place.address != null && (
        <Text style={styles.address}>{place.address}</Text>
      )}
      {tagLine != null && (
        <Text style={styles.tags}>{tagLine}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    backgroundColor: '#F9FAFB',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  tags: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
