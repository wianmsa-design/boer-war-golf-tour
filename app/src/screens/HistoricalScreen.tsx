import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import TournamentDetail from '../components/TournamentDetail';
import { useApp } from '../services/AppContext';
import { useAnimatedTab } from '../hooks/useAnimatedTab';
import TeamEmblem from '../components/TeamEmblem';
import { computeStanding, mostRecentEndedTournament, olderEndedTournaments } from '../services/stats';
import { colors, spacing, type } from '../theme';
import { TeamId, Tournament } from '../models';

const SUB_TABS = ['Recent', 'Past'] as const;
type SubTab = typeof SUB_TABS[number];

export default function HistoricalScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { panHandlers, animStyle, setTabAnimated } = useAnimatedTab(SUB_TABS, tab, setTab);

  if (loading && !data) {
    return (
      <Screen scroll={false} title="Historical">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Historical">
        <Card>
          <Text style={[type.h2, styles.text]}>Couldn't load data</Text>
          <Text style={[type.body, styles.subtext]}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  const recent = mostRecentEndedTournament(data.tournaments);
  const older = olderEndedTournaments(data.tournaments);
  const selected = selectedId ? data.tournaments.find(t => t.id === selectedId) : undefined;

  const handleChangeTab = (next: SubTab) => {
    setSelectedId(null);
    setTabAnimated(next);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} title="Historical">
      <SegmentedControl options={SUB_TABS} value={tab} onChange={handleChangeTab} />

      <Animated.View style={animStyle} {...(selected ? {} : panHandlers)}>
        {tab === 'Recent' ? (
          recent ? (
            <TournamentDetail tournament={recent} players={data.players} />
          ) : (
            <Card>
              <Text style={[type.h2, styles.text]}>No ended tournaments yet</Text>
            </Card>
          )
        ) : selected ? (
          <View style={styles.gap}>
            <Pressable style={styles.backRow} onPress={() => setSelectedId(null)}>
              <Ionicons name="chevron-back" size={18} color={colors.accent} />
              <Text style={[type.bodyStrong, { color: colors.accent }]}>All tournaments</Text>
            </Pressable>
            <TournamentDetail tournament={selected} players={data.players} />
          </View>
        ) : older.length > 0 ? (
          <View style={styles.gap}>
            {older.map(t => (
              <PastTournamentRow key={t.id} tournament={t} onPress={() => setSelectedId(t.id)} />
            ))}
          </View>
        ) : (
          <Card>
            <Text style={[type.h2, styles.text]}>Nothing here yet</Text>
            <Text style={[type.body, styles.subtext]}>Older tournaments will show up here once there's more than one.</Text>
          </Card>
        )}
      </Animated.View>
    </Screen>
  );
}

function PastTournamentRow({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const standing = useMemo(() => computeStanding(tournament), [tournament]);
  const winner: TeamId | null = standing.boere > standing.british ? 'boere' : standing.british > standing.boere ? 'british' : null;
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={[type.bodyStrong, styles.text, styles.leftText]}>{tournament.name}</Text>
          <Text style={[type.small, styles.subtext, styles.leftText]}>
            {tournament.courses.day1 === tournament.courses.day2
              ? tournament.courses.day1
              : `${tournament.courses.day1} · ${tournament.courses.day2}`}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.scoreCol}>
            <TeamEmblem team="boere" size={20} />
            <Text style={[type.bodyStrong, styles.text]}>{standing.boere}</Text>
            <Text style={[type.caption, winner === 'boere' ? { color: colors.accent } : styles.subtext]}>BOERE</Text>
          </View>
          <Text style={[type.small, styles.subtext]}>–</Text>
          <View style={styles.scoreCol}>
            <TeamEmblem team="british" size={20} />
            <Text style={[type.bodyStrong, styles.text]}>{standing.british}</Text>
            <Text style={[type.caption, winner === 'british' ? { color: colors.accent } : styles.subtext]}>BRIT</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  gap: { gap: spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLeft: { flex: 1, gap: 2 },
  leftText: { textAlign: 'left' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreCol: { alignItems: 'center', gap: 1 },
});
