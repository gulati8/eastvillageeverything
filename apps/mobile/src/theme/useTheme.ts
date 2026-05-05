import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import type { ThemeContextValue } from './ThemeProvider';

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
