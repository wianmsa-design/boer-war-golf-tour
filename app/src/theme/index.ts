// Design system tokens. App is dark-mode only — no light variant.
//
// Rule: team colours (boere/british) are DATA, not decoration. They may only
// appear where the two teams are actually being distinguished: score cells,
// standings bars, the ring on a player icon, emblems. Never as a general UI
// color (buttons, nav, headers use the neutral palette + gold accent below).

export const colors = {
  bg: '#101513',
  surface: '#1A211E',
  surfaceAlt: '#212A26',
  text: '#F2F4F1',
  subtext: '#8FA098',
  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',
  dimmed: 'rgba(0,0,0,0.5)',

  // Interactive accent — muted antique gold. Used for buttons, links, active
  // states, focus rings. Deliberately outside the orange/blue team space.
  accent: '#C9A25A',
  accentPressed: '#AD8845',
  accentMuted: 'rgba(201,162,90,0.16)',
  onAccent: '#1A140A',

  success: '#4CAF7D',
  danger: '#D9534F',
  dangerMuted: 'rgba(217,83,79,0.16)',

  team: {
    boere: '#E2622A',
    boereMuted: 'rgba(226,98,42,0.16)',
    british: '#3D7FE0',
    britishMuted: 'rgba(61,127,224,0.16)',
  },
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

export function teamColor(team: 'boere' | 'british'): string {
  return team === 'boere' ? colors.team.boere : colors.team.british;
}

export function teamMutedColor(team: 'boere' | 'british'): string {
  return team === 'boere' ? colors.team.boereMuted : colors.team.britishMuted;
}

export function teamLabel(team: 'boere' | 'british'): string {
  return team === 'boere' ? 'The Boere' : 'The British';
}
