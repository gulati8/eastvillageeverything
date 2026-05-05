import React, { createContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  spacing,
  radii,
  typography,
  getSignalColors,
} from './tokens';
import type {
  ColorTokens,
  SpacingTokens,
  RadiiTokens,
  TypographyTokens,
  SignalKind,
  SignalColors,
} from './tokens';

export interface ThemeContextValue {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  typography: TypographyTokens;
  signalColors: (kind: SignalKind) => SignalColors;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  spacing,
  radii,
  typography,
  signalColors: (kind) => getSignalColors(kind, false),
  isDark: false,
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radii,
      typography,
      signalColors: (kind: SignalKind) => getSignalColors(kind, isDark),
      isDark,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
