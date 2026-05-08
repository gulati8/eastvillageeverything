import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlace } from '../api/places';
import { ApiError } from '../api/errors';
import { formatPhone } from '../format/phone';
import { transformPlace } from '../data/transformPlace';
import { PhotoFallback } from '../components/PhotoFallback';
import { Skeleton } from '../components/Skeleton';
import { BookmarkIcon } from '../icons/BookmarkIcon';
import { useTheme } from '../theme/useTheme';

function BackButton({
  topInset,
  tint,
  scrim,
}: {
  topInset: number;
  tint: string;
  scrim: string;
}) {
  const handlePress = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to list"
      style={[styles.floatingButton, styles.backButton, { top: topInset + 10, backgroundColor: scrim }]}
    >
      <Text style={[styles.backGlyph, { color: tint }]}>‹</Text>
    </Pressable>
  );
}

function formatTagLabel(tag: string): string {
  return tag
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function PlaceDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error } = usePlace(id);
  const { colors, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();

  const backScrim = 'rgba(22,17,12,0.72)';

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingTop: insets.top + 72 }}>
          <Skeleton width="100%" height={260} borderRadius={14} style={{ marginBottom: 22 }} />
          <Skeleton width="70%" height={28} style={{ marginBottom: 12 }} />
          <Skeleton width="90%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={96} borderRadius={14} style={{ marginTop: 20 }} />
        </ScrollView>
      </View>
    );
  }

  if (isError && !data) {
    const status = error instanceof ApiError ? error.status : null;
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.paper }]}>
        <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
        <Text style={[styles.errorHeading, { color: colors.ink, fontFamily: typography.ui700.fontFamily }]}>
          {status === 404 ? "Can't find that spot" : 'Something went wrong'}
        </Text>
        <Text style={[styles.errorBody, { color: colors.ink3, fontFamily: typography.body.fontFamily }]}>
          {status === 404
            ? 'That spot may have moved or closed.'
            : "We can't load that spot right now. Check your connection and try again."}
        </Text>
      </View>
    );
  }

  if (!data) return null;

  const place = transformPlace(data);
  const formattedPhone = formatPhone(place.phone);
  const specials = place.specials?.trim() || null;
  const notes = place.notes?.trim() || null;
  const hoursLabel = place.hours?.label ?? null;

  function openMaps() {
    const queryText = place.street
      ? `${place.name}, ${place.street}, East Village, New York, NY`
      : `${place.name}, East Village, New York, NY`;
    const query = encodeURIComponent(queryText);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    });
  }

  function callPlace() {
    if (place.phone) {
      Linking.openURL(`tel:${place.phone}`);
    }
  }

  function openWeb() {
    if (place.url) {
      Linking.openURL(normalizeUrl(place.url));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <PhotoFallback
            photo={place.photo}
            id={place.key}
            name={place.name}
            width="100%"
            height={300}
            borderRadius={0}
            showInitials={false}
          />
          <View style={styles.heroShade} />
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.ink, fontFamily: typography.ui700.fontFamily }]} numberOfLines={3}>
              {place.name}
            </Text>
            {place.street ? (
              <Text style={[styles.heroMeta, { color: colors.ink2, fontFamily: typography.ui600.fontFamily }]} numberOfLines={2}>
                {place.street}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.contentArea}>
          {specials ? (
            <View style={[styles.specialsCard, { backgroundColor: colors.paper2, borderRadius: radii.md }]}>
              <Text style={[styles.specialsLabel, { color: colors.accent, fontFamily: typography.ui700.fontFamily }]}>
                SPECIALS
              </Text>
              <Text style={[styles.specialsBody, { color: colors.ink, fontFamily: typography.body.fontFamily }]}>
                {specials}
              </Text>
            </View>
          ) : null}

          {notes ? (
            <Text style={[styles.notesText, { color: colors.ink2, fontFamily: typography.bodyItalic.fontFamily }]}>
              {notes}
            </Text>
          ) : null}

          <View style={[styles.contactRows, { borderTopColor: colors.line }]}>
            {place.street ? (
              <Pressable style={[styles.contactRow, { borderBottomColor: colors.line }]} onPress={openMaps}>
                <Text style={[styles.contactLabel, { color: colors.ink3, fontFamily: typography.ui600.fontFamily }]}>ADDRESS</Text>
                <Text style={[styles.contactValue, { color: colors.ink, fontFamily: typography.ui500.fontFamily }]}>{place.street}</Text>
              </Pressable>
            ) : null}

            {place.phone ? (
              <Pressable style={[styles.contactRow, { borderBottomColor: colors.line }]} onPress={callPlace}>
                <Text style={[styles.contactLabel, { color: colors.ink3, fontFamily: typography.ui600.fontFamily }]}>PHONE</Text>
                <Text style={[styles.contactValue, { color: colors.ink, fontFamily: typography.ui500.fontFamily }]}>{formattedPhone}</Text>
              </Pressable>
            ) : null}

            {hoursLabel ? (
              <View style={[styles.contactRow, { borderBottomColor: colors.line }]}>
                <Text style={[styles.contactLabel, { color: colors.ink3, fontFamily: typography.ui600.fontFamily }]}>HOURS</Text>
                <Text style={[styles.contactValue, { color: colors.ink, fontFamily: typography.ui500.fontFamily }]}>{hoursLabel}</Text>
              </View>
            ) : null}

            {place.url ? (
              <Pressable style={[styles.contactRow, { borderBottomColor: colors.line }]} onPress={openWeb}>
                <Text style={[styles.contactLabel, { color: colors.ink3, fontFamily: typography.ui600.fontFamily }]}>WEB</Text>
                <Text style={[styles.contactValue, { color: colors.ink, fontFamily: typography.ui500.fontFamily }]} numberOfLines={1}>
                  {displayUrl(place.url)}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {place.tags.length > 0 ? (
            <View style={styles.tagRail}>
              {place.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: colors.paper2 }]}>
                  <Text style={[styles.tagText, { color: colors.ink2, fontFamily: typography.ui500.fontFamily }]}>
                    {formatTagLabel(tag)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
      <Pressable
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Save spot"
        style={[styles.floatingButton, styles.saveButton, { top: insets.top + 10, backgroundColor: backScrim }]}
      >
        <BookmarkIcon color={colors.ink} />
      </Pressable>

      <View
        style={[
          styles.ctaBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.paper + 'F2',
            borderTopColor: colors.line,
          },
        ]}
      >
        <Pressable style={[styles.ctaPrimary, { backgroundColor: colors.ink }]} onPress={openMaps}>
          <Text style={[styles.ctaPrimaryText, { color: colors.paper, fontFamily: typography.ui700.fontFamily }]}>
            Get directions
          </Text>
        </Pressable>

        {place.phone ? (
          <Pressable style={[styles.ctaSecondary, { borderColor: colors.ink }]} onPress={callPlace}>
            <Text style={[styles.ctaSecondaryText, { color: colors.ink, fontFamily: typography.ui700.fontFamily }]}>
              Call
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {},
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorHeading: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  hero: {
    height: 300,
    position: 'relative',
    overflow: 'hidden',
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroText: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  floatingButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backButton: {
    left: 14,
  },
  saveButton: {
    right: 14,
  },
  backGlyph: {
    fontSize: 28,
    lineHeight: 30,
    marginTop: -4,
    fontWeight: '500',
  },
  contentArea: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  specialsCard: {
    padding: 18,
  },
  specialsLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  specialsBody: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  notesText: {
    marginTop: 18,
    fontSize: 14.5,
    lineHeight: 21,
  },
  contactRows: {
    marginTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contactRow: {
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  contactLabel: {
    width: 72,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  contactValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 22,
  },
  tagPill: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 12,
    lineHeight: 15,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
  },
  ctaPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    fontSize: 14,
    lineHeight: 18,
  },
  ctaSecondary: {
    width: 84,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondaryText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
