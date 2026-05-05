import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_MAP } from '../data/categoryMap';
import type { CategoryKey } from '../data/placeV2Display';
import { typography } from '../theme/tokens';

type Props = {
  photo: string | null;
  category: CategoryKey;
  name: string;
  width: number;
  height: number;
  borderRadius?: number;
  showDistancePill?: boolean;
  distance?: string | null;
  onImageError?: () => void;
};

export function PhotoFallback({
  photo,
  category,
  name,
  width,
  height,
  borderRadius = 14,
  showDistancePill = false,
  distance,
  onImageError,
}: Props) {
  const [imageError, setImageError] = useState(false);

  const meta = CATEGORY_MAP[category];
  const firstWord = name.split(' ')[0] ?? name;
  const showImage = photo !== null && !imageError;

  const containerStyle = [
    styles.container,
    { width, height, borderRadius },
  ];

  function handleImageError() {
    setImageError(true);
    onImageError?.();
  }

  return (
    <View style={containerStyle}>
      {showImage ? (
        <Image
          source={{ uri: photo as string }}
          style={styles.image}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        <View style={[styles.tintBase, { backgroundColor: meta.tint }]}>
          <View
            style={[
              styles.accentOverlay,
              { backgroundColor: meta.accent },
            ]}
          />
          <Text style={styles.firstWord}>{firstWord}</Text>
        </View>
      )}

      {showDistancePill && distance != null && (
        <View style={styles.distancePill}>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tintBase: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  accentOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  firstWord: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: typography.displayItalic.fontFamily,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  distancePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  distanceText: {
    fontSize: 10,
    fontFamily: typography.ui700.fontFamily,
    fontWeight: '700',
    color: '#1F1A14',
  },
});
