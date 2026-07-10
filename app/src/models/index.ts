export type TeamId = 'boere' | 'british';

export interface Player {
  id: string;
  firstName: string;
  surname: string;
}

/** Whole number, -2..0 internally. -2 displays "+2", -1 displays "+1", 0 displays "0". null = not recorded. */
export type Handicap = number | null;

export interface RosterEntry {
  playerId: string;
  handicap: Handicap;
}

export type MatchOutcome = TeamId | 'halved';

/** Canonical 18-hole matchplay margins, plus "Halved" as a separate outcome. */
export type MatchScore =
  | '1up' | '2up' | '2&1' | '3&2' | '4&3' | '5&4' | '6&5' | '7&6' | '8&7' | '9&8' | '10&8';

export interface Day1Match {
  match: number;
  /** Two Boere player IDs; null while unassigned during Match Setup. */
  boere: [string | null, string | null];
  /** Two British player IDs; null while unassigned during Match Setup. */
  british: [string | null, string | null];
  result: MatchOutcome | null;
  score: MatchScore | null;
}

export interface Day2Match {
  match: number;
  boere: string | null;
  british: string | null;
  result: MatchOutcome | null;
  score: MatchScore | null;
}

export interface TournamentResult {
  boere: number;
  british: number;
  /** null only while the tournament is active and no matches are decided yet. */
  winner: TeamId | 'tie' | null;
}

export type TournamentStatus = 'active' | 'ended';

export interface Tournament {
  id: string;
  name: string;
  year: number;
  /** N, always even. Total players = 2N. */
  playersPerTeam: number;
  courses: { day1: string; day2: string };
  status: TournamentStatus;
  rosters: { boere: RosterEntry[]; british: RosterEntry[] };
  /** Convenience totals; must always reconcile with matches. Recomputed on every match write. */
  result: TournamentResult;
  matches: { day1: Day1Match[]; day2: Day2Match[] };
}

export interface AppData {
  schemaVersion: number;
  players: Player[];
  archivedPlayerIds: string[];
  tournaments: Tournament[];
  currentTournamentId: string | null;
}

export function isArchived(data: AppData, playerId: string): boolean {
  return data.archivedPlayerIds.includes(playerId);
}

export function findPlayer(data: AppData, playerId: string): Player | undefined {
  return data.players.find(p => p.id === playerId);
}

export function playerFullName(player: Player): string {
  return `${player.firstName} ${player.surname}`;
}

/** Formats an internal handicap integer (-2..0) as its display string ("+2", "+1", "0"). Blank for null. */
export function formatHandicap(h: Handicap): string {
  if (h === null) return '';
  if (h < 0) return `+${-h}`;
  return `${h}`;
}

export const MIN_HANDICAP = -2; // "+2"
export const MAX_HANDICAP = 36;

/** Parses a display string ("+2", "16", "0") back to the internal integer. Returns null if blank or out of range. */
export function parseHandicapInput(text: string): Handicap {
  const t = text.trim();
  if (t === '') return null;
  if (t.startsWith('+')) {
    const n = parseInt(t.slice(1), 10);
    if (!Number.isFinite(n) || n < 1 || n > 2) return null;
    return -n;
  }
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > MAX_HANDICAP) return null;
  return n;
}
