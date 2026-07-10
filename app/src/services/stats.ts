import { Day1Match, Day2Match, Handicap, MatchOutcome, Player, TeamId, Tournament } from '../models';

export function getTournament(tournaments: Tournament[], id: string | null): Tournament | undefined {
  if (!id) return undefined;
  return tournaments.find(t => t.id === id);
}

function matchPoints(result: Day1Match['result'] | Day2Match['result']): { boere: number; british: number } {
  if (result === 'boere') return { boere: 1, british: 0 };
  if (result === 'british') return { boere: 0, british: 1 };
  if (result === 'halved') return { boere: 0.5, british: 0.5 };
  return { boere: 0, british: 0 };
}

/** Sums only decided matches — safe to call on an in-progress tournament. */
export function computeStanding(tournament: Tournament): { boere: number; british: number } {
  let boere = 0;
  let british = 0;
  for (const m of [...tournament.matches.day1, ...tournament.matches.day2]) {
    const pts = matchPoints(m.result);
    boere += pts.boere;
    british += pts.british;
  }
  return { boere, british };
}

export function isFullyDecided(tournament: Tournament): boolean {
  return [...tournament.matches.day1, ...tournament.matches.day2].every(m => m.result !== null);
}

export function isDay1FullySetup(tournament: Tournament): boolean {
  return tournament.matches.day1.every(m => m.boere.every(Boolean) && m.british.every(Boolean));
}

export function isDay2FullySetup(tournament: Tournament): boolean {
  return tournament.matches.day2.every(m => !!m.boere && !!m.british);
}

export function decidedMatchCount(tournament: Tournament): number {
  return [...tournament.matches.day1, ...tournament.matches.day2].filter(m => m.result !== null).length;
}

export function totalMatchCount(tournament: Tournament): number {
  return tournament.matches.day1.length + tournament.matches.day2.length;
}

/** Most recently created tournament (by array position — tournaments are appended in creation order). */
export function mostRecentTournament(tournaments: Tournament[]): Tournament | undefined {
  return tournaments[tournaments.length - 1];
}

/** Most recently *ended* tournament, for the Historical "Recent" tab. */
export function mostRecentEndedTournament(tournaments: Tournament[]): Tournament | undefined {
  const ended = tournaments.filter(t => t.status === 'ended');
  return ended[ended.length - 1];
}

export function olderEndedTournaments(tournaments: Tournament[]): Tournament[] {
  const ended = tournaments.filter(t => t.status === 'ended');
  return ended.slice(0, -1).reverse();
}

/** Handicap follows the player, not the team — looks across both rosters, most recent tournament first. */
export function mostRecentHandicap(tournaments: Tournament[], playerId: string): Handicap {
  const withPlayer = [...tournaments]
    .filter(t => t.rosters.boere.some(r => r.playerId === playerId) || t.rosters.british.some(r => r.playerId === playerId))
    .sort((a, b) => a.year - b.year);
  for (let i = withPlayer.length - 1; i >= 0; i--) {
    const t = withPlayer[i];
    const entry = t.rosters.boere.find(r => r.playerId === playerId) ?? t.rosters.british.find(r => r.playerId === playerId);
    if (entry && entry.handicap !== null) return entry.handicap;
  }
  return null;
}

export function findDay1Match(tournament: Tournament, playerId: string): Day1Match | undefined {
  return tournament.matches.day1.find(m => m.boere.includes(playerId) || m.british.includes(playerId));
}

export function findDay2Match(tournament: Tournament, playerId: string): Day2Match | undefined {
  return tournament.matches.day2.find(m => m.boere === playerId || m.british === playerId);
}

/** Total points (1 per win, 0.5 per halve) this player earned in this tournament, across both days. */
export function playerPointsInTournament(tournament: Tournament, playerId: string): number {
  let points = 0;
  const day1 = findDay1Match(tournament, playerId);
  if (day1) {
    const onBoere = day1.boere.includes(playerId);
    if (day1.result === 'halved') points += 0.5;
    else if (day1.result === (onBoere ? 'boere' : 'british')) points += 1;
  }
  const day2 = findDay2Match(tournament, playerId);
  if (day2) {
    const onBoere = day2.boere === playerId;
    if (day2.result === 'halved') points += 0.5;
    else if (day2.result === (onBoere ? 'boere' : 'british')) points += 1;
  }
  return points;
}

// ---------------------------------------------------------------------------
// All-time Stats (ended tournaments only). Nothing here is stored — every
// figure is recomputed from `matches` on every read, per spec §10.3.
// ---------------------------------------------------------------------------

function endedChronological(tournaments: Tournament[]): Tournament[] {
  return tournaments.filter(t => t.status === 'ended').sort((a, b) => a.year - b.year);
}

export function tournamentWinner(tournament: Tournament): TeamId | 'tie' {
  const s = computeStanding(tournament);
  if (s.boere > s.british) return 'boere';
  if (s.british > s.boere) return 'british';
  return 'tie';
}

function teamDayPoints(tournament: Tournament, team: TeamId, day: 'day1' | 'day2'): number {
  let pts = 0;
  for (const m of tournament.matches[day]) {
    if (m.result === 'halved') pts += 0.5;
    else if (m.result === team) pts += 1;
  }
  return pts;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface DaySplit {
  pointsFor: number;
  pointsAvailable: number;
  winPct: number;
}

export interface TeamStats {
  team: TeamId;
  record: TeamRecord;
  pointsFor: number;
  pointsAgainst: number;
  biggestWinMargin: number | null;
  /** Consecutive most-recent tournament wins. A tie or a loss resets it to 0. */
  currentStreak: number;
  /** Longest winning streak anywhere in the team's history (may equal currentStreak). */
  bestStreak: number;
  fourBall: DaySplit;
  singles: DaySplit;
}

function computeOneTeamStats(ended: Tournament[], team: TeamId): TeamStats {
  const record: TeamRecord = { wins: 0, losses: 0, draws: 0 };
  let pointsFor = 0;
  let pointsAgainst = 0;
  let biggestWinMargin: number | null = null;
  let fbFor = 0, fbAvail = 0, sgFor = 0, sgAvail = 0;

  for (const t of ended) {
    const standing = computeStanding(t);
    const own = team === 'boere' ? standing.boere : standing.british;
    const opp = team === 'boere' ? standing.british : standing.boere;
    pointsFor += own;
    pointsAgainst += opp;
    if (own > opp) {
      record.wins++;
      const margin = own - opp;
      if (biggestWinMargin === null || margin > biggestWinMargin) biggestWinMargin = margin;
    } else if (own < opp) {
      record.losses++;
    } else {
      record.draws++;
    }
    fbFor += teamDayPoints(t, team, 'day1');
    fbAvail += t.matches.day1.length;
    sgFor += teamDayPoints(t, team, 'day2');
    sgAvail += t.matches.day2.length;
  }

  let currentStreak = 0;
  for (let i = ended.length - 1; i >= 0; i--) {
    if (tournamentWinner(ended[i]) === team) currentStreak++;
    else break;
  }

  let bestStreak = 0;
  let running = 0;
  for (const t of ended) {
    if (tournamentWinner(t) === team) {
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  return {
    team,
    record,
    pointsFor,
    pointsAgainst,
    biggestWinMargin,
    currentStreak,
    bestStreak,
    fourBall: { pointsFor: fbFor, pointsAvailable: fbAvail, winPct: fbAvail ? (fbFor / fbAvail) * 100 : 0 },
    singles: { pointsFor: sgFor, pointsAvailable: sgAvail, winPct: sgAvail ? (sgFor / sgAvail) * 100 : 0 },
  };
}

export function computeTeamStats(tournaments: Tournament[]): { boere: TeamStats; british: TeamStats } {
  const ended = endedChronological(tournaments);
  return { boere: computeOneTeamStats(ended, 'boere'), british: computeOneTeamStats(ended, 'british') };
}

export interface PlayerRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface PlayerStats {
  playerId: string;
  tournamentsPlayed: number;
  /** Team as of their most recent ended-tournament appearance; null if they've never played. */
  mostRecentTeam: TeamId | null;
  teamResults: PlayerRecord;
  fourBall: PlayerRecord;
  singles: PlayerRecord;
  pointsFor: number;
  pointsAgainst: number;
  matchesPlayed: number;
  /** 0..100, combined four-ball + singles, Ryder Cup points-percentage style. */
  winPct: number;
}

function outcomeFor(result: MatchOutcome | null, ownTeam: TeamId): 'W' | 'L' | 'D' | null {
  if (result === null) return null;
  if (result === 'halved') return 'D';
  return result === ownTeam ? 'W' : 'L';
}

export function computePlayerStats(tournaments: Tournament[], playerId: string): PlayerStats {
  const ended = endedChronological(tournaments);

  let tournamentsPlayed = 0;
  let mostRecentTeam: TeamId | null = null;
  const teamResults: PlayerRecord = { wins: 0, losses: 0, draws: 0 };
  const fourBall: PlayerRecord = { wins: 0, losses: 0, draws: 0 };
  const singles: PlayerRecord = { wins: 0, losses: 0, draws: 0 };
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const t of ended) {
    const onBoere = t.rosters.boere.some(r => r.playerId === playerId);
    const onBritish = t.rosters.british.some(r => r.playerId === playerId);
    if (!onBoere && !onBritish) continue;
    const team: TeamId = onBoere ? 'boere' : 'british';
    tournamentsPlayed++;
    mostRecentTeam = team;

    const standing = computeStanding(t);
    const own = team === 'boere' ? standing.boere : standing.british;
    const opp = team === 'boere' ? standing.british : standing.boere;
    if (own > opp) teamResults.wins++;
    else if (own < opp) teamResults.losses++;
    else teamResults.draws++;

    const d1 = findDay1Match(t, playerId);
    const o1 = d1 ? outcomeFor(d1.result, team) : null;
    if (o1 === 'W') { fourBall.wins++; pointsFor += 1; }
    else if (o1 === 'L') { fourBall.losses++; pointsAgainst += 1; }
    else if (o1 === 'D') { fourBall.draws++; pointsFor += 0.5; pointsAgainst += 0.5; }

    const d2 = findDay2Match(t, playerId);
    const o2 = d2 ? outcomeFor(d2.result, team) : null;
    if (o2 === 'W') { singles.wins++; pointsFor += 1; }
    else if (o2 === 'L') { singles.losses++; pointsAgainst += 1; }
    else if (o2 === 'D') { singles.draws++; pointsFor += 0.5; pointsAgainst += 0.5; }
  }

  const matchesPlayed = fourBall.wins + fourBall.losses + fourBall.draws
    + singles.wins + singles.losses + singles.draws;
  const totalWins = fourBall.wins + singles.wins;
  const totalDraws = fourBall.draws + singles.draws;
  const winPct = matchesPlayed > 0 ? ((totalWins + 0.5 * totalDraws) / matchesPlayed) * 100 : 0;

  return {
    playerId,
    tournamentsPlayed,
    mostRecentTeam,
    teamResults,
    fourBall,
    singles,
    pointsFor,
    pointsAgainst,
    matchesPlayed,
    winPct,
  };
}

export function computeAllPlayerStats(tournaments: Tournament[], players: Player[]): PlayerStats[] {
  return players.map(p => computePlayerStats(tournaments, p.id));
}

export interface RankedPlayerStats extends PlayerStats {
  rank: number;
  /** "T1", "T3", "8" — golf-leaderboard convention: ties share a position and the next rank skips accordingly. */
  rankLabel: string;
  /** Win % rounded to 1 decimal — the precision actually shown, and what ties are computed on. */
  displayWinPct: number;
}

/**
 * Splits players into a main ranking (>= minTournaments) and an "insufficient
 * tournaments" bucket, per spec §7.2. Ties share a position; the next distinct
 * value skips ranks by the number of players tied above it (T1, T1, T3, T3, T5...).
 */
export function rankPlayers(
  stats: PlayerStats[],
  minTournaments = 2,
): { ranked: RankedPlayerStats[]; insufficient: PlayerStats[] } {
  const withHistory = stats.filter(s => s.tournamentsPlayed > 0);
  const eligible = withHistory.filter(s => s.tournamentsPlayed >= minTournaments);
  const insufficient = withHistory.filter(s => s.tournamentsPlayed < minTournaments);

  const withDisplay = eligible.map(s => ({ ...s, displayWinPct: Math.round(s.winPct * 10) / 10 }));

  const ranked: RankedPlayerStats[] = withDisplay.map(s => {
    const rank = 1 + withDisplay.filter(o => o.displayWinPct > s.displayWinPct).length;
    const tiedCount = withDisplay.filter(o => o.displayWinPct === s.displayWinPct).length;
    return { ...s, rank, rankLabel: tiedCount > 1 ? `T${rank}` : `${rank}` };
  }).sort((a, b) => a.rank - b.rank);

  return { ranked, insufficient };
}
