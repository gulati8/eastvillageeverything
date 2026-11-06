import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { PlacePhotoDisplay } from '../data/placeV2Display';
import { useTheme } from '../theme/useTheme';
import { PhotoFallback } from './PhotoFallback';

type Props = {
  /** `null` while the detail has not loaded; `[]` when the place has no photos. */
  photos: PlacePhotoDisplay[] | null;
  /** What to show when there is nothing to page through: the list row's hero. */
  fallback: { photo: string | null; id: string; name: string };
  height?: number;
  onPageChange?: (index: number) => void;
};

const DOT_SIZE = 6;
const DOT_GAP = 6;

/**
 * The detail hero. One `PhotoFallback` until the photos arrive (so a detail
 * seeded from the list row does not flicker), then a paged horizontal list
 * with one page per photo and a dot per page when there is more than one.
 */
export function HeroGallery({ photos, fallback, height = 300, onPageChange }: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [current, setCurrent] = useState(0);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setCurrent(index);
      onPageChange?.(index);
    },
    [width, onPageChange],
  );

  if (!photos || photos.length === 0) {
    return (
      <PhotoFallback
        photo={fallback.photo}
        id={fallback.id}
        name={fallback.name}
        width="100%"
        height={height}
        borderRadius={0}
        showInitials={false}
      />
    );
  }

  const count = photos.length;

  return (
    <View style={{ width, height }}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(photo) => photo.key}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => (
          <View
            accessible
            accessibilityLabel={`Photo ${index + 1} of ${count}`}
            style={{ width, height }}
          >
            <PhotoFallback
              photo={item.url}
              id={fallback.id}
              name={fallback.name}
              width={width}
              height={height}
              borderRadius={0}
              showInitials={false}
            />
          </View>
        )}
      />
      {count > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((photo, index) => (
            <View
              key={photo.key}
              style={[
                styles.dot,
                index === current
                  ? { backgroundColor: colors.ink, opacity: 1 }
                  : { backgroundColor: colors.ink3, opacity: 0.5 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12 - DOT_SIZE / 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
