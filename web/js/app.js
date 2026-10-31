import { fetchData } from './api.js';
import { formatHandicap, teamLabel } from './models.js';
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

const ICON_PATHS = {
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 10-12h-6l0-8Z"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1-2-1-3 0-4-4 1-6 4-6 7 0 1 1 2 2 2 1 0 1-1 1-2 1 1 1 2 1 3 0 2-2 2-2 5a3 3 0 0 0 3 3"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="m8 14-2 8 6-3 6 3-2-8"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M17 21v-1a6 6 0 0 0-3-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

function pageHeader(title, subtitle) {
  return `
    <div class="page-header">
      <div class="page-title">${esc(title)}</div>
      <div class="page-tagline">${esc(subtitle)}</div>
    </div>
  `;
}

function sectionHeadHtml(title) {
  return `<div class="section-head"><span class="caption subtext">${title}</span><span class="section-rule"></span></div>`;
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
  return `
    <span class="player-icon">
      <span class="player-icon-clip"><img src="assets/team/${team}_icon_96.png" alt="" /></span>
    </span>
  `;
}

function betterOf(a, b) {
  if (a > b) return 'boere';
  if (b > a) return 'british';
  return null;
}

function betterMargin(a, b) {
  if (a === null && b === null) return null;
  if (a === null) return 'british';
  if (b === null) return 'boere';
  return betterOf(a, b);
}

function firstNameById(players, id) {
  if (!id) return 'TBC';
  const p = players.find(pl => pl.id === id);
  return p ? esc(p.firstName) : 'Unknown';
}

function outcomeLabel(m) {
  if (m.result === null) return 'Not yet played';
  if (m.result === 'halved') return 'Halved';
  const winner = teamLabel(m.result);
  return m.score ? `${winner} win ${m.score}` : `${winner} win`;
}

function tournamentDetailHtml(tournament, players) {
  const standing = tournament.status === 'ended' ? tournament.result : computeStanding(tournament);
  const sameCourse = tournament.courses.day1 === tournament.courses.day2;
  const tied = standing.boere === standing.british && tournament.status === 'ended';
  const winnerSide = standing.boere > standing.british ? 'boere' : standing.british > standing.boere ? 'british' : null;
  const courseLabel = sameCourse
    ? esc(tournament.courses.day1)
    : `Day 1 · ${esc(tournament.courses.day1)} &nbsp;·&nbsp; Day 2 · ${esc(tournament.courses.day2)}`;
  const total = standing.boere + standing.british;
  const seriesBar = total === 0 ? '' : `
    <div class="series-bar">
      <span class="series-seg" style="flex:${standing.boere};background:${winnerSide === 'boere' ? 'var(--accent)' : 'var(--accent-muted)'}"></span>
      <span class="series-seg" style="flex:${standing.british};background:${winnerSide === 'british' ? 'var(--accent)' : 'var(--accent-muted)'}"></span>
    </div>
  `;

  const matchRow = (m, boereLabel, britishLabel) => {
    const decided = m.result !== null;
    return `
      <div class="match-row">
        <div class="match-meta">
          <span class="caption match-no">Match ${m.match}</span>
          <span class="small ${decided ? '' : 'subtext'}">${outcomeLabel(m)}</span>
        </div>
        <div class="match-teams">
          <span class="body match-team ${m.result === 'boere' ? 'winner-label' : ''}">${boereLabel}</span>
          <span class="caption match-vs">v</span>
          <span class="body match-team right ${m.result === 'british' ? 'winner-label' : ''}">${britishLabel}</span>
        </div>
      </div>
    `;
  };

  const day1Rows = tournament.matches.day1.map(m => matchRow(
    m,
    m.boere.map(id => firstNameById(players, id)).join(' &amp; '),
    m.british.map(id => firstNameById(players, id)).join(' &amp; '),
  )).join('');

  const day2Rows = tournament.matches.day2.map(m => matchRow(
    m,
    firstNameById(players, m.boere),
    firstNameById(players, m.british),
  )).join('');

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
        <span class="lb-pos"><span class="small-strong rank-pill ${i < 3 ? 'top' : ''}">${i + 1}</span></span>
        <span class="lb-icon">${playerIcon(player, entry.team)}</span>
        <span class="body lb-name">${esc(player.firstName)}</span>
        <span class="small subtext lb-hcp">${hcp}</span>
        <span class="small-strong accent-text lb-pts">${points}</span>
      </div>
    `;
  }).join('');

  const section = (title, body) => `
    <div class="section">
      <div class="section-head"><span class="caption subtext">${title}</span><span class="section-rule"></span></div>
      ${body}
    </div>
  `;

  return `
    <div class="card elevated hero">
      <div class="eyebrow">${tournament.status === 'ended' ? 'Final result' : 'Matchplay · in progress'}</div>
      <div class="h1">${esc(tournament.name)}</div>
      <div class="small subtext">${courseLabel}</div>
      <div class="standing-row">
        <div class="standing-col">
          <span class="emblem-wrap sm"><img src="assets/team/boere_emblem_512.png" alt="" /></span>
          <span class="display ${winnerSide === 'boere' ? 'accent-text' : ''}">${standing.boere}</span>
          <span class="caption ${winnerSide === 'boere' ? 'winner-label' : 'subtext'}">Boere Republic</span>
        </div>
        <span class="caption subtext standing-vs">${tied ? 'Tied' : 'vs'}</span>
        <div class="standing-col">
          <span class="emblem-wrap sm"><img src="assets/team/british_emblem_512.png" alt="" /></span>
          <span class="display ${winnerSide === 'british' ? 'accent-text' : ''}">${standing.british}</span>
          <span class="caption ${winnerSide === 'british' ? 'winner-label' : 'subtext'}">British Empire</span>
        </div>
      </div>
      ${seriesBar}
    </div>

    ${section('Day 1 · Four-ball', `<div class="card section-card">${day1Rows}</div>`)}
    ${section('Day 2 · Singles', `<div class="card section-card">${day2Rows}</div>`)}
    ${section('Players', `
      <div class="card lb-card">
        <div class="lb-row lb-header">
          <span class="caption subtext lb-pos">#</span>
          <span class="lb-icon"></span>
          <span class="caption subtext lb-name">Player</span>
          <span class="caption subtext lb-hcp">Hcp</span>
          <span class="caption subtext lb-pts">Pts</span>
        </div>
        ${leaderboardRows}
      </div>
    `)}
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

function compareRowHtml(leftHtml, rightHtml) {
  return `
    <div class="compare-row">
      <div class="compare-col">${leftHtml}</div>
      <div class="compare-divider"></div>
      <div class="compare-col">${rightHtml}</div>
    </div>
  `;
}

function statRowHtml(iconName, title, boereValue, britishValue, winner) {
  return `
    <div class="stat-row">
      <div class="stat-row-header">${icon(iconName)}<span class="caption subtext">${title}</span></div>
      ${compareRowHtml(
        `<span class="h2 stat-value ${winner === 'boere' ? 'accent-text' : ''}">${boereValue}</span>`,
        `<span class="h2 stat-value ${winner === 'british' ? 'accent-text' : ''}">${britishValue}</span>`,
      )}
    </div>
  `;
}

function statListHtml(rows) {
  return `
    <div class="card stat-list">
      ${rows.map((r, i) => (i > 0 ? '<div class="stat-row-divider"></div>' : '') + statRowHtml(r.icon, r.title, r.boereValue, r.britishValue, r.winner)).join('')}
    </div>
  `;
}

function recordPyramidHtml(record, emphasize) {
  return `
    <div class="pyramid">
      <span class="display ${emphasize ? 'accent-text' : ''}">${record.wins}</span>
      <span class="caption subtext">Wins</span>
      <div class="pyramid-row">
        <span class="small-strong subtext">L ${record.losses}</span>
        <span class="small-strong subtext">D ${record.draws}</span>
      </div>
    </div>
  `;
}

function renderTeamsStats() {
  const stats = computeTeamStats(state.data.tournaments);
  const { boere, british } = stats;
  const streakStr = (n) => n > 0 ? `${n} win${n > 1 ? 's' : ''}` : '—';
  const recordWinner = betterOf(boere.record.wins, british.record.wins);

  return `
    <div class="card series-card">
      <div class="eyebrow">All-time series</div>
      <div class="emblem-row">
        <div class="emblem-col">
          <span class="emblem-wrap"><img src="assets/team/boere_emblem_512.png" alt="" /></span>
          <div class="small-strong">${teamLabel('boere')}</div>
        </div>
        <div class="caption subtext standing-vs">vs</div>
        <div class="emblem-col">
          <span class="emblem-wrap"><img src="assets/team/british_emblem_512.png" alt="" /></span>
          <div class="small-strong">${teamLabel('british')}</div>
        </div>
      </div>
    </div>

    <div class="card record-card elevated">
      <div class="card-head">${icon('trophy')}<span class="h2">All-time record</span></div>
      ${compareRowHtml(recordPyramidHtml(boere.record, recordWinner === 'boere'), recordPyramidHtml(british.record, recordWinner === 'british'))}
    </div>

    ${sectionHeadHtml('By the numbers')}
    ${statListHtml([
      {
        icon: 'chart', title: 'Points for / against',
        boereValue: `${boere.pointsFor} / ${boere.pointsAgainst}`,
        britishValue: `${british.pointsFor} / ${british.pointsAgainst}`,
        winner: betterOf(boere.pointsFor, british.pointsFor),
      },
      {
        icon: 'bolt', title: 'Biggest tournament win margin',
        boereValue: boere.biggestWinMargin !== null ? boere.biggestWinMargin : '—',
        britishValue: british.biggestWinMargin !== null ? british.biggestWinMargin : '—',
        winner: betterMargin(boere.biggestWinMargin, british.biggestWinMargin),
      },
      {
        icon: 'flame', title: 'Current streak',
        boereValue: streakStr(boere.currentStreak), britishValue: streakStr(british.currentStreak),
        winner: betterOf(boere.currentStreak, british.currentStreak),
      },
      {
        icon: 'medal', title: 'Best streak',
        boereValue: streakStr(boere.bestStreak), britishValue: streakStr(british.bestStreak),
        winner: betterOf(boere.bestStreak, british.bestStreak),
      },
      {
        icon: 'users', title: 'Four-ball',
        boereValue: `${boere.fourBall.winPct.toFixed(0)}%`, britishValue: `${british.fourBall.winPct.toFixed(0)}%`,
        winner: betterOf(boere.fourBall.winPct, british.fourBall.winPct),
      },
      {
        icon: 'user', title: 'Singles',
        boereValue: `${boere.singles.winPct.toFixed(0)}%`, britishValue: `${british.singles.winPct.toFixed(0)}%`,
        winner: betterOf(boere.singles.winPct, british.singles.winPct),
      },
    ])}
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
      <span class="caption subtext lb-pos">Pos</span>
      <span class="lb-icon"></span>
      <span class="caption subtext lb-name">Player</span>
      <span class="caption subtext pt-record">W-L-D</span>
      <span class="caption subtext pt-pct">Win%</span>
      <span class="chev"></span>
    </div>
  `;
}

function playerRowHtml(player, s, rankLabel, displayWinPct, alt) {
  const team = s.mostRecentTeam;
  const pct = displayWinPct !== undefined ? displayWinPct : Math.round(s.winPct * 10) / 10;
  const fmt = r => `${r.wins}-${r.losses}-${r.draws}`;
  const record = combinedRecord(s);
  const expanded = state.expandedPlayerIds.has(s.playerId);
  const rankNum = parseInt(String(rankLabel ?? '').replace(/\D/g, ''), 10);
  const top = !Number.isNaN(rankNum) && rankNum <= 3;
  return `
    <div class="pt-wrap">
      <div class="lb-row pt-row ${alt ? 'alt' : ''}" data-action="toggle-player" data-value="${esc(s.playerId)}">
        <span class="lb-pos"><span class="small-strong rank-pill ${top ? 'top' : ''}">${esc(rankLabel ?? '—')}</span></span>
        <span class="lb-icon">${team ? playerIcon(player, team) : ''}</span>
        <span class="body lb-name">${esc(player.firstName)}</span>
        <span class="small pt-record">${fmt(record)}</span>
        <span class="pt-pct-cell">
          <span class="small-strong accent-text">${pct.toFixed(1)}%</span>
          <span class="pct-track"><span class="pct-fill" style="width:${Math.min(100, Math.max(0, pct))}%"></span></span>
        </span>
        <span class="chev">${expanded ? '⌃' : '⌄'}</span>
      </div>
      ${expanded ? `
        <div class="stat-grid pt-detail">
          <div class="stat-cell"><div class="caption label">TRN</div><div class="value body-strong">${s.tournamentsPlayed}</div></div>
          <div class="stat-cell"><div class="caption label">TEAM</div><div class="value body-strong">${fmt(s.teamResults)}</div></div>
          <div class="stat-cell"><div class="caption label">4-BALL</div><div class="value body-strong">${fmt(s.fourBall)}</div></div>
          <div class="stat-cell"><div class="caption label">SINGLES</div><div class="value body-strong">${fmt(s.singles)}</div></div>
          <div class="stat-cell"><div class="caption label">PF</div><div class="value body-strong">${s.pointsFor}</div></div>
          <div class="stat-cell"><div class="caption label">PA</div><div class="value body-strong">${s.pointsAgainst}</div></div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderPlayersStats() {
  const all = computeAllPlayerStats(state.data.tournaments, state.data.players);
  const { ranked, insufficient } = rankPlayers(all);
  const byId = id => state.data.players.find(p => p.id === id);

  const rankedHtml = sectionHeadHtml('Ranked players') +
    `<div class="card lb-card">${playerTableHeaderHtml()}${ranked.map((r, i) => playerRowHtml(byId(r.playerId), r, r.rankLabel, r.displayWinPct, i % 2 === 1)).join('')}</div>`;
  const insufficientHtml = insufficient.length
    ? sectionHeadHtml('Insufficient tournaments · min. 2') +
      `<div class="card lb-card">${playerTableHeaderHtml()}${insufficient.map((s, i) => playerRowHtml(byId(s.playerId), s, undefined, undefined, i % 2 === 1)).join('')}</div>`
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
    const winner = standing.boere > standing.british ? 'boere' : standing.british > standing.boere ? 'british' : null;
    return `
      <div class="card list-row" data-action="select-past" data-value="${esc(t.id)}">
        <div class="info">
          <span class="body-strong">${esc(t.name)}</span>
          <span class="small subtext">${t.courses.day1 === t.courses.day2 ? esc(t.courses.day1) : esc(t.courses.day1) + ' · ' + esc(t.courses.day2)}</span>
        </div>
        <div class="row-right">
          <div class="score-col">
            <span class="emblem-wrap xs"><img src="assets/team/boere_emblem_512.png" alt="" /></span>
            <span class="body-strong">${standing.boere}</span>
            <span class="caption ${winner === 'boere' ? 'accent-text' : 'subtext'}">BOERE</span>
          </div>
          <span class="small subtext">–</span>
          <div class="score-col">
            <span class="emblem-wrap xs"><img src="assets/team/british_emblem_512.png" alt="" /></span>
            <span class="body-strong">${standing.british}</span>
            <span class="caption ${winner === 'british' ? 'accent-text' : 'subtext'}">BRIT</span>
          </div>
        </div>
        <span class="chev">›</span>
      </div>
    `;
  }).join('');

  return sub + sectionHeadHtml('Past tournaments') + rows;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

const TAB_TITLES = { stats: 'Stats', current: 'Active Tournament', historical: 'Historical' };
const TAB_SUBTITLES = { stats: 'All-time record', current: 'Live matchplay', historical: 'Past results' };

function render() {
  if (state.error && !state.data) {
    root.innerHTML = `
      ${pageHeader('Boer War Golf Tour', 'Anglo Boer War Golf Tour')}
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
    root.innerHTML = `${pageHeader('Boer War Golf Tour', 'Anglo Boer War Golf Tour')}<div class="loading">Loading…</div>`;
    return;
  }

  const title = pageHeader(TAB_TITLES[state.tab], TAB_SUBTITLES[state.tab]);

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
