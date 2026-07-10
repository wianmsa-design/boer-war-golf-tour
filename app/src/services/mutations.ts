import {
  AppData,
  Day1Match,
  Day2Match,
  Handicap,
  MatchOutcome,
  MatchScore,
  Player,
  RosterEntry,
  TeamId,
  Tournament,
} from '../models';
import { computeStanding } from './stats';

function uid(): string {
  // Not crypto-strong, but only needs to be unique within this document — matches
  // the scale of "a golf tour", not a public-facing system.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function addPlayer(data: AppData, firstName: string, surname: string): AppData {
  const player: Player = { id: uid(), firstName: firstName.trim(), surname: surname.trim() };
  return { ...data, players: [...data.players, player] };
}

export function updatePlayer(data: AppData, id: string, firstName: string, surname: string): AppData {
  return {
    ...data,
    players: data.players.map(p => (p.id === id ? { ...p, firstName: firstName.trim(), surname: surname.trim() } : p)),
  };
}

export function playerHasHistory(data: AppData, playerId: string): boolean {
  return data.tournaments.some(
    t => t.rosters.boere.some(r => r.playerId === playerId) || t.rosters.british.some(r => r.playerId === playerId),
  );
}

export function deletePlayer(data: AppData, id: string): AppData {
  return {
    ...data,
    players: data.players.filter(p => p.id !== id),
    archivedPlayerIds: data.archivedPlayerIds.filter(pid => pid !== id),
  };
}

export function setPlayerArchived(data: AppData, id: string, archived: boolean): AppData {
  return {
    ...data,
    archivedPlayerIds: archived
      ? [...new Set([...data.archivedPlayerIds, id])]
      : data.archivedPlayerIds.filter(pid => pid !== id),
  };
}

function emptyDay1Matches(count: number): Day1Match[] {
  return Array.from({ length: count }, (_, i) => ({
    match: i + 1,
    boere: [null, null],
    british: [null, null],
    result: null,
    score: null,
  }));
}

function emptyDay2Matches(count: number): Day2Match[] {
  return Array.from({ length: count }, (_, i) => ({ match: i + 1, boere: null, british: null, result: null, score: null }));
}

export interface CreateTournamentInput {
  name: string;
  year: number;
  playersPerTeam: number;
  courses: { day1: string; day2: string };
  rosters: { boere: RosterEntry[]; british: RosterEntry[] };
}

export function createTournament(data: AppData, input: CreateTournamentInput): AppData {
  const tournament: Tournament = {
    id: uid(),
    name: input.name,
    year: input.year,
    playersPerTeam: input.playersPerTeam,
    courses: input.courses,
    status: 'active',
    rosters: input.rosters,
    result: { boere: 0, british: 0, winner: null },
    matches: {
      day1: emptyDay1Matches(input.playersPerTeam / 2),
      day2: emptyDay2Matches(input.playersPerTeam),
    },
  };
  return { ...data, tournaments: [...data.tournaments, tournament], currentTournamentId: tournament.id };
}

function mapTournament(data: AppData, id: string, fn: (t: Tournament) => Tournament): AppData {
  return { ...data, tournaments: data.tournaments.map(t => (t.id === id ? fn(t) : t)) };
}

export function updateTournamentDetails(
  data: AppData,
  id: string,
  updates: Partial<Pick<Tournament, 'name' | 'year' | 'courses'>>,
): AppData {
  return mapTournament(data, id, t => ({ ...t, ...updates }));
}

/** Resizes match slots to match a new N. Clears all match results — the match count changed, so old results no longer line up. */
export function changePlayersPerTeam(data: AppData, id: string, newN: number): AppData {
  return mapTournament(data, id, t => ({
    ...t,
    playersPerTeam: newN,
    matches: { day1: emptyDay1Matches(newN / 2), day2: emptyDay2Matches(newN) },
    result: { boere: 0, british: 0, winner: null },
  }));
}

/**
 * Replaces both team rosters. Any match slot referencing a player no longer on
 * either roster is cleared, and that match's result is reset — the pairing it
 * recorded no longer exists.
 */
export function replaceRosters(
  data: AppData,
  id: string,
  rosters: { boere: RosterEntry[]; british: RosterEntry[] },
): AppData {
  const validIds = new Set([...rosters.boere.map(r => r.playerId), ...rosters.british.map(r => r.playerId)]);

  return mapTournament(data, id, t => {
    const day1 = t.matches.day1.map(m => {
      const boere: [string | null, string | null] = [
        m.boere[0] && validIds.has(m.boere[0]) ? m.boere[0] : null,
        m.boere[1] && validIds.has(m.boere[1]) ? m.boere[1] : null,
      ];
      const british: [string | null, string | null] = [
        m.british[0] && validIds.has(m.british[0]) ? m.british[0] : null,
        m.british[1] && validIds.has(m.british[1]) ? m.british[1] : null,
      ];
      const cleared = boere.join() !== m.boere.join() || british.join() !== m.british.join();
      return cleared ? { ...m, boere, british, result: null, score: null } : m;
    });
    const day2 = t.matches.day2.map(m => {
      const boere = m.boere && validIds.has(m.boere) ? m.boere : null;
      const british = m.british && validIds.has(m.british) ? m.british : null;
      const cleared = boere !== m.boere || british !== m.british;
      return cleared ? { ...m, boere, british, result: null, score: null } : m;
    });
    const updated = { ...t, rosters, matches: { day1, day2 } };
    return { ...updated, result: recomputeResult(updated) };
  });
}

export function assignDay1Slot(
  data: AppData,
  tournamentId: string,
  matchIndex: number,
  side: TeamId,
  slot: 0 | 1,
  playerId: string | null,
): AppData {
  return mapTournament(data, tournamentId, t => ({
    ...t,
    matches: {
      ...t.matches,
      day1: t.matches.day1.map((m, i) => {
        if (i !== matchIndex) return m;
        const arr: [string | null, string | null] = [...m[side]] as [string | null, string | null];
        arr[slot] = playerId;
        return { ...m, [side]: arr };
      }),
    },
  }));
}

export function assignDay2Slot(
  data: AppData,
  tournamentId: string,
  matchIndex: number,
  side: TeamId,
  playerId: string | null,
): AppData {
  return mapTournament(data, tournamentId, t => ({
    ...t,
    matches: {
      ...t.matches,
      day2: t.matches.day2.map((m, i) => (i === matchIndex ? { ...m, [side]: playerId } : m)),
    },
  }));
}

function allDecided(tournament: Tournament): boolean {
  return [...tournament.matches.day1, ...tournament.matches.day2].every(m => m.result !== null);
}

/** No winner is recorded until every match is decided — the standing shown while active is a live, provisional total. */
function recomputeResult(tournament: Tournament): Tournament['result'] {
  const standing = computeStanding(tournament);
  if (!allDecided(tournament)) {
    return { boere: standing.boere, british: standing.british, winner: null };
  }
  const winner =
    standing.boere === standing.british ? ('tie' as const)
      : standing.boere > standing.british ? ('boere' as const)
        : ('british' as const);
  return { boere: standing.boere, british: standing.british, winner };
}

export function setDay1Result(
  data: AppData,
  tournamentId: string,
  matchIndex: number,
  result: MatchOutcome | null,
  score: MatchScore | null,
): AppData {
  return mapTournament(data, tournamentId, t => {
    const updated: Tournament = {
      ...t,
      matches: {
        ...t.matches,
        day1: t.matches.day1.map((m, i) => (i === matchIndex ? { ...m, result, score: result === 'halved' ? null : score } : m)),
      },
    };
    return { ...updated, result: recomputeResult(updated) };
  });
}

export function setDay2Result(
  data: AppData,
  tournamentId: string,
  matchIndex: number,
  result: MatchOutcome | null,
  score: MatchScore | null,
): AppData {
  return mapTournament(data, tournamentId, t => {
    const updated: Tournament = {
      ...t,
      matches: {
        ...t.matches,
        day2: t.matches.day2.map((m, i) => (i === matchIndex ? { ...m, result, score: result === 'halved' ? null : score } : m)),
      },
    };
    return { ...updated, result: recomputeResult(updated) };
  });
}

export function endTournament(data: AppData, tournamentId: string): AppData {
  const updated = mapTournament(data, tournamentId, t => {
    const standing = computeStanding(t);
    const winner = standing.boere === standing.british ? ('tie' as const)
      : standing.boere > standing.british ? ('boere' as const) : ('british' as const);
    return { ...t, status: 'ended' as const, result: { boere: standing.boere, british: standing.british, winner } };
  });
  return updated.currentTournamentId === tournamentId ? { ...updated, currentTournamentId: null } : updated;
}

export function deleteTournament(data: AppData, tournamentId: string): AppData {
  return {
    ...data,
    tournaments: data.tournaments.filter(t => t.id !== tournamentId),
    currentTournamentId: data.currentTournamentId === tournamentId ? null : data.currentTournamentId,
  };
}
