import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import TeamEmblem from '../components/TeamEmblem';
import PlayerStatsRow, { PlayerTableHeader } from '../components/PlayerStatsTable';
import { useApp } from '../services/AppContext';
import { useAnimatedTab } from '../hooks/useAnimatedTab';
import { computeAllPlayerStats, computeTeamStats, rankPlayers, TeamRecord, TeamStats } from '../services/stats';
import { TeamId } from '../models';
import { colors, spacing, teamLabel, type } from '../theme';

const SUB_TABS = ['Teams', 'Players'] as const;
type SubTab = typeof SUB_TABS[number];

export default function StatsScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Teams');
  const { panHandlers, animStyle, setTabAnimated } = useAnimatedTab(SUB_TABS, tab, setTab);

  if (loading && !data) {
    return (
      <Screen scroll={false} title="Stats">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Stats">
        <Card>
          <Text style={[type.h2, styles.text]}>Couldn't load data</Text>
          <Text style={[type.body, styles.subtext]}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  const endedCount = data.tournaments.filter(t => t.status === 'ended').length;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} title="Stats">
      <SegmentedControl options={SUB_TABS} value={tab} onChange={setTabAnimated} />
      {endedCount === 0 ? (
        <Card>
          <Text style={[type.h2, styles.text]}>No stats yet</Text>
          <Text style={[type.body, styles.subtext]}>Stats appear here once a tournament has ended.</Text>
        </Card>
      ) : (
        <Animated.View style={animStyle} {...panHandlers}>
          {tab === 'Teams' ? (
            <TeamsTab tournaments={data.tournaments} />
          ) : (
            <PlayersTab tournaments={data.tournaments} players={data.players} />
          )}
        </Animated.View>
      )}
    </Screen>
  );
}

/** Two centered columns with a vertical divider — every Teams-tab card uses this so values line up under the emblems above. */
function SplitRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.splitRow}>
      <View style={styles.splitCol}>{left}</View>
      <View style={styles.splitDivider} />
      <View style={styles.splitCol}>{right}</View>
    </View>
  );
}

interface StatRowData {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  boereValue: string;
  britishValue: string;
  winner: TeamId | null;
}

function StatRowHeader({ icon, title }: { icon: StatRowData['icon']; title: string }) {
  return (
    <View style={styles.statRowHeader}>
      <Ionicons name={icon} size={13} color={colors.subtext} />
      <Text style={[type.caption, styles.subtext]}>{title}</Text>
    </View>
  );
}

/** A card holding one or more related stat rows (e.g. Points + Margin), separated by dividers. */
function StatGroupCard({ rows }: { rows: StatRowData[] }) {
  return (
    <Card>
      {rows.map((r, i) => (
        <React.Fragment key={r.title}>
          {i > 0 && <View style={styles.rowDivider} />}
          <StatRowHeader icon={r.icon} title={r.title} />
          <SplitRow
            left={<Text style={[type.bodyStrong, r.winner === 'boere' ? { color: colors.accent } : styles.text]}>{r.boereValue}</Text>}
            right={<Text style={[type.bodyStrong, r.winner === 'british' ? { color: colors.accent } : styles.text]}>{r.britishValue}</Text>}
          />
        </React.Fragment>
      ))}
    </Card>
  );
}

function RecordPyramid({ record, emphasize }: { record: TeamRecord; emphasize: boolean }) {
  return (
    <View style={styles.pyramid}>
      <Text style={[type.display, emphasize ? { color: colors.accent } : styles.text]}>{record.wins}</Text>
      <View style={styles.pyramidRow}>
        <Text style={[type.smallStrong, styles.subtext]}>L {record.losses}</Text>
        <Text style={[type.smallStrong, styles.subtext]}>D {record.draws}</Text>
      </View>
    </View>
  );
}

function RecordCard({ boere, british }: { boere: TeamStats; british: TeamStats }) {
  const winner = betterOf(boere.record.wins, british.record.wins);
  return (
    <Card style={styles.recordCard} elevated>
      <View style={styles.recordTitleRow}>
        <Ionicons name="trophy" size={16} color={colors.accent} />
        <Text style={[type.h2, styles.text]}>RECORD</Text>
      </View>
      <SplitRow
        left={<RecordPyramid record={boere.record} emphasize={winner === 'boere'} />}
        right={<RecordPyramid record={british.record} emphasize={winner === 'british'} />}
      />
    </Card>
  );
}

function streakLabel(n: number): string {
  return n > 0 ? `${n} win${n > 1 ? 's' : ''}` : '—';
}

/** Which side is "better" for a stat where higher always wins. */
function betterOf(a: number, b: number): TeamId | null {
  if (a > b) return 'boere';
  if (b > a) return 'british';
  return null;
}

function betterMargin(a: number | null, b: number | null): TeamId | null {
  if (a === null && b === null) return null;
  if (a === null) return 'british';
  if (b === null) return 'boere';
  return betterOf(a, b);
}

function TeamsTab({ tournaments }: { tournaments: import('../models').Tournament[] }) {
  const stats = useMemo(() => computeTeamStats(tournaments), [tournaments]);
  const { boere, british } = stats;
  return (
    <View style={styles.gap}>
      <Card>
        <SplitRow
          left={
            <>
              <TeamEmblem team="boere" />
              <Text style={[type.smallStrong, styles.text]}>{teamLabel('boere').toUpperCase()}</Text>
            </>
          }
          right={
            <>
              <TeamEmblem team="british" />
              <Text style={[type.smallStrong, styles.text]}>{teamLabel('british').toUpperCase()}</Text>
            </>
          }
        />
      </Card>

      <RecordCard boere={boere} british={british} />

      <StatGroupCard
        rows={[
          {
            icon: 'stats-chart-outline',
            title: 'POINTS FOR / AGAINST',
            boereValue: `${boere.pointsFor} / ${boere.pointsAgainst}`,
            britishValue: `${british.pointsFor} / ${british.pointsAgainst}`,
            winner: betterOf(boere.pointsFor, british.pointsFor),
          },
          {
            icon: 'flash-outline',
            title: 'BIGGEST TOURNAMENT WIN MARGIN',
            boereValue: boere.biggestWinMargin !== null ? `${boere.biggestWinMargin}` : '—',
            britishValue: british.biggestWinMargin !== null ? `${british.biggestWinMargin}` : '—',
            winner: betterMargin(boere.biggestWinMargin, british.biggestWinMargin),
          },
        ]}
      />

      <StatGroupCard
        rows={[
          {
            icon: 'flame-outline',
            title: 'CURRENT STREAK',
            boereValue: streakLabel(boere.currentStreak),
            britishValue: streakLabel(british.currentStreak),
            winner: betterOf(boere.currentStreak, british.currentStreak),
          },
          {
            icon: 'ribbon-outline',
            title: 'BEST STREAK',
            boereValue: streakLabel(boere.bestStreak),
            britishValue: streakLabel(british.bestStreak),
            winner: betterOf(boere.bestStreak, british.bestStreak),
          },
        ]}
      />

      <StatGroupCard
        rows={[
          {
            icon: 'people-outline',
            title: 'FOUR-BALL',
            boereValue: `${boere.fourBall.winPct.toFixed(0)}%`,
            britishValue: `${british.fourBall.winPct.toFixed(0)}%`,
            winner: betterOf(boere.fourBall.winPct, british.fourBall.winPct),
          },
          {
            icon: 'person-outline',
            title: 'SINGLES',
            boereValue: `${boere.singles.winPct.toFixed(0)}%`,
            britishValue: `${british.singles.winPct.toFixed(0)}%`,
            winner: betterOf(boere.singles.winPct, british.singles.winPct),
          },
        ]}
      />
    </View>
  );
}

function PlayersTab({ tournaments, players }: { tournaments: import('../models').Tournament[]; players: import('../models').Player[] }) {
  const { ranked, insufficient } = useMemo(() => {
    const all = computeAllPlayerStats(tournaments, players);
    return rankPlayers(all);
  }, [tournaments, players]);

  const playerById = (id: string) => players.find(p => p.id === id)!;

  return (
    <View style={styles.gap}>
      <Card style={styles.tableCard}>
        <PlayerTableHeader />
        {ranked.map((r, i) => (
          <PlayerStatsRow key={r.playerId} player={playerById(r.playerId)} stats={r} rankLabel={r.rankLabel} displayWinPct={r.displayWinPct} alt={i % 2 === 1} />
        ))}
      </Card>

      {insufficient.length > 0 && (
        <View style={styles.gap}>
          <Text style={[type.caption, styles.subtext, styles.sectionTitle]}>
            INSUFFICIENT TOURNAMENTS (MIN. 2)
          </Text>
          <Card style={styles.tableCard}>
            <PlayerTableHeader />
            {insufficient.map((s, i) => (
              <PlayerStatsRow key={s.playerId} player={playerById(s.playerId)} stats={s} alt={i % 2 === 1} />
            ))}
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  gap: { gap: spacing.lg },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  splitCol: { flex: 1, alignItems: 'center', gap: spacing.sm },
  splitDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
  tableCard: { padding: spacing.sm, gap: 0 },
  recordCard: { borderColor: colors.accentMuted, borderWidth: 1.5 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  pyramid: { alignItems: 'center', gap: 2 },
  pyramidRow: { flexDirection: 'row', gap: spacing.md },
  statRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
});
