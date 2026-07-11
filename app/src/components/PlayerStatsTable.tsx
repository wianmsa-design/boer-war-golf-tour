import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Player } from '../models';
import { PlayerRecord, PlayerStats } from '../services/stats';
import { colors, radius, spacing, type } from '../theme';
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
      <Text style={[type.caption, styles.subtext, styles.colPct, styles.noLetterSpacing]}>WIN%</Text>
      <View style={styles.colChevron} />
    </View>
  );
}

interface Props {
  player: Player;
  stats: PlayerStats;
  rankLabel?: string;
  displayWinPct?: number;
  /** Alternate row shading for zebra striping. */
  alt?: boolean;
}

export default function PlayerStatsRow({ player, stats, rankLabel, displayWinPct, alt }: Props) {
  const [expanded, setExpanded] = useState(false);
  const team = stats.mostRecentTeam;
  const pct = displayWinPct ?? Math.round(stats.winPct * 10) / 10;
  const record = combinedRecord(stats);

  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={[styles.wrap, alt && styles.wrapAlt]}>
      <View style={styles.row}>
        <View style={styles.colPos}>
          <View style={styles.posPill}>
            <Text style={[type.smallStrong, { color: colors.accent }]}>{rankLabel ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.colIcon}>
          {team && <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={24} />}
        </View>
        <Text style={[type.body, styles.text, styles.colName]} numberOfLines={1}>{player.firstName}</Text>
        <Text style={[type.small, styles.text, styles.colRecord]}>{fmtRecord(record)}</Text>
        <Text style={[type.smallStrong, { color: colors.accent }, styles.colPct]}>{pct.toFixed(1)}%</Text>
        <View style={styles.colChevron}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} />
        </View>
      </View>

      {expanded && (
        <View style={styles.detail}>
          <Stat label="TRN" value={`${stats.tournamentsPlayed}`} />
          <Stat label="TEAM" value={fmtRecord(stats.teamResults)} />
          <Stat label="4-BALL" value={fmtRecord(stats.fourBall)} />
          <Stat label="SINGLES" value={fmtRecord(stats.singles)} />
          <Stat label="PF" value={`${stats.pointsFor}`} />
          <Stat label="PA" value={`${stats.pointsAgainst}`} />
        </View>
      )}
    </Pressable>
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
  wrapAlt: { backgroundColor: colors.surfaceAlt },
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
  colPos: { width: 28, alignItems: 'center' },
  posPill: {
    minWidth: 24,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colIcon: { width: 24, alignItems: 'center' },
  colName: { flex: 1, textAlign: 'left' },
  colRecord: { width: 56, textAlign: 'center' },
  colPct: { width: 52, textAlign: 'center' },
  noLetterSpacing: { letterSpacing: 0 },
  colChevron: { width: 16, alignItems: 'center' },
  detail: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  detailStat: { flex: 1, alignItems: 'center', gap: 1 },
  detailLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3, color: colors.subtext },
  detailValue: { fontSize: 12, fontWeight: '700', color: colors.text },
});
