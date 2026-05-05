import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function PullRefreshIndicator() {
  const { colors, typography } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            borderColor: colors.accent,
            borderRightColor: 'transparent',
            transform: [{ rotate: spin }],
          },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: colors.ink2, fontFamily: typography.bodyItalic.fontFamily },
        ]}
      >
        {"Checking what's open…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 0,
    gap: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  text: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
