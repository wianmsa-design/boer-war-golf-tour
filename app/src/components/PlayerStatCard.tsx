import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player, playerFullName } from '../models';
import { PlayerRecord, PlayerStats } from '../services/stats';
import { colors, spacing, teamColor, type } from '../theme';
import Card from './Card';
import PlayerIcon from './PlayerIcon';

function fmtRecord(r: PlayerRecord): string {
  return `${r.wins}-${r.losses}-${r.draws}`;
}

interface Props {
  player: Player;
  stats: PlayerStats;
  rankLabel?: string;
  displayWinPct?: number;
}

export default function PlayerStatCard({ player, stats, rankLabel, displayWinPct }: Props) {
  const team = stats.mostRecentTeam;
  const pct = displayWinPct ?? Math.round(stats.winPct * 10) / 10;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {rankLabel && <Text style={[type.h2, styles.rank]}>{rankLabel}</Text>}
        {team && <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={32} />}
        <Text style={[type.bodyStrong, styles.name]} numberOfLines={1}>{playerFullName(player)}</Text>
        <Text style={[type.h2, { color: team ? teamColor(team) : colors.text }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={styles.grid}>
        <Stat label="Tournaments" value={`${stats.tournamentsPlayed}`} />
        <Stat label="Team Results" value={fmtRecord(stats.teamResults)} />
        <Stat label="Four-Ball" value={fmtRecord(stats.fourBall)} />
        <Stat label="Matchplay" value={fmtRecord(stats.singles)} />
        <Stat label="Points For" value={`${stats.pointsFor}`} />
        <Stat label="Points Against" value={`${stats.pointsAgainst}`} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.caption, styles.statLabel]}>{label.toUpperCase()}</Text>
      <Text style={[type.bodyStrong, styles.statValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { color: colors.accent, width: 34 },
  name: { flex: 1, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { width: '30%', minWidth: 90, gap: 2 },
  statLabel: { color: colors.subtext },
  statValue: { color: colors.text },
});
