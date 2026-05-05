// Design tokens for East Village Everything — generated from design handoff
// docs/design_handoff_eve/README.md

export type SignalKind = 'happy' | 'closing' | 'music' | 'walkin' | 'always';

export interface ColorTokens {
  paper: string;
  paper2: string;
  card: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accentDeep: string;
  chip: string;
  chipActive: string;
}

export interface SignalColors {
  bg: string;
  fg: string;
  dot: string;
}

export type SignalColorMap = Record<SignalKind, SignalColors>;

export interface TypographyToken {
  fontFamily: string;
}

export interface TypographyTokens {
  display: TypographyToken;
  displayItalic: TypographyToken;
  body: TypographyToken;
  bodyItalic: TypographyToken;
  ui400: TypographyToken;
  ui500: TypographyToken;
  ui600: TypographyToken;
  ui700: TypographyToken;
  ui900: TypographyToken;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  screenPadding: number;
}

export interface RadiiTokens {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

export const lightColors: ColorTokens = {
  paper: '#FBF6EE',
  paper2: '#F2EADC',
  card: '#FFFFFF',
  ink: '#1F1A14',
  ink2: '#54483A',
  ink3: '#8C7E6C',
  line: 'rgba(31,26,20,0.12)',
  accent: '#E07B3F',
  accentDeep: '#B85420',
  chip: '#FFFFFF',
  chipActive: '#1F1A14',
};

export const darkColors: ColorTokens = {
  paper: '#16110C',
  paper2: '#1F1812',
  card: '#231C15',
  ink: '#F5EBDA',
  ink2: '#C4B49C',
  ink3: '#8B7E69',
  line: 'rgba(245,235,218,0.14)',
  accent: '#F09060',
  accentDeep: '#E07B3F',
  chip: '#231C15',
  chipActive: '#F5EBDA',
};

// ─── Signal pip colors ────────────────────────────────────────────────────────
// Light mode: bg + fg as specified in design
// Dark mode: bg = dot color at ~13% opacity (append '22' hex suffix), fg = dot color

export const lightSignalColors: SignalColorMap = {
  happy:   { bg: '#FFF1E5', fg: '#B85420', dot: '#E07B3F' },
  closing: { bg: '#FFE8E0', fg: '#A8341A', dot: '#D04A28' },
  music:   { bg: '#EFEAF7', fg: '#5B3A8A', dot: '#7A5BB8' },
  walkin:  { bg: '#E8F1EC', fg: '#2D6A47', dot: '#3FB871' },
  always:  { bg: '#F2EADC', fg: '#54483A', dot: '#8C7E6C' },
};

export const darkSignalColors: SignalColorMap = {
  happy:   { bg: '#E07B3F22', fg: '#E07B3F', dot: '#E07B3F' },
  closing: { bg: '#D04A2822', fg: '#D04A28', dot: '#D04A28' },
  music:   { bg: '#7A5BB822', fg: '#7A5BB8', dot: '#7A5BB8' },
  walkin:  { bg: '#3FB87122', fg: '#3FB871', dot: '#3FB871' },
  always:  { bg: '#8C7E6C22', fg: '#8C7E6C', dot: '#8C7E6C' },
};

export function getSignalColors(kind: SignalKind, isDark: boolean): SignalColors {
  return isDark ? darkSignalColors[kind] : lightSignalColors[kind];
}

// ─── Typography ───────────────────────────────────────────────────────────────
// Font family strings match @expo-google-fonts package exports exactly.

export const typography: TypographyTokens = {
  display:      { fontFamily: 'InstrumentSerif_400Regular' },
  displayItalic:{ fontFamily: 'InstrumentSerif_400Regular_Italic' },
  body:         { fontFamily: 'SourceSerif4_400Regular' },
  bodyItalic:   { fontFamily: 'SourceSerif4_400Regular_Italic' },
  ui400:        { fontFamily: 'SchibstedGrotesk_400Regular' },
  ui500:        { fontFamily: 'SchibstedGrotesk_500Medium' },
  ui600:        { fontFamily: 'SchibstedGrotesk_600SemiBold' },
  ui700:        { fontFamily: 'SchibstedGrotesk_700Bold' },
  ui900:        { fontFamily: 'SchibstedGrotesk_900Black' },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 14,
  lg: 16,
  xl: 22,
  xxl: 28,
  xxxl: 40,
  screenPadding: 22,
};

// ─── Radii ────────────────────────────────────────────────────────────────────

export const radii: RadiiTokens = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
};
