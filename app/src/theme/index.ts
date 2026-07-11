// Design system tokens. App is dark-mode only — no light variant.
//
// Rule: team colours (boere/british) have no UI presence at all — the icon
// artwork itself (flag vs Union Jack) is what tells the teams apart. Every
// other color signal (scores, standings, stat text, buttons, rings) uses the
// neutral white/grey palette + the accent below.

export const colors = {
  bg: '#121212',
  surface: '#1D1D1D',
  surfaceAlt: '#262626',
  text: '#F3F3F3',
  subtext: '#989898',
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

// Default text alignment is centre app-wide. Screens with scannable lists
// (leaderboards, roster/tournament lists), the page title, and the tournament
// settings forms explicitly override back to 'left' at their own call sites.
export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, textAlign: 'center' as const },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, textAlign: 'center' as const },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.1, textAlign: 'center' as const },
  body: { fontSize: 15, fontWeight: '400' as const, textAlign: 'center' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, textAlign: 'center' as const },
  small: { fontSize: 13, fontWeight: '400' as const, textAlign: 'center' as const },
  smallStrong: { fontSize: 13, fontWeight: '700' as const, textAlign: 'center' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4, textAlign: 'center' as const },
} as const;

export function teamLabel(team: 'boere' | 'british'): string {
  return team === 'boere' ? 'Boere Republic' : 'British Empire';
}
