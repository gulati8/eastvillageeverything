/**
 * Visual tokens for EVE — pulled from docs/design_handoff_eve_2/eve-tokens.jsx
 * and the README's "Visual system" section.
 *
 * Font stacks are arrays so consumers (Tailwind, CSS) can either join them with
 * commas or hand them straight to a tool that expects array form. Multi-word
 * font names are pre-quoted so the join produces valid CSS.
 */

export const colors = {
  light: {
    paper: '#FBF6EE',
    paper2: '#F2EADC',
    ink: '#1F1A14',
    ink2: '#54483A',
    ink3: '#8C7E6C',
    hairline: 'rgba(31,26,20,0.08)',
    accent: '#E07B3F',
  },
  dark: {
    paper: '#1F1A14',
    paper2: '#2A2520',
    ink: '#FBF6EE',
    ink2: '#C9BEAB',
    ink3: '#8C7E6C',
    hairline: 'rgba(251,246,238,0.08)',
    accent: '#F09060',
  },
} as const;

export const fontStacks = {
  display: ['"Instrument Serif"', '"Iowan Old Style"', 'Georgia', 'serif'],
  body: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
  ui: ['"Schibsted Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
} as const;

export const spacing = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '22px',
  '6': '28px',
  '7': '36px',
  '8': '48px',
} as const;

export const radii = {
  chip: '6px',
  input: '10px',
  card: '14px',
  sheet: '22px',
} as const;
