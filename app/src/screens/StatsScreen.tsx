import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import TeamEmblem from '../components/TeamEmblem';
import PlayerStatsRow, { PlayerTableHeader } from '../components/PlayerStatsTable';
import { useApp } from '../services/AppContext';
import { useAnimatedTab } from '../hooks/useAnimatedTab';
import { computeAllPlayerStats, computeTeamStats, rankPlayers, TeamStats } from '../services/stats';
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

function StatCard({ title, boereValue, britishValue }: { title: string; boereValue: string; britishValue: string }) {
  return (
    <Card>
      <Text style={[type.caption, styles.subtext, styles.centerText]}>{title}</Text>
      <SplitRow
        left={<Text style={[type.bodyStrong, styles.text]}>{boereValue}</Text>}
        right={<Text style={[type.bodyStrong, styles.text]}>{britishValue}</Text>}
      />
    </Card>
  );
}

function streakLabel(n: number): string {
  return n > 0 ? `${n} win${n > 1 ? 's' : ''}` : '—';
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
              <Text style={[type.smallStrong, styles.text]}>{teamLabel('boere')}</Text>
            </>
          }
          right={
            <>
              <TeamEmblem team="british" />
              <Text style={[type.smallStrong, styles.text]}>{teamLabel('british')}</Text>
            </>
          }
        />
      </Card>

      <StatCard
        title="RECORD (W-L-D)"
        boereValue={`${boere.record.wins}-${boere.record.losses}-${boere.record.draws}`}
        britishValue={`${british.record.wins}-${british.record.losses}-${british.record.draws}`}
      />

      <StatCard
        title="POINTS FOR / AGAINST"
        boereValue={`${boere.pointsFor} / ${boere.pointsAgainst}`}
        britishValue={`${british.pointsFor} / ${british.pointsAgainst}`}
      />

      <StatCard
        title="BIGGEST TOURNAMENT WIN MARGIN"
        boereValue={boere.biggestWinMargin !== null ? `${boere.biggestWinMargin}` : '—'}
        britishValue={british.biggestWinMargin !== null ? `${british.biggestWinMargin}` : '—'}
      />

      <StatCard
        title="CURRENT STREAK"
        boereValue={streakLabel(boere.currentStreak)}
        britishValue={streakLabel(british.currentStreak)}
      />

      <StatCard
        title="BEST STREAK"
        boereValue={streakLabel(boere.bestStreak)}
        britishValue={streakLabel(british.bestStreak)}
      />

      <StatCard
        title="FOUR-BALL"
        boereValue={`${boere.fourBall.winPct.toFixed(0)}%`}
        britishValue={`${british.fourBall.winPct.toFixed(0)}%`}
      />

      <StatCard
        title="SINGLES"
        boereValue={`${boere.singles.winPct.toFixed(0)}%`}
        britishValue={`${british.singles.winPct.toFixed(0)}%`}
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
        {ranked.map(r => (
          <PlayerStatsRow key={r.playerId} player={playerById(r.playerId)} stats={r} rankLabel={r.rankLabel} displayWinPct={r.displayWinPct} />
        ))}
      </Card>

      {insufficient.length > 0 && (
        <View style={styles.gap}>
          <Text style={[type.caption, styles.subtext, styles.sectionTitle]}>
            INSUFFICIENT TOURNAMENTS (MIN. 2)
          </Text>
          <Card style={styles.tableCard}>
            <PlayerTableHeader />
            {insufficient.map(s => (
              <PlayerStatsRow key={s.playerId} player={playerById(s.playerId)} stats={s} />
            ))}
          </Card>
        </View>
      )}

      <Text style={[type.caption, styles.subtext, styles.legend]}>
        Tap a player to expand. TRN Tournaments · TEAM Team Results · FB Four-Ball · SGL Singles · PF Points For · PA Points Against
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  centerText: { textAlign: 'center' },
  gap: { gap: spacing.lg },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  splitCol: { flex: 1, alignItems: 'center', gap: spacing.sm },
  splitDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
  tableCard: { padding: spacing.sm, gap: 0 },
  legend: { textAlign: 'center', paddingHorizontal: spacing.md, lineHeight: 16 },
});
