import React, { createContext, useMemo } from 'react';
import {
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
  colors: darkColors,
  spacing,
  radii,
  typography,
  signalColors: (kind) => getSignalColors(kind, true),
  isDark: true,
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: darkColors,
      spacing,
      radii,
      typography,
      signalColors: (kind: SignalKind) => getSignalColors(kind, true),
      isDark: true,
    }),
    [],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
