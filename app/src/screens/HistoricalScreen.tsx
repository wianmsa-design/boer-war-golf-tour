import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import TournamentDetail from '../components/TournamentDetail';
import { useApp } from '../services/AppContext';
import { computeStanding, mostRecentEndedTournament, olderEndedTournaments, tournamentWinner } from '../services/stats';
import { colors, spacing, teamColor, type } from '../theme';
import { Tournament } from '../models';

type SubTab = 'Recent' | 'Past';

export default function HistoricalScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const recent = mostRecentEndedTournament(data.tournaments);
  const older = olderEndedTournaments(data.tournaments);
  const selected = selectedId ? data.tournaments.find(t => t.id === selectedId) : undefined;

  const handleChangeTab = (next: SubTab) => {
    setTab(next);
    setSelectedId(null);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SegmentedControl options={['Recent', 'Past'] as const} value={tab} onChange={handleChangeTab} />

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
    </Screen>
  );
}

function PastTournamentRow({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const standing = useMemo(() => computeStanding(tournament), [tournament]);
  const winner = useMemo(() => tournamentWinner(tournament), [tournament]);
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={[type.bodyStrong, styles.text]}>{tournament.name}</Text>
          <Text style={[type.small, styles.subtext]}>
            {tournament.courses.day1 === tournament.courses.day2
              ? tournament.courses.day1
              : `${tournament.courses.day1} · ${tournament.courses.day2}`}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[type.bodyStrong, { color: teamColor('boere') }]}>{standing.boere}</Text>
          <Text style={[type.small, styles.subtext]}>–</Text>
          <Text style={[type.bodyStrong, { color: teamColor('british') }]}>{standing.british}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
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
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
