import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import TournamentDetail from '../components/TournamentDetail';
import { useApp } from '../services/AppContext';
import { getTournament, isFullyDecided } from '../services/stats';
import { colors, spacing, type } from '../theme';

export default function CurrentScreen() {
  const { data, loading, refreshing, error, refresh, endTournament } = useApp();

  if (loading && !data) {
    return (
      <Screen scroll={false} title="Active Tournament">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Active Tournament">
        <Card>
          <Text style={[type.h2, styles.text]}>Couldn't load data</Text>
          <Text style={[type.body, styles.subtext]}>{error}</Text>
          <Text style={[type.small, styles.subtext]}>Pull down to try again.</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  const tournament = getTournament(data.tournaments, data.currentTournamentId);
  const activeTournament = tournament && tournament.status === 'active' ? tournament : undefined;

  const handleEnd = () => {
    if (!activeTournament) return;
    const incomplete = !isFullyDecided(activeTournament);
    Alert.alert(
      incomplete ? 'End tournament early?' : 'End tournament?',
      incomplete
        ? 'This tournament still has unplayed matches. Ending it now will lock in only the results recorded so far.'
        : `Lock in the final result for ${activeTournament.name}? This moves it to Historical and feeds all-time Stats.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Tournament', style: 'destructive', onPress: () => endTournament(activeTournament.id) },
      ],
    );
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} title="Active Tournament">
      {activeTournament ? (
        <>
          <TournamentDetail tournament={activeTournament} players={data.players} />
          <Button label="End Tournament" variant="danger" onPress={handleEnd} />
        </>
      ) : (
        <Card>
          <Text style={[type.h2, styles.text]}>No active tournament</Text>
          <Text style={[type.body, styles.subtext]}>
            Create the next tournament from Settings to start scoring.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text },
  subtext: { color: colors.subtext, marginTop: spacing.xs },
});
