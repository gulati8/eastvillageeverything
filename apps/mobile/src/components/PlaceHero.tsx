import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { PhotoFallback } from './PhotoFallback';
import type { PlaceV2Display } from '../data/placeV2Display';
import { typography } from '../theme/tokens';

interface PlaceHeroProps {
  place: PlaceV2Display;
  height?: number;
}

export function PlaceHero({ place, height = 380 }: PlaceHeroProps) {
  const { width } = useWindowDimensions();

  const hasPhoto = place.photo !== null;
  const showOverlay = hasPhoto;

  // Subtitle segments: kind, street, cross — skip nulls
  const subtitleParts: string[] = [];
  if (place.kind) subtitleParts.push(place.kind);
  if (place.street) subtitleParts.push(place.street);
  if (place.cross) subtitleParts.push(place.cross);
  const subtitle = subtitleParts.join(' · ');

  return (
    <View style={[styles.container, { width, height }]}>
      <PhotoFallback
        photo={place.photo}
        category={place.category}
        name={place.name}
        width={width}
        height={height}
        borderRadius={0}
      />

      {showOverlay ? (
        <>
          {/* Top gradient: semi-transparent overlay top portion */}
          <View
            style={[
              styles.gradientTop,
              { width, height: height * 0.45 },
            ]}
            pointerEvents="none"
          />
          {/* Bottom gradient: darker overlay bottom portion */}
          <View
            style={[
              styles.gradientBottom,
              { width, height: height * 0.55 },
            ]}
            pointerEvents="none"
          />
          {/* Name + subtitle overlay */}
          <View style={[styles.nameContainer, { width: width - 44 }]}>
            <Text style={styles.nameText} numberOfLines={3}>
              {place.name}
            </Text>
            {subtitle.length > 0 ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={8}
      >
        <Text style={styles.backChevron}>{'‹'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  nameContainer: {
    position: 'absolute',
    bottom: 22,
    left: 22,
  },
  nameText: {
    fontFamily: typography.displayItalic.fontFamily,
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: -0.84, // ~-0.02em at 42px
    lineHeight: 48,
  },
  subtitleText: {
    fontFamily: typography.ui500.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 26,
    color: '#1F1A14',
    lineHeight: 30,
    marginTop: -2,
  },
});
