import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import PickerModal from '../components/PickerModal';
import { useApp } from '../services/AppContext';
import { useAnimatedTab } from '../hooks/useAnimatedTab';
import { getTournament, isFullyDecided } from '../services/stats';
import { MATCH_SCORE_OPTIONS } from '../services/matchplay';
import { Day1Match, Day2Match, MatchOutcome, MatchScore, Player, playerFullName, TeamId, Tournament } from '../models';
import { colors, radius, spacing, teamColor, type } from '../theme';

const DAY_TABS = ['Day 1 · Team', 'Day 2 · Individual'] as const;
type DayTab = typeof DAY_TABS[number];
type ModeTab = 'Match Setup' | 'Score Entry';

const endPromptKey = (tournamentId: string) => `endPrompted:${tournamentId}`;

export default function ScoreEntryScreen() {
  const { data, loading, refreshing, error, refresh, endTournament } = useApp();
  const [day, setDay] = useState<DayTab>('Day 1 · Team');
  const [mode, setMode] = useState<ModeTab>('Match Setup');
  const { panHandlers, animStyle, setTabAnimated } = useAnimatedTab(DAY_TABS, day, setDay);

  const tournament = data ? getTournament(data.tournaments, data.currentTournamentId) : undefined;
  const active = tournament && tournament.status === 'active' ? tournament : undefined;
  const fullyDecided = active ? isFullyDecided(active) : false;

  useEffect(() => {
    if (!active || !fullyDecided) return;
    let cancelled = false;
    (async () => {
      const key = endPromptKey(active.id);
      const already = await AsyncStorage.getItem(key);
      if (already || cancelled) return;
      await AsyncStorage.setItem(key, '1');
      Alert(
        'End tournament?',
        `Every match has a result. Lock in the final result for ${active.name}? This moves it to Historical and feeds all-time Stats.`,
        () => endTournament(active.id),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, fullyDecided]);

  if (loading && !data) {
    return (
      <Screen scroll={false} title="Score Entry">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Score Entry">
        <Card>
          <Text style={[type.h2, styles.text]}>Couldn't load data</Text>
          <Text style={[type.body, styles.subtext]}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  if (!active) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Score Entry">
        <Card>
          <Text style={[type.h2, styles.text]}>No active tournament</Text>
          <Text style={[type.body, styles.subtext]}>Create one in Settings → Tournament to start scoring.</Text>
        </Card>
      </Screen>
    );
  }

  const handleEnd = () => {
    const incomplete = !fullyDecided;
    Alert(
      incomplete ? 'End tournament early?' : 'End tournament?',
      incomplete
        ? 'This tournament still has unplayed matches. Ending it now will lock in only the results recorded so far.'
        : `Lock in the final result for ${active.name}? This moves it to Historical and feeds all-time Stats.`,
      () => endTournament(active.id),
    );
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} title="Score Entry">
      <Card>
        <Text style={[type.h2, styles.text]}>{active.name}</Text>
        <Text style={[type.small, styles.subtext]}>Players per team: {active.playersPerTeam}</Text>
      </Card>

      <SegmentedControl options={DAY_TABS} value={day} onChange={setTabAnimated} />
      <SegmentedControl options={['Match Setup', 'Score Entry'] as const} value={mode} onChange={setMode} />

      <Animated.View style={animStyle} {...panHandlers}>
        {day === 'Day 1 · Team' ? (
          mode === 'Match Setup' ? (
            <Day1Setup tournament={active} />
          ) : (
            <Day1Scoring tournament={active} />
          )
        ) : mode === 'Match Setup' ? (
          <Day2Setup tournament={active} />
        ) : (
          <Day2Scoring tournament={active} />
        )}
      </Animated.View>

      <Button label="End Tournament" variant="danger" onPress={handleEnd} />
    </Screen>
  );
}

// A tiny Alert wrapper so this file doesn't need to import RN's Alert with two call shapes.
function Alert(title: string, message: string, onConfirm: () => void) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Alert: RNAlert } = require('react-native');
  RNAlert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'End Tournament', style: 'destructive', onPress: onConfirm },
  ]);
}

function playerName(players: Player[], id: string | null): string {
  if (!id) return 'Unassigned';
  return players.find(p => p.id === id) ? playerFullName(players.find(p => p.id === id)!) : 'Unknown';
}

// ---------------------------------------------------------------------------
// Match Setup
// ---------------------------------------------------------------------------

function Day1Setup({ tournament }: { tournament: Tournament }) {
  const { data, assignDay1Slot } = useApp();
  const [picker, setPicker] = useState<{ matchIndex: number; side: TeamId; slot: 0 | 1 } | null>(null);
  if (!data) return null;

  const assignedToday = new Set(
    tournament.matches.day1.flatMap(m => [...m.boere, ...m.british]).filter((id): id is string => !!id),
  );

  const rosterFor = (side: TeamId) => (side === 'boere' ? tournament.rosters.boere : tournament.rosters.british)
    .map(r => data.players.find(p => p.id === r.playerId))
    .filter((p): p is Player => !!p);

  return (
    <View style={styles.gap}>
      {tournament.matches.day1.map((m, i) => (
        <Card key={m.match} style={styles.gap}>
          <Text style={[type.caption, styles.subtext]}>MATCH {m.match}</Text>
          <View style={styles.setupRow}>
            <SetupSlotPair
              side="boere"
              values={m.boere}
              onPress={slot => setPicker({ matchIndex: i, side: 'boere', slot })}
              players={data.players}
            />
            <Text style={[type.small, styles.subtext]}>vs</Text>
            <SetupSlotPair
              side="british"
              values={m.british}
              onPress={slot => setPicker({ matchIndex: i, side: 'british', slot })}
              players={data.players}
            />
          </View>
        </Card>
      ))}

      <PickerModal
        visible={picker !== null}
        title="Assign Player"
        items={picker ? rosterFor(picker.side) : []}
        keyExtractor={p => p.id}
        renderLabel={p => playerFullName(p)}
        disabledKeys={
          picker
            ? new Set([...assignedToday].filter(id => id !== tournament.matches.day1[picker.matchIndex][picker.side][picker.slot]))
            : undefined
        }
        onSelect={p => {
          if (!picker) return;
          assignDay1Slot(tournament.id, picker.matchIndex, picker.side, picker.slot, p.id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function SetupSlotPair({
  side,
  values,
  onPress,
  players,
}: {
  side: TeamId;
  values: [string | null, string | null];
  onPress: (slot: 0 | 1) => void;
  players: Player[];
}) {
  return (
    <View style={styles.slotPair}>
      {([0, 1] as const).map(slot => (
        <Pressable key={slot} style={[styles.slot, { borderColor: teamColor(side) }]} onPress={() => onPress(slot)}>
          <Text style={[type.small, values[slot] ? styles.text : styles.subtext]} numberOfLines={1}>
            {playerName(players, values[slot])}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Day2Setup({ tournament }: { tournament: Tournament }) {
  const { data, assignDay2Slot } = useApp();
  const [picker, setPicker] = useState<{ matchIndex: number; side: TeamId } | null>(null);
  if (!data) return null;

  const assignedToday = new Set(
    tournament.matches.day2.flatMap(m => [m.boere, m.british]).filter((id): id is string => !!id),
  );

  const rosterFor = (side: TeamId) => (side === 'boere' ? tournament.rosters.boere : tournament.rosters.british)
    .map(r => data.players.find(p => p.id === r.playerId))
    .filter((p): p is Player => !!p);

  return (
    <View style={styles.gap}>
      {tournament.matches.day2.map((m, i) => (
        <Card key={m.match} style={styles.gap}>
          <Text style={[type.caption, styles.subtext]}>MATCH {m.match}</Text>
          <View style={styles.setupRow}>
            <Pressable style={[styles.slot, styles.slotWide, { borderColor: teamColor('boere') }]} onPress={() => setPicker({ matchIndex: i, side: 'boere' })}>
              <Text style={[type.small, m.boere ? styles.text : styles.subtext]}>{playerName(data.players, m.boere)}</Text>
            </Pressable>
            <Text style={[type.small, styles.subtext]}>vs</Text>
            <Pressable style={[styles.slot, styles.slotWide, { borderColor: teamColor('british') }]} onPress={() => setPicker({ matchIndex: i, side: 'british' })}>
              <Text style={[type.small, m.british ? styles.text : styles.subtext]}>{playerName(data.players, m.british)}</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <PickerModal
        visible={picker !== null}
        title="Assign Player"
        items={picker ? rosterFor(picker.side) : []}
        keyExtractor={p => p.id}
        renderLabel={p => playerFullName(p)}
        disabledKeys={
          picker
            ? new Set([...assignedToday].filter(id => id !== tournament.matches.day2[picker.matchIndex][picker.side]))
            : undefined
        }
        onSelect={p => {
          if (!picker) return;
          assignDay2Slot(tournament.id, picker.matchIndex, picker.side, p.id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Score Entry
// ---------------------------------------------------------------------------

function ResultPicker({
  result,
  onChange,
  disabled,
}: {
  result: MatchOutcome | null;
  onChange: (r: MatchOutcome) => void;
  disabled?: boolean;
}) {
  const options: { key: MatchOutcome; label: string; color: string }[] = [
    { key: 'boere', label: 'Boere', color: teamColor('boere') },
    { key: 'halved', label: 'Halved', color: colors.accent },
    { key: 'british', label: 'British', color: teamColor('british') },
  ];
  return (
    <View style={styles.resultRow}>
      {options.map(opt => {
        const active = result === opt.key;
        return (
          <Pressable
            key={opt.key}
            disabled={disabled}
            onPress={() => onChange(opt.key)}
            style={[
              styles.resultBtn,
              { borderColor: opt.color },
              active && { backgroundColor: opt.color },
              disabled && styles.resultBtnDisabled,
            ]}
          >
            <Text style={[type.smallStrong, { color: active ? colors.onAccent : opt.color }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScorePicker({ score, onChange }: { score: MatchScore | null; onChange: (s: MatchScore) => void }) {
  return (
    <View style={styles.scoreRow}>
      {MATCH_SCORE_OPTIONS.map(opt => {
        const active = score === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.scoreChip, active && styles.scoreChipActive]}
          >
            <Text style={[type.caption, active ? { color: colors.onAccent } : styles.subtext]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Day1Scoring({ tournament }: { tournament: Tournament }) {
  const { data, setDay1Result } = useApp();
  if (!data) return null;

  return (
    <View style={styles.gap}>
      {tournament.matches.day1.map((m, i) => (
        <MatchScoreCard
          key={m.match}
          label={`Match ${m.match}`}
          boereLabel={m.boere.map(id => playerName(data.players, id)).join(' & ')}
          britishLabel={m.british.map(id => playerName(data.players, id)).join(' & ')}
          match={m}
          ready={m.boere.every(Boolean) && m.british.every(Boolean)}
          onSetResult={(result, score) => setDay1Result(tournament.id, i, result, score)}
        />
      ))}
    </View>
  );
}

function Day2Scoring({ tournament }: { tournament: Tournament }) {
  const { data, setDay2Result } = useApp();
  if (!data) return null;

  return (
    <View style={styles.gap}>
      {tournament.matches.day2.map((m, i) => (
        <MatchScoreCard
          key={m.match}
          label={`Match ${m.match}`}
          boereLabel={playerName(data.players, m.boere)}
          britishLabel={playerName(data.players, m.british)}
          match={m}
          ready={!!m.boere && !!m.british}
          onSetResult={(result, score) => setDay2Result(tournament.id, i, result, score)}
        />
      ))}
    </View>
  );
}

function MatchScoreCard({
  label,
  boereLabel,
  britishLabel,
  match,
  ready,
  onSetResult,
}: {
  label: string;
  boereLabel: string;
  britishLabel: string;
  match: Day1Match | Day2Match;
  ready: boolean;
  onSetResult: (result: MatchOutcome, score: MatchScore | null) => void;
}) {
  return (
    <Card style={styles.gap}>
      <Text style={[type.caption, styles.subtext]}>{label.toUpperCase()}</Text>
      {!ready ? (
        <Text style={[type.small, styles.subtext]}>Assign both players in Match Setup first.</Text>
      ) : (
        <>
          <View style={styles.scoringNames}>
            <Text style={[type.body, { color: teamColor('boere') }]} numberOfLines={1}>{boereLabel}</Text>
            <Text style={[type.small, styles.subtext]}>vs</Text>
            <Text style={[type.body, { color: teamColor('british') }]} numberOfLines={1}>{britishLabel}</Text>
          </View>
          <ResultPicker result={match.result} onChange={r => onSetResult(r, r === 'halved' ? null : match.score)} />
          {match.result && match.result !== 'halved' && (
            <ScorePicker score={match.score} onChange={s => onSetResult(match.result as MatchOutcome, s)} />
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  gap: { gap: spacing.md },
  setupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotPair: { flex: 1, gap: spacing.xs },
  slot: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  slotWide: { flex: 1 },
  resultRow: { flexDirection: 'row', gap: spacing.sm },
  resultBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultBtnDisabled: { opacity: 0.4 },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  scoreChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  scoreChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  scoringNames: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
