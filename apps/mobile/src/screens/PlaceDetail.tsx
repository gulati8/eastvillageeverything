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
import { PlaceHero } from '../components/PlaceHero';
import { Skeleton } from '../components/Skeleton';
import { useTheme } from '../theme/useTheme';

// Always-visible dismiss control. The detail screen hides the navigation
// header for the photo overlay aesthetic, so the only way back to the
// list lives here. Rendered above every state — loading, success, error
// — so a 404 can never trap the user.
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
      style={[
        backStyles.button,
        {
          top: topInset + 8,
          backgroundColor: scrim,
        },
      ]}
    >
      <Text style={[backStyles.glyph, { color: tint }]}>‹</Text>
    </Pressable>
  );
}

const backStyles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glyph: {
    fontSize: 28,
    lineHeight: 30,
    marginTop: -4,
    fontWeight: '500',
  },
});

export function PlaceDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error } = usePlace(id);
  const { colors, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();

  // Light scrim behind the back glyph so it stays legible over both the
  // dark paper background and the future hero photo (when prod returns
  // photo_url). Hex with FF/26 alpha = ~15% over ink.
  const backScrim = colors.ink + '26';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22 }}
        >
          {/* Hero skeleton */}
          <Skeleton width="100%" height={380} borderRadius={0} style={{ marginBottom: 22 }} />
          <Skeleton width="70%" height={24} style={{ marginBottom: 12 }} />
          <Skeleton width="90%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="90%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={18} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={80} borderRadius={14} style={{ marginBottom: 20 }} />
          <Skeleton width="40%" height={14} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={18} />
        </ScrollView>
      </View>
    );
  }

  // ── Error / 404 state ──────────────────────────────────────────────────────
  if (isError) {
    const status = error instanceof ApiError ? error.status : null;
    if (status === 404) {
      return (
        <View style={[styles.centerContainer, { backgroundColor: colors.paper }]}>
          <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
          <Text style={[styles.errorHeading, { color: colors.ink, fontFamily: typography.display.fontFamily }]}>
            Can't find that spot
          </Text>
          <Text style={[styles.errorBody, { color: colors.ink3, fontFamily: typography.body.fontFamily }]}>
            We can't find that spot right now. It may have moved or closed.
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.paper }]}>
        <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
        <Text style={[styles.errorHeading, { color: colors.ink, fontFamily: typography.display.fontFamily }]}>
          Something went wrong
        </Text>
        <Text style={[styles.errorBody, { color: colors.ink3, fontFamily: typography.body.fontFamily }]}>
          We can't find that spot right now. Check your connection and try again.
        </Text>
      </View>
    );
  }

  if (!data) return null;

  const place = transformPlace(data);
  const hasPhoto = place.photo !== null;
  const formattedPhone = formatPhone(place.phone);

  // Build Maps URL for the address
  function openMaps() {
    if (!place.street) return;
    const query = encodeURIComponent(`${place.name}, ${place.street}, East Village, New York, NY`);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <BackButton topInset={insets.top} tint={colors.ink} scrim={backScrim} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <PlaceHero place={place} height={380} />

        {/* ── Content area ─────────────────────────────────────────────────── */}
        <View style={styles.contentArea}>

          {/* Kind + street label when no photo overlay shows the title */}
          {!hasPhoto && (place.kind || place.street) ? (
            <Text
              style={[
                styles.kindStreetLabel,
                { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
              ]}
            >
              {[place.kind, place.street].filter(Boolean).join(' · ')}
            </Text>
          ) : null}

          {/* Pitch paragraph */}
          {place.pitch ? (
            <Text
              style={[
                styles.pitchText,
                { color: colors.ink, fontFamily: typography.body.fontFamily },
              ]}
            >
              {place.pitch}
            </Text>
          ) : null}

          {/* Perfect when block */}
          {place.perfect ? (
            <View
              style={[
                styles.perfectBlock,
                { backgroundColor: colors.paper2, borderRadius: radii.md },
              ]}
            >
              <Text
                style={[
                  styles.perfectEyebrow,
                  { color: colors.accentDeep, fontFamily: typography.ui600.fontFamily },
                ]}
              >
                PERFECT WHEN
              </Text>
              <Text
                style={[
                  styles.perfectContent,
                  { color: colors.ink, fontFamily: typography.displayItalic.fontFamily },
                ]}
              >
                {place.perfect}.
              </Text>
            </View>
          ) : null}

          {/* The move section */}
          {place.insider ? (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.ink3, fontFamily: typography.ui700.fontFamily },
                ]}
              >
                THE MOVE
              </Text>
              <Text
                style={[
                  styles.sectionBody,
                  { color: colors.ink2, fontFamily: typography.body.fontFamily },
                ]}
              >
                {place.insider}
              </Text>
            </View>
          ) : null}

          {/* Who's there section */}
          {place.crowd ? (
            <View style={[styles.section, { marginTop: 20 }]}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.ink3, fontFamily: typography.ui700.fontFamily },
                ]}
              >
                {"WHO'S THERE"}
              </Text>
              <Text
                style={[
                  styles.sectionBody,
                  { color: colors.ink2, fontFamily: typography.body.fontFamily },
                ]}
              >
                {place.crowd}.
              </Text>
            </View>
          ) : null}

          {/* Contact rows */}
          <View style={styles.contactRows}>
            {place.street ? (
              <Pressable style={styles.contactRow} onPress={openMaps}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text
                  style={[
                    styles.contactText,
                    { color: colors.ink2, fontFamily: typography.ui500.fontFamily },
                  ]}
                >
                  {place.street}
                </Text>
              </Pressable>
            ) : null}

            {place.phone ? (
              <Pressable
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${place.phone}`)}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text
                  style={[
                    styles.contactText,
                    { color: colors.ink2, fontFamily: typography.ui500.fontFamily },
                  ]}
                >
                  {formattedPhone}
                </Text>
              </Pressable>
            ) : null}

            {place.url ? (
              <Pressable
                style={styles.contactRow}
                onPress={() => Linking.openURL(place.url!)}
              >
                <Text style={styles.contactIcon}>🔗</Text>
                <Text
                  style={[
                    styles.contactText,
                    styles.contactLink,
                    { color: colors.ink2, fontFamily: typography.ui500.fontFamily },
                  ]}
                  numberOfLines={1}
                >
                  {place.url}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Tag rail */}
          {place.tags.length > 0 ? (
            <View style={styles.tagRail}>
              {place.tags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagPill,
                    { backgroundColor: colors.paper2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: colors.ink2, fontFamily: typography.ui500.fontFamily },
                    ]}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Bottom CTA bar ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.paper + 'F2', // 95% opacity
            borderTopColor: colors.line,
          },
        ]}
      >
        <Pressable
          style={[styles.ctaButtonPrimary, { backgroundColor: colors.ink }]}
          onPress={openMaps}
        >
          <Text
            style={[
              styles.ctaButtonPrimaryText,
              { color: colors.paper, fontFamily: typography.ui600.fontFamily },
            ]}
          >
            Get directions
          </Text>
        </Pressable>

        {place.phone ? (
          <Pressable
            style={[styles.ctaButtonSecondary, { borderColor: colors.ink }]}
            onPress={() => Linking.openURL(`tel:${place.phone}`)}
          >
            <Text
              style={[
                styles.ctaButtonSecondaryText,
                { color: colors.ink, fontFamily: typography.ui600.fontFamily },
              ]}
            >
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
  scrollContent: {
    paddingBottom: 100,
  },
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
  contentArea: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  kindStreetLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: 14,
  },
  pitchText: {
    fontSize: 17,
    lineHeight: 25,
  },
  perfectBlock: {
    marginTop: 18,
    padding: 14,
    paddingHorizontal: 16,
  },
  perfectEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.66, // ~0.06em at 11px
    marginBottom: 6,
  },
  perfectContent: {
    fontSize: 22,
    lineHeight: 25,
  },
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1, // ~0.1em at 11px
  },
  sectionBody: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  contactRows: {
    marginTop: 20,
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 15,
    flex: 1,
  },
  contactLink: {
    textDecorationLine: 'underline',
  },
  tagRail: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  ctaButtonPrimary: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButtonSecondary: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
