import { fetchData } from './api.js';
import { playerFullName, formatHandicap } from './models.js';
import {
  getTournament,
  computeStanding,
  isFullyDecided,
  mostRecentEndedTournament,
  olderEndedTournaments,
  playerPointsInTournament,
  tournamentWinner,
  computeTeamStats,
  computeAllPlayerStats,
  rankPlayers,
} from './stats.js';

const state = {
  data: null,
  error: null,
  tab: 'current', // 'stats' | 'current' | 'historical'
  statsSubTab: 'teams', // 'teams' | 'players'
  historicalSubTab: 'recent', // 'recent' | 'past'
  selectedPastTournamentId: null,
  expandedPlayerIds: new Set(),
};

const root = document.getElementById('app');

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function load() {
  state.error = null;
  render();
  try {
    state.data = await fetchData();
  } catch (e) {
    state.error = e.message || 'Could not load data.';
  }
  render();
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function playerIcon(player, team) {
  if (!team) return `<span class="player-icon"></span>`;
  return `<img class="player-icon ${team}" src="assets/team/${team}_icon_96.png" alt="" />`;
}

function firstNameById(players, id) {
  if (!id) return 'TBC';
  const p = players.find(pl => pl.id === id);
  return p ? esc(p.firstName) : 'Unknown';
}

function outcomeLabel(m) {
  if (m.result === null) return 'Not yet played';
  if (m.result === 'halved') return 'Halved';
  const winner = m.result === 'boere' ? 'Boere' : 'British';
  return m.score ? `${winner} win ${m.score}` : `${winner} win`;
}

function tournamentDetailHtml(tournament, players) {
  const standing = tournament.status === 'ended' ? tournament.result : computeStanding(tournament);
  const sameCourse = tournament.courses.day1 === tournament.courses.day2;
  const tied = standing.boere === standing.british && tournament.status === 'ended';

  const day1Rows = tournament.matches.day1.map(m => `
    <div class="match-row">
      <div class="caption subtext center-text">Match ${m.match}</div>
      <div class="match-players">
        <span class="boere-text body">${m.boere.map(id => firstNameById(players, id)).join(' &amp; ')}</span>
        <span class="small subtext">vs</span>
        <span class="british-text body">${m.british.map(id => firstNameById(players, id)).join(' &amp; ')}</span>
      </div>
      <div class="small center-text ${m.result !== null ? '' : 'subtext'}">${outcomeLabel(m)}</div>
    </div>
  `).join('');

  const day2Rows = tournament.matches.day2.map(m => `
    <div class="match-row">
      <div class="caption subtext center-text">Match ${m.match}</div>
      <div class="match-players">
        <span class="boere-text body">${firstNameById(players, m.boere)}</span>
        <span class="small subtext">vs</span>
        <span class="british-text body">${firstNameById(players, m.british)}</span>
      </div>
      <div class="small center-text ${m.result !== null ? '' : 'subtext'}">${outcomeLabel(m)}</div>
    </div>
  `).join('');

  const leaderboard = [
    ...tournament.rosters.boere.map(r => ({ ...r, team: 'boere' })),
    ...tournament.rosters.british.map(r => ({ ...r, team: 'british' })),
  ]
    .map(entry => ({ entry, points: playerPointsInTournament(tournament, entry.playerId) }))
    .sort((a, b) => b.points - a.points);

  const leaderboardRows = leaderboard.map(({ entry, points }, i) => {
    const player = players.find(p => p.id === entry.playerId);
    if (!player) return '';
    const hcp = entry.handicap !== null ? esc(formatHandicap(entry.handicap)) : '—';
    return `
      <div class="lb-row">
        <span class="small subtext lb-pos">${i + 1}</span>
        <span class="lb-icon">${playerIcon(player, entry.team)}</span>
        <span class="body lb-name">${esc(player.firstName)}</span>
        <span class="small subtext lb-hcp">${hcp}</span>
        <span class="small-strong ${entry.team}-text lb-pts">${points}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="h1 center-text">${esc(tournament.name)}</div>
      <div class="small subtext center-text">${sameCourse ? esc(tournament.courses.day1) : `Day 1: ${esc(tournament.courses.day1)} · Day 2: ${esc(tournament.courses.day2)}`}</div>
      <div class="standing-row">
        <span class="score boere-text">${standing.boere}</span>
        <span class="h2 subtext">${tied ? 'Tied' : 'vs'}</span>
        <span class="score british-text">${standing.british}</span>
      </div>
      <div class="standing-labels">
        <span class="caption boere-text">Boere</span>
        <span class="caption british-text">British</span>
      </div>
    </div>

    <div class="caption subtext section-title">Day 1 · Four-ball</div>
    <div class="card">${day1Rows}</div>

    <div class="caption subtext section-title">Day 2 · Singles</div>
    <div class="card">${day2Rows}</div>

    <div class="caption subtext section-title">Players</div>
    <div class="card lb-card">
      <div class="lb-row lb-header">
        <span class="caption subtext lb-pos">#</span>
        <span class="lb-icon"></span>
        <span class="caption subtext lb-name">PLAYER</span>
        <span class="caption subtext lb-hcp">HCP</span>
        <span class="caption subtext lb-pts">PTS</span>
      </div>
      ${leaderboardRows}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Current tab
// ---------------------------------------------------------------------------

function renderCurrentTab() {
  const tournament = getTournament(state.data.tournaments, state.data.currentTournamentId);
  const active = tournament && tournament.status === 'active' ? tournament : null;
  if (!active) {
    return `
      <div class="card">
        <div class="h2">No active tournament</div>
        <div class="body subtext">The next tournament hasn't been created yet.</div>
      </div>
    `;
  }
  return tournamentDetailHtml(active, state.data.players);
}

// ---------------------------------------------------------------------------
// Stats tab
// ---------------------------------------------------------------------------

function renderTeamsStats() {
  const stats = computeTeamStats(state.data.tournaments);
  const { boere, british } = stats;
  const fbSg = (t) => `FB ${t.fourBall.winPct.toFixed(0)}%  ·  SG ${t.singles.winPct.toFixed(0)}%`;
  const streakStr = (n) => n > 0 ? `${n} win${n > 1 ? 's' : ''}` : '—';
  return `
    <div class="card">
      <div class="emblem-row">
        <div class="emblem-col">
          <img class="emblem" src="assets/team/boere_emblem_512.png" alt="Boere emblem" />
          <div class="small-strong boere-text">The Boere</div>
        </div>
        <div class="h2 subtext">vs</div>
        <div class="emblem-col">
          <img class="emblem" src="assets/team/british_emblem_512.png" alt="British emblem" />
          <div class="small-strong british-text">The British</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Record (W-L-D)</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.record.wins}-${boere.record.losses}-${boere.record.draws}</span>
        <span class="body-strong british-text">${british.record.wins}-${british.record.losses}-${british.record.draws}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Points For / Against</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.pointsFor} / ${boere.pointsAgainst}</span>
        <span class="body-strong british-text">${british.pointsFor} / ${british.pointsAgainst}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Biggest Tournament Win Margin</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.biggestWinMargin !== null ? boere.biggestWinMargin : '—'}</span>
        <span class="body-strong british-text">${british.biggestWinMargin !== null ? british.biggestWinMargin : '—'}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Current Streak</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${streakStr(boere.currentStreak)}</span>
        <span class="body-strong british-text">${streakStr(british.currentStreak)}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Best Streak</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${streakStr(boere.bestStreak)}</span>
        <span class="body-strong british-text">${streakStr(british.bestStreak)}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext center-text">Four-ball vs Singles</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${fbSg(boere)}</span>
        <span class="body-strong british-text">${fbSg(british)}</span>
      </div>
    </div>
  `;
}

function combinedRecord(s) {
  return {
    wins: s.fourBall.wins + s.singles.wins,
    losses: s.fourBall.losses + s.singles.losses,
    draws: s.fourBall.draws + s.singles.draws,
  };
}

function playerTableHeaderHtml() {
  return `
    <div class="lb-row lb-header">
      <span class="caption subtext lb-pos">POS</span>
      <span class="lb-icon"></span>
      <span class="caption subtext lb-name">PLAYER</span>
      <span class="caption subtext pt-record">W-L-D</span>
      <span class="caption subtext pt-pct">WIN%</span>
    </div>
  `;
}

function playerRowHtml(player, s, rankLabel, displayWinPct) {
  const team = s.mostRecentTeam;
  const pct = displayWinPct !== undefined ? displayWinPct : Math.round(s.winPct * 10) / 10;
  const fmt = r => `${r.wins}-${r.losses}-${r.draws}`;
  const record = combinedRecord(s);
  const expanded = state.expandedPlayerIds.has(s.playerId);
  return `
    <div class="pt-wrap">
      <div class="lb-row pt-row" data-action="toggle-player" data-value="${esc(s.playerId)}">
        <span class="small-strong subtext lb-pos" style="color:var(--accent)">${esc(rankLabel ?? '—')}</span>
        <span class="lb-icon">${team ? playerIcon(player, team) : ''}</span>
        <span class="body lb-name">${esc(playerFullName(player))}</span>
        <span class="small pt-record">${fmt(record)}</span>
        <span class="small-strong ${team ? team + '-text' : ''} pt-pct">${pct.toFixed(1)}%</span>
        <span class="chev">${expanded ? '⌃' : '⌄'}</span>
      </div>
      ${expanded ? `
        <div class="stat-grid pt-detail">
          <div class="stat-cell"><div class="caption label">Tournaments</div><div class="value body-strong">${s.tournamentsPlayed}</div></div>
          <div class="stat-cell"><div class="caption label">Team Results</div><div class="value body-strong">${fmt(s.teamResults)}</div></div>
          <div class="stat-cell"><div class="caption label">Four-Ball</div><div class="value body-strong">${fmt(s.fourBall)}</div></div>
          <div class="stat-cell"><div class="caption label">Matchplay</div><div class="value body-strong">${fmt(s.singles)}</div></div>
          <div class="stat-cell"><div class="caption label">Points For</div><div class="value body-strong">${s.pointsFor}</div></div>
          <div class="stat-cell"><div class="caption label">Points Against</div><div class="value body-strong">${s.pointsAgainst}</div></div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderPlayersStats() {
  const all = computeAllPlayerStats(state.data.tournaments, state.data.players);
  const { ranked, insufficient } = rankPlayers(all);
  const byId = id => state.data.players.find(p => p.id === id);

  const rankedHtml = `<div class="card lb-card">${playerTableHeaderHtml()}${ranked.map(r => playerRowHtml(byId(r.playerId), r, r.rankLabel, r.displayWinPct)).join('')}</div>`;
  const insufficientHtml = insufficient.length
    ? `<div class="caption subtext section-title">Insufficient tournaments (min. 2)</div>` +
      `<div class="card lb-card">${playerTableHeaderHtml()}${insufficient.map(s => playerRowHtml(byId(s.playerId), s)).join('')}</div>`
    : '';

  return rankedHtml + insufficientHtml;
}

function renderStatsTab() {
  const endedCount = state.data.tournaments.filter(t => t.status === 'ended').length;
  const sub = `
    <div class="segmented">
      <button data-action="stats-sub" data-value="teams" class="${state.statsSubTab === 'teams' ? 'active' : ''}">Teams</button>
      <button data-action="stats-sub" data-value="players" class="${state.statsSubTab === 'players' ? 'active' : ''}">Players</button>
    </div>
  `;
  if (endedCount === 0) {
    return sub + `<div class="card"><div class="h2">No stats yet</div><div class="body subtext">Stats appear here once a tournament has ended.</div></div>`;
  }
  return sub + (state.statsSubTab === 'teams' ? renderTeamsStats() : renderPlayersStats());
}

// ---------------------------------------------------------------------------
// Historical tab
// ---------------------------------------------------------------------------

function renderHistoricalTab() {
  const recent = mostRecentEndedTournament(state.data.tournaments);
  const older = olderEndedTournaments(state.data.tournaments);
  const sub = `
    <div class="segmented">
      <button data-action="historical-sub" data-value="recent" class="${state.historicalSubTab === 'recent' ? 'active' : ''}">Recent</button>
      <button data-action="historical-sub" data-value="past" class="${state.historicalSubTab === 'past' ? 'active' : ''}">Past</button>
    </div>
  `;

  if (state.historicalSubTab === 'recent') {
    if (!recent) return sub + `<div class="card"><div class="h2">No ended tournaments yet</div></div>`;
    return sub + tournamentDetailHtml(recent, state.data.players);
  }

  if (state.selectedPastTournamentId) {
    const t = state.data.tournaments.find(tt => tt.id === state.selectedPastTournamentId);
    if (!t) { state.selectedPastTournamentId = null; }
    else {
      return sub +
        `<button class="back-link" data-action="clear-past-selection">&larr; All tournaments</button>` +
        tournamentDetailHtml(t, state.data.players);
    }
  }

  if (older.length === 0) {
    return sub + `<div class="card"><div class="h2">Nothing here yet</div><div class="body subtext">Older tournaments will show up here once there's more than one.</div></div>`;
  }

  const rows = older.map(t => {
    const standing = computeStanding(t);
    return `
      <div class="card list-row" data-action="select-past" data-value="${esc(t.id)}">
        <div class="info">
          <span class="body-strong">${esc(t.name)}</span>
          <span class="small subtext">${t.courses.day1 === t.courses.day2 ? esc(t.courses.day1) : esc(t.courses.day1) + ' · ' + esc(t.courses.day2)}</span>
        </div>
        <span class="body-strong boere-text">${standing.boere}</span>
        <span class="small subtext">–</span>
        <span class="body-strong british-text">${standing.british}</span>
        <span class="chev">›</span>
      </div>
    `;
  }).join('');

  return sub + rows;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

const TAB_TITLES = { stats: 'Stats', current: 'Active Tournament', historical: 'Historical' };

function render() {
  if (state.error && !state.data) {
    root.innerHTML = `
      <div class="page-title">Boer War Golf Tour</div>
      <div class="card">
        <div class="h2">Couldn't load data</div>
        <div class="body subtext">${esc(state.error)}</div>
      </div>
      <button class="refresh-btn" data-action="refresh">Try again</button>
    `;
    attachHandlers();
    return;
  }

  if (!state.data) {
    root.innerHTML = `<div class="page-title">Boer War Golf Tour</div><div class="loading">Loading…</div>`;
    return;
  }

  const title = `<div class="page-title">${esc(TAB_TITLES[state.tab])}</div>`;

  const tabs = `
    <div class="tabbar">
      <button data-action="tab" data-value="stats" class="tab-btn ${state.tab === 'stats' ? 'active' : ''}">Stats</button>
      <button data-action="tab" data-value="current" class="tab-btn ${state.tab === 'current' ? 'active' : ''}">Active Tournament</button>
      <button data-action="tab" data-value="historical" class="tab-btn ${state.tab === 'historical' ? 'active' : ''}">Historical</button>
    </div>
  `;

  let content;
  if (state.tab === 'stats') content = renderStatsTab();
  else if (state.tab === 'current') content = renderCurrentTab();
  else content = renderHistoricalTab();

  root.innerHTML = title + tabs + content + `<button class="refresh-btn" data-action="refresh">Refresh</button>`;
  attachHandlers();
}

function attachHandlers() {
  root.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      const value = el.getAttribute('data-value');
      if (action === 'tab') state.tab = value;
      else if (action === 'stats-sub') state.statsSubTab = value;
      else if (action === 'historical-sub') { state.historicalSubTab = value; state.selectedPastTournamentId = null; }
      else if (action === 'select-past') state.selectedPastTournamentId = value;
      else if (action === 'clear-past-selection') state.selectedPastTournamentId = null;
      else if (action === 'toggle-player') {
        if (state.expandedPlayerIds.has(value)) state.expandedPlayerIds.delete(value);
        else state.expandedPlayerIds.add(value);
      }
      else if (action === 'refresh') { load(); return; }
      render();
    });
  });
}

load();
