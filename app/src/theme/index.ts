// Design system tokens. App is dark-mode only — no light variant.
//
// Rule: team colours (boere/british) have no UI presence at all — the icon
// artwork itself (flag vs Union Jack) is what tells the teams apart. Every
// other color signal (scores, standings, stat text, buttons, rings) uses the
// neutral white/grey palette + the accent below.

export const colors = {
  bg: '#101513',
  surface: '#1A211E',
  surfaceAlt: '#212A26',
  text: '#F2F4F1',
  subtext: '#8FA098',
  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',
  dimmed: 'rgba(0,0,0,0.5)',

  // Interactive accent — gold. Used generously: buttons, active
  // states, borders, focus rings, headline stat values.
  accent: '#E5B93F',
  accentPressed: '#C79A2E',
  accentMuted: 'rgba(229,185,63,0.16)',
  onAccent: '#1A1206',

  success: '#4CAF7D',
  danger: '#D9534F',
  dangerMuted: 'rgba(217,83,79,0.16)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  smallStrong: { fontSize: 13, fontWeight: '700' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

export function teamLabel(team: 'boere' | 'british'): string {
  return team === 'boere' ? 'Boere Republic' : 'British Empire';
}
