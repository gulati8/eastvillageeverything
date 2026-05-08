import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { typography } from '../theme/tokens';

type Props = {
  photo: string | null;
  id: string;
  name: string;
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  showDistancePill?: boolean;
  showInitials?: boolean;
  distance?: string | null;
  onImageError?: () => void;
};

const FALLBACK_PALETTES = [
  { tint: '#2A160B', accent: '#4A2818', shade: '#14080A' },
  { tint: '#16241C', accent: '#2A3A26', shade: '#0A140F' },
  { tint: '#251810', accent: '#3D2A1F', shade: '#120A06' },
  { tint: '#20102A', accent: '#3A1A3A', shade: '#0E0820' },
  { tint: '#20080C', accent: '#3A1416', shade: '#0E0408' },
  { tint: '#161E2C', accent: '#2A3346', shade: '#0A0F18' },
];

const THUMBNAIL_INITIALS_FONT = 'ArchivoBlack_400Regular';

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => ({
      original: word,
      letters: word.replace(/[^A-Za-z]/g, ''),
    }))
    .filter(
      (word) =>
        word.letters.length > 0 &&
        !/\d/.test(word.original) &&
        !['the', 'a', 'an'].includes(word.letters.toLowerCase()),
    );

  const initials = words
    .slice(0, 3)
    .map((word) => word.letters.charAt(0).toUpperCase())
    .join('');

  return initials || name.trim().charAt(0).toUpperCase() || '?';
}

export function PhotoFallback({
  photo,
  id,
  name,
  width,
  height,
  borderRadius = 14,
  showDistancePill = false,
  showInitials = true,
  distance,
  onImageError,
}: Props) {
  const [imageError, setImageError] = useState(false);

  const hash = stableHash(id);
  const meta = FALLBACK_PALETTES[(hash >> 8) % FALLBACK_PALETTES.length];
  const composition = hash % 3;
  const initials = getInitials(name);
  const showImage = photo !== null && !imageError;
  const isHero = height > 150;
  const fallbackComposition = isHero ? composition : 1;
  const initialsSize = isHero ? 128 : 27;
  const initialsFontFamily = isHero
    ? typography.display.fontFamily
    : THUMBNAIL_INITIALS_FONT;
  const initialsLetterSpacing = 0;
  const initialsVerticalOffset = isHero ? 6 : 2;
  const nameSize = isHero ? 32 : 16;

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
          <View style={[styles.radialAccent, { backgroundColor: meta.accent }]} />
          <View style={[styles.cornerShade, { backgroundColor: meta.shade }]} />
          <View
            style={[
              styles.textureOverlay,
              { backgroundColor: 'rgba(255,255,255,0.018)' },
            ]}
          />
          {showInitials && fallbackComposition === 0 ? (
            <Text
              style={[
                styles.capsName,
                {
                  fontSize: isHero ? 28 : 12,
                  lineHeight: isHero ? 30 : 13,
                  padding: isHero ? 18 : 8,
                },
              ]}
              numberOfLines={4}
            >
              {name.toUpperCase()}
            </Text>
          ) : null}
          {showInitials && fallbackComposition === 1 ? (
            <Text
              style={[
                styles.initials,
                {
                  fontFamily: initialsFontFamily,
                  fontSize: initialsSize,
                  letterSpacing: initialsLetterSpacing,
                  lineHeight: height,
                  transform: [{ translateY: initialsVerticalOffset }],
                },
              ]}
            >
              {initials}
            </Text>
          ) : null}
          {showInitials && fallbackComposition === 2 ? (
            <Text
              style={[
                styles.italicName,
                {
                  fontSize: nameSize,
                  lineHeight: isHero ? 36 : 18,
                  paddingHorizontal: isHero ? 22 : 8,
                },
              ]}
              numberOfLines={isHero ? 3 : 2}
            >
              {name}
            </Text>
          ) : null}
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
  radialAccent: {
    position: 'absolute',
    top: '-20%',
    left: '-18%',
    width: '92%',
    height: '92%',
    borderRadius: 999,
    opacity: 0.72,
  },
  cornerShade: {
    position: 'absolute',
    right: '-26%',
    bottom: '-24%',
    width: '86%',
    height: '86%',
    borderRadius: 999,
    opacity: 0.8,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  capsName: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    color: 'rgba(255,255,255,0.92)',
    fontFamily: typography.ui900.fontFamily,
    letterSpacing: 0.3,
  },
  italicName: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: 'rgba(255,255,255,0.94)',
    fontFamily: typography.displayItalic.fontFamily,
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  initials: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
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
