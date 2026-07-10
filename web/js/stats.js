// Ported 1:1 from app/src/services/stats.ts. Keep in sync — this is the same
// business logic, just without TypeScript types. Nothing here is stored;
// every figure is recomputed from `matches` on every read (spec §10.3).

export function getTournament(tournaments, id) {
  if (!id) return undefined;
  return tournaments.find(t => t.id === id);
}

function matchPoints(result) {
  if (result === 'boere') return { boere: 1, british: 0 };
  if (result === 'british') return { boere: 0, british: 1 };
  if (result === 'halved') return { boere: 0.5, british: 0.5 };
  return { boere: 0, british: 0 };
}

export function computeStanding(tournament) {
  let boere = 0;
  let british = 0;
  for (const m of [...tournament.matches.day1, ...tournament.matches.day2]) {
    const pts = matchPoints(m.result);
    boere += pts.boere;
    british += pts.british;
  }
  return { boere, british };
}

export function isFullyDecided(tournament) {
  return [...tournament.matches.day1, ...tournament.matches.day2].every(m => m.result !== null);
}

export function mostRecentEndedTournament(tournaments) {
  const ended = tournaments.filter(t => t.status === 'ended');
  return ended[ended.length - 1];
}

export function olderEndedTournaments(tournaments) {
  const ended = tournaments.filter(t => t.status === 'ended');
  return ended.slice(0, -1).reverse();
}

export function findDay1Match(tournament, playerId) {
  return tournament.matches.day1.find(m => m.boere.includes(playerId) || m.british.includes(playerId));
}

export function findDay2Match(tournament, playerId) {
  return tournament.matches.day2.find(m => m.boere === playerId || m.british === playerId);
}

export function playerPointsInTournament(tournament, playerId) {
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

function endedChronological(tournaments) {
  return tournaments.filter(t => t.status === 'ended').sort((a, b) => a.year - b.year);
}

export function tournamentWinner(tournament) {
  const s = computeStanding(tournament);
  if (s.boere > s.british) return 'boere';
  if (s.british > s.boere) return 'british';
  return 'tie';
}

function teamDayPoints(tournament, team, day) {
  let pts = 0;
  for (const m of tournament.matches[day]) {
    if (m.result === 'halved') pts += 0.5;
    else if (m.result === team) pts += 1;
  }
  return pts;
}

function computeOneTeamStats(ended, team) {
  const record = { wins: 0, losses: 0, draws: 0 };
  let pointsFor = 0;
  let pointsAgainst = 0;
  let biggestWinMargin = null;
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

export function computeTeamStats(tournaments) {
  const ended = endedChronological(tournaments);
  return { boere: computeOneTeamStats(ended, 'boere'), british: computeOneTeamStats(ended, 'british') };
}

function outcomeFor(result, ownTeam) {
  if (result === null) return null;
  if (result === 'halved') return 'D';
  return result === ownTeam ? 'W' : 'L';
}

export function computePlayerStats(tournaments, playerId) {
  const ended = endedChronological(tournaments);

  let tournamentsPlayed = 0;
  let mostRecentTeam = null;
  const teamResults = { wins: 0, losses: 0, draws: 0 };
  const fourBall = { wins: 0, losses: 0, draws: 0 };
  const singles = { wins: 0, losses: 0, draws: 0 };
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const t of ended) {
    const onBoere = t.rosters.boere.some(r => r.playerId === playerId);
    const onBritish = t.rosters.british.some(r => r.playerId === playerId);
    if (!onBoere && !onBritish) continue;
    const team = onBoere ? 'boere' : 'british';
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

export function computeAllPlayerStats(tournaments, players) {
  return players.map(p => computePlayerStats(tournaments, p.id));
}

/**
 * Splits players into a main ranking (>= minTournaments) and an "insufficient
 * tournaments" bucket, per spec §7.2. Ties share a position; the next distinct
 * value skips ranks by the number of players tied above it (T1, T1, T3, T3, T5...).
 */
export function rankPlayers(stats, minTournaments = 2) {
  const withHistory = stats.filter(s => s.tournamentsPlayed > 0);
  const eligible = withHistory.filter(s => s.tournamentsPlayed >= minTournaments);
  const insufficient = withHistory.filter(s => s.tournamentsPlayed < minTournaments);

  const withDisplay = eligible.map(s => ({ ...s, displayWinPct: Math.round(s.winPct * 10) / 10 }));

  const ranked = withDisplay.map(s => {
    const rank = 1 + withDisplay.filter(o => o.displayWinPct > s.displayWinPct).length;
    const tiedCount = withDisplay.filter(o => o.displayWinPct === s.displayWinPct).length;
    return { ...s, rank, rankLabel: tiedCount > 1 ? `T${rank}` : `${rank}` };
  }).sort((a, b) => a.rank - b.rank);

  return { ranked, insufficient };
}
