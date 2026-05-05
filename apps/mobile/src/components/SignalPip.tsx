import React, { useEffect, useRef } from 'react';
import {
  Animated,
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import type { SignalKind } from '../data/placeV2Display';

interface SignalPipProps {
  kind: SignalKind | null;
  label: string | null;
  urgent: boolean;
}

export function SignalPip({ kind, label, urgent }: SignalPipProps): React.ReactElement | null {
  const { signalColors, typography, isDark } = useTheme();
  const dotOpacity = useRef(new Animated.Value(0.95)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!urgent) {
      animationRef.current?.stop();
      dotOpacity.setValue(0.95);
      return;
    }

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        dotOpacity.setValue(0.95);
        return;
      }

      animationRef.current?.stop();
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 0.55,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.95,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animationRef.current.start();
    });

    return () => {
      animationRef.current?.stop();
    };
  }, [urgent, dotOpacity]);

  if (kind == null || label == null) {
    return null;
  }

  const colors = signalColors(kind);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: colors.dot, opacity: dotOpacity },
        ]}
      />
      <Text
        style={[
          styles.label,
          { fontFamily: typography.ui700.fontFamily, color: colors.fg },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
