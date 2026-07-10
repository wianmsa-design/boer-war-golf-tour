import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player } from '../models';
import { PlayerRecord, PlayerStats } from '../services/stats';
import { colors, spacing, type } from '../theme';
import PlayerIcon from './PlayerIcon';

function fmtRecord(r: PlayerRecord): string {
  return `${r.wins}-${r.losses}-${r.draws}`;
}

function combinedRecord(s: PlayerStats): PlayerRecord {
  return {
    wins: s.fourBall.wins + s.singles.wins,
    losses: s.fourBall.losses + s.singles.losses,
    draws: s.fourBall.draws + s.singles.draws,
  };
}

export function PlayerTableHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={[type.caption, styles.subtext, styles.colPos]}>POS</Text>
      <View style={styles.colIcon} />
      <Text style={[type.caption, styles.subtext, styles.colName]}>PLAYER</Text>
      <Text style={[type.caption, styles.subtext, styles.colRecord]}>W-L-D</Text>
      <Text style={[type.caption, styles.subtext, styles.colPct]}>WIN%</Text>
    </View>
  );
}

interface Props {
  player: Player;
  stats: PlayerStats;
  rankLabel?: string;
  displayWinPct?: number;
}

export default function PlayerStatsRow({ player, stats, rankLabel, displayWinPct }: Props) {
  const team = stats.mostRecentTeam;
  const pct = displayWinPct ?? Math.round(stats.winPct * 10) / 10;
  const record = combinedRecord(stats);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[type.smallStrong, styles.colPos, { color: colors.accent }]}>{rankLabel ?? '—'}</Text>
        <View style={styles.colIcon}>
          {team && <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={24} />}
        </View>
        <Text style={[type.body, styles.text, styles.colName]} numberOfLines={1}>{player.firstName}</Text>
        <Text style={[type.small, styles.text, styles.colRecord]}>{fmtRecord(record)}</Text>
        <Text style={[type.smallStrong, { color: colors.accent }, styles.colPct]}>{pct.toFixed(1)}%</Text>
      </View>

      <View style={styles.detail}>
        <Stat label="TRN" value={`${stats.tournamentsPlayed}`} />
        <Stat label="TEAM" value={fmtRecord(stats.teamResults)} />
        <Stat label="Four-Ball" value={fmtRecord(stats.fourBall)} />
        <Stat label="Singles" value={fmtRecord(stats.singles)} />
        <Stat label="PF" value={`${stats.pointsFor}`} />
        <Stat label="PA" value={`${stats.pointsAgainst}`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  colPos: { width: 28, textAlign: 'center' },
  colIcon: { width: 24, alignItems: 'center' },
  colName: { flex: 1 },
  colRecord: { width: 56, textAlign: 'center' },
  colPct: { width: 52, textAlign: 'right' },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  detailStat: { alignItems: 'center', gap: 1 },
  detailLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3, color: colors.subtext },
  detailValue: { fontSize: 12, fontWeight: '700', color: colors.text },
});
