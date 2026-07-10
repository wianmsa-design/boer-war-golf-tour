import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import TeamEmblem from '../components/TeamEmblem';
import PlayerStatCard from '../components/PlayerStatCard';
import { useApp } from '../services/AppContext';
import { computeAllPlayerStats, computeTeamStats, rankPlayers, TeamStats } from '../services/stats';
import { colors, spacing, teamColor, teamLabel, type } from '../theme';

type SubTab = 'Teams' | 'Players';

export default function StatsScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Teams');

  if (loading && !data) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
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
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SegmentedControl options={['Teams', 'Players'] as const} value={tab} onChange={setTab} />
      {endedCount === 0 ? (
        <Card>
          <Text style={[type.h2, styles.text]}>No stats yet</Text>
          <Text style={[type.body, styles.subtext]}>Stats appear here once a tournament has ended.</Text>
        </Card>
      ) : tab === 'Teams' ? (
        <TeamsTab tournaments={data.tournaments} />
      ) : (
        <PlayersTab tournaments={data.tournaments} players={data.players} />
      )}
    </Screen>
  );
}

function TeamsTab({ tournaments }: { tournaments: import('../models').Tournament[] }) {
  const stats = useMemo(() => computeTeamStats(tournaments), [tournaments]);
  return (
    <View style={styles.gap}>
      <Card>
        <View style={styles.emblemRow}>
          <View style={styles.emblemCol}>
            <TeamEmblem team="boere" />
            <Text style={[type.smallStrong, { color: teamColor('boere') }]}>{teamLabel('boere')}</Text>
          </View>
          <Text style={[type.h2, styles.subtext]}>vs</Text>
          <View style={styles.emblemCol}>
            <TeamEmblem team="british" />
            <Text style={[type.smallStrong, { color: teamColor('british') }]}>{teamLabel('british')}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <RecordRow boere={stats.boere} british={stats.british} />
      </Card>

      <Card>
        <Text style={[type.caption, styles.subtext]}>POINTS FOR / AGAINST</Text>
        <CompareRow
          boereValue={`${stats.boere.pointsFor} / ${stats.boere.pointsAgainst}`}
          britishValue={`${stats.british.pointsFor} / ${stats.british.pointsAgainst}`}
        />
      </Card>

      <Card>
        <Text style={[type.caption, styles.subtext]}>BIGGEST TOURNAMENT WIN MARGIN</Text>
        <CompareRow
          boereValue={stats.boere.biggestWinMargin !== null ? `${stats.boere.biggestWinMargin}` : '—'}
          britishValue={stats.british.biggestWinMargin !== null ? `${stats.british.biggestWinMargin}` : '—'}
        />
      </Card>

      <Card>
        <Text style={[type.caption, styles.subtext]}>CURRENT STREAK</Text>
        <CompareRow
          boereValue={stats.boere.currentStreak > 0 ? `${stats.boere.currentStreak} win${stats.boere.currentStreak > 1 ? 's' : ''}` : '—'}
          britishValue={stats.british.currentStreak > 0 ? `${stats.british.currentStreak} win${stats.british.currentStreak > 1 ? 's' : ''}` : '—'}
        />
      </Card>

      <Card>
        <Text style={[type.caption, styles.subtext]}>FOUR-BALL vs SINGLES</Text>
        <CompareRow
          boereValue={`FB ${stats.boere.fourBall.winPct.toFixed(0)}%  ·  SG ${stats.boere.singles.winPct.toFixed(0)}%`}
          britishValue={`FB ${stats.british.fourBall.winPct.toFixed(0)}%  ·  SG ${stats.british.singles.winPct.toFixed(0)}%`}
        />
      </Card>
    </View>
  );
}

function RecordRow({ boere, british }: { boere: TeamStats; british: TeamStats }) {
  return (
    <View>
      <Text style={[type.caption, styles.subtext]}>RECORD (W-L-D)</Text>
      <CompareRow
        boereValue={`${boere.record.wins}-${boere.record.losses}-${boere.record.draws}`}
        britishValue={`${british.record.wins}-${british.record.losses}-${british.record.draws}`}
      />
    </View>
  );
}

function CompareRow({ boereValue, britishValue }: { boereValue: string; britishValue: string }) {
  return (
    <View style={styles.compareRow}>
      <Text style={[type.bodyStrong, { color: teamColor('boere') }]}>{boereValue}</Text>
      <Text style={[type.bodyStrong, { color: teamColor('british') }]}>{britishValue}</Text>
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
      {ranked.map(r => (
        <PlayerStatCard key={r.playerId} player={playerById(r.playerId)} stats={r} rankLabel={r.rankLabel} displayWinPct={r.displayWinPct} />
      ))}

      {insufficient.length > 0 && (
        <View style={styles.gap}>
          <Text style={[type.caption, styles.subtext, styles.sectionTitle]}>
            INSUFFICIENT TOURNAMENTS (MIN. 2)
          </Text>
          {insufficient.map(s => (
            <PlayerStatCard key={s.playerId} player={playerById(s.playerId)} stats={s} />
          ))}
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
  emblemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  emblemCol: { alignItems: 'center', gap: spacing.sm },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
});
