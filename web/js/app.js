import { fetchData } from './api.js';
import { playerFullName, formatHandicap, teamLabel } from './models.js';
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
  const initials = `${player.firstName[0] ?? ''}${player.surname[0] ?? ''}`.toUpperCase();
  const cls = team ? `player-icon ${team}` : 'player-icon';
  return `<span class="${cls}">${esc(initials)}</span>`;
}

function playerNameById(players, id) {
  if (!id) return 'TBC';
  const p = players.find(pl => pl.id === id);
  return p ? esc(playerFullName(p)) : 'Unknown player';
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

  const rosterIds = [
    ...tournament.rosters.boere.map(r => r.playerId),
    ...tournament.rosters.british.map(r => r.playerId),
  ];

  const day1Rows = tournament.matches.day1.map(m => `
    <div class="match-row">
      <div class="caption subtext">Match ${m.match}</div>
      <div class="match-players">
        <span class="boere-text body">${m.boere.map(id => playerNameById(players, id)).join(' &amp; ')}</span>
        <span class="small subtext">vs</span>
        <span class="british-text body">${m.british.map(id => playerNameById(players, id)).join(' &amp; ')}</span>
      </div>
      <div class="small ${m.result !== null ? '' : 'subtext'}">${outcomeLabel(m)}</div>
    </div>
  `).join('');

  const day2Rows = tournament.matches.day2.map(m => `
    <div class="match-row">
      <div class="caption subtext">Match ${m.match}</div>
      <div class="match-players">
        <span class="boere-text body">${playerNameById(players, m.boere)}</span>
        <span class="small subtext">vs</span>
        <span class="british-text body">${playerNameById(players, m.british)}</span>
      </div>
      <div class="small ${m.result !== null ? '' : 'subtext'}">${outcomeLabel(m)}</div>
    </div>
  `).join('');

  const playerRows = rosterIds.map(id => {
    const player = players.find(p => p.id === id);
    if (!player) return '';
    const onBoere = tournament.rosters.boere.some(r => r.playerId === id);
    const team = onBoere ? 'boere' : 'british';
    const rosterEntry = (onBoere ? tournament.rosters.boere : tournament.rosters.british).find(r => r.playerId === id);
    const points = playerPointsInTournament(tournament, id);
    const hcp = rosterEntry && rosterEntry.handicap !== null ? `<span class="small subtext">${esc(formatHandicap(rosterEntry.handicap))}</span>` : '';
    return `
      <div class="player-row">
        ${playerIcon(player, team)}
        <span class="body name">${esc(playerFullName(player))}</span>
        ${hcp}
        <span class="small-strong ${team}-text">${points} pts</span>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="h1">${esc(tournament.name)}</div>
      <div class="small subtext">${sameCourse ? esc(tournament.courses.day1) : `Day 1: ${esc(tournament.courses.day1)} · Day 2: ${esc(tournament.courses.day2)}`}</div>
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
    <div class="card">${playerRows}</div>
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
  return `
    <div class="card">
      <div class="emblem-row">
        <div class="emblem-col">
          <div class="emblem boere">BO</div>
          <div class="small-strong boere-text">The Boere</div>
        </div>
        <div class="h2 subtext">vs</div>
        <div class="emblem-col">
          <div class="emblem british">BR</div>
          <div class="small-strong british-text">The British</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext">Record (W-L-D)</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.record.wins}-${boere.record.losses}-${boere.record.draws}</span>
        <span class="body-strong british-text">${british.record.wins}-${british.record.losses}-${british.record.draws}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext">Points For / Against</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.pointsFor} / ${boere.pointsAgainst}</span>
        <span class="body-strong british-text">${british.pointsFor} / ${british.pointsAgainst}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext">Biggest Tournament Win Margin</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.biggestWinMargin !== null ? boere.biggestWinMargin : '—'}</span>
        <span class="body-strong british-text">${british.biggestWinMargin !== null ? british.biggestWinMargin : '—'}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext">Current Streak</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${boere.currentStreak > 0 ? boere.currentStreak + ' win' + (boere.currentStreak > 1 ? 's' : '') : '—'}</span>
        <span class="body-strong british-text">${british.currentStreak > 0 ? british.currentStreak + ' win' + (british.currentStreak > 1 ? 's' : '') : '—'}</span>
      </div>
    </div>
    <div class="card">
      <div class="caption subtext">Four-ball vs Singles</div>
      <div class="compare-row">
        <span class="body-strong boere-text">${fbSg(boere)}</span>
        <span class="body-strong british-text">${fbSg(british)}</span>
      </div>
    </div>
  `;
}

function playerStatCardHtml(player, s, rankLabel, displayWinPct) {
  const team = s.mostRecentTeam;
  const pct = displayWinPct !== undefined ? displayWinPct : Math.round(s.winPct * 10) / 10;
  const fmt = r => `${r.wins}-${r.losses}-${r.draws}`;
  return `
    <div class="card">
      <div class="rank-header">
        ${rankLabel ? `<span class="rank">${esc(rankLabel)}</span>` : ''}
        ${team ? playerIcon(player, team) : ''}
        <span class="body-strong name">${esc(playerFullName(player))}</span>
        <span class="h2 ${team ? team + '-text' : ''}">${pct.toFixed(1)}%</span>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="caption label">Tournaments</div><div class="value body-strong">${s.tournamentsPlayed}</div></div>
        <div class="stat-cell"><div class="caption label">Team Results</div><div class="value body-strong">${fmt(s.teamResults)}</div></div>
        <div class="stat-cell"><div class="caption label">Four-Ball</div><div class="value body-strong">${fmt(s.fourBall)}</div></div>
        <div class="stat-cell"><div class="caption label">Matchplay</div><div class="value body-strong">${fmt(s.singles)}</div></div>
        <div class="stat-cell"><div class="caption label">Points For</div><div class="value body-strong">${s.pointsFor}</div></div>
        <div class="stat-cell"><div class="caption label">Points Against</div><div class="value body-strong">${s.pointsAgainst}</div></div>
      </div>
    </div>
  `;
}

function renderPlayersStats() {
  const all = computeAllPlayerStats(state.data.tournaments, state.data.players);
  const { ranked, insufficient } = rankPlayers(all);
  const byId = id => state.data.players.find(p => p.id === id);

  const rankedHtml = ranked.map(r => playerStatCardHtml(byId(r.playerId), r, r.rankLabel, r.displayWinPct)).join('');
  const insufficientHtml = insufficient.length
    ? `<div class="caption subtext section-title">Insufficient tournaments (min. 2)</div>` +
      insufficient.map(s => playerStatCardHtml(byId(s.playerId), s)).join('')
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

function render() {
  if (state.error && !state.data) {
    root.innerHTML = `
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
    root.innerHTML = `<div class="loading">Loading…</div>`;
    return;
  }

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

  root.innerHTML = tabs + content + `<button class="refresh-btn" data-action="refresh">Refresh</button>`;
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
      else if (action === 'refresh') { load(); return; }
      render();
    });
  });
}

load();
