import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Player, playerFullName } from '../models';
import { PlayerRecord, PlayerStats } from '../services/stats';
import { colors, spacing, teamColor, type } from '../theme';
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
  const [expanded, setExpanded] = useState(false);
  const team = stats.mostRecentTeam;
  const pct = displayWinPct ?? Math.round(stats.winPct * 10) / 10;
  const record = combinedRecord(stats);

  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[type.smallStrong, styles.colPos, { color: colors.accent }]}>{rankLabel ?? '—'}</Text>
        <View style={styles.colIcon}>
          {team && <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={24} />}
        </View>
        <Text style={[type.body, styles.text, styles.colName]} numberOfLines={1}>{playerFullName(player)}</Text>
        <Text style={[type.small, styles.text, styles.colRecord]}>{fmtRecord(record)}</Text>
        <Text style={[type.smallStrong, team ? { color: teamColor(team) } : styles.text, styles.colPct]}>{pct.toFixed(1)}%</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} />
      </View>

      {expanded && (
        <View style={styles.detail}>
          <Stat label="Tournaments" value={`${stats.tournamentsPlayed}`} />
          <Stat label="Team Results" value={fmtRecord(stats.teamResults)} />
          <Stat label="Four-Ball" value={fmtRecord(stats.fourBall)} />
          <Stat label="Matchplay" value={fmtRecord(stats.singles)} />
          <Stat label="Points For" value={`${stats.pointsFor}`} />
          <Stat label="Points Against" value={`${stats.pointsAgainst}`} />
        </View>
      )}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={[type.caption, styles.subtext]}>{label.toUpperCase()}</Text>
      <Text style={[type.bodyStrong, styles.text]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  colPos: { width: 28, textAlign: 'center' },
  colIcon: { width: 24 },
  colName: { flex: 1 },
  colRecord: { width: 56, textAlign: 'center' },
  colPct: { width: 52, textAlign: 'right' },
  detail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  detailStat: { width: '30%', minWidth: 90, gap: 2 },
});
