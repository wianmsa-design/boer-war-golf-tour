export function playerFullName(player) {
  return `${player.firstName} ${player.surname}`;
}

/** Formats an internal handicap integer (-2..0..36) as its display string ("+2", "+1", "16"). Blank for null. */
export function formatHandicap(h) {
  if (h === null || h === undefined) return '';
  if (h < 0) return `+${-h}`;
  return `${h}`;
}

export function teamLabel(team) {
  return team === 'boere' ? 'The Boere' : 'The British';
}
