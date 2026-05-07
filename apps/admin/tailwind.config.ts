import type { Config } from 'tailwindcss';
import { colors, fontStacks, spacing, radii } from '@eve/design-tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: colors.light.paper,
        paper2: colors.light.paper2,
        ink: colors.light.ink,
        ink2: colors.light.ink2,
        ink3: colors.light.ink3,
        hairline: colors.light.hairline,
        accent: colors.light.accent,
      },
      fontFamily: {
        // Tailwind expects arrays of strings; fontStacks already gives that.
        // Multi-word names are pre-quoted in @eve/design-tokens.
        display: [...fontStacks.display],
        body: [...fontStacks.body],
        ui: [...fontStacks.ui],
      },
      spacing,
      borderRadius: {
        chip: radii.chip,
        input: radii.input,
        card: radii.card,
        sheet: radii.sheet,
      },
    },
  },
  plugins: [],
};

export default config;
