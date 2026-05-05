import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeProvider';
import { lightColors } from '../theme/tokens';

type Props = {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width, height, borderRadius, style }: Props) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  // useContext never throws; when rendered outside ThemeProvider the default
  // context value (lightColors) is returned, so paper2 falls back to '#F2EADC'.
  const theme = useContext(ThemeContext);
  const paper2 = theme?.colors?.paper2 ?? lightColors.paper2;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: width as number,
          height: height as number,
          backgroundColor: paper2,
          borderRadius: borderRadius ?? 4,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
  },
});
