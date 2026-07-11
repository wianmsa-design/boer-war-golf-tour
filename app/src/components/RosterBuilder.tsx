import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatHandicap, Player, playerFullName, RosterEntry, TeamId, Tournament } from '../models';
import { mostRecentHandicap } from '../services/stats';
import { colors, radius, spacing, teamLabel, type } from '../theme';
import Card from './Card';
import PlayerIcon from './PlayerIcon';
import PickerModal from './PickerModal';
import HandicapField from './HandicapField';

interface Props {
  playersPerTeam: number;
  boereRoster: RosterEntry[];
  britishRoster: RosterEntry[];
  onChangeBoere: (r: RosterEntry[]) => void;
  onChangeBritish: (r: RosterEntry[]) => void;
  availablePlayers: Player[];
  tournaments: Tournament[];
}

export default function RosterBuilder({
  playersPerTeam,
  boereRoster,
  britishRoster,
  onChangeBoere,
  onChangeBritish,
  availablePlayers,
  tournaments,
}: Props) {
  const [pickerFor, setPickerFor] = useState<TeamId | null>(null);

  const assignedIds = new Set([...boereRoster, ...britishRoster].map(r => r.playerId));
  const pickerItems = availablePlayers.filter(p => !assignedIds.has(p.id));

  const addToTeam = (team: TeamId, player: Player) => {
    const handicap = mostRecentHandicap(tournaments, player.id);
    const entry: RosterEntry = { playerId: player.id, handicap };
    if (team === 'boere') onChangeBoere([...boereRoster, entry]);
    else onChangeBritish([...britishRoster, entry]);
    setPickerFor(null);
  };

  const removeFromTeam = (team: TeamId, playerId: string) => {
    if (team === 'boere') onChangeBoere(boereRoster.filter(r => r.playerId !== playerId));
    else onChangeBritish(britishRoster.filter(r => r.playerId !== playerId));
  };

  const setHandicap = (team: TeamId, playerId: string, handicap: RosterEntry['handicap']) => {
    const update = (roster: RosterEntry[]) => roster.map(r => (r.playerId === playerId ? { ...r, handicap } : r));
    if (team === 'boere') onChangeBoere(update(boereRoster));
    else onChangeBritish(update(britishRoster));
  };

  return (
    <View style={styles.gap}>
      <TeamColumn
        team="boere"
        roster={boereRoster}
        slots={playersPerTeam}
        players={availablePlayers}
        onAdd={() => setPickerFor('boere')}
        onRemove={id => removeFromTeam('boere', id)}
        onHandicapChange={(id, h) => setHandicap('boere', id, h)}
      />
      <TeamColumn
        team="british"
        roster={britishRoster}
        slots={playersPerTeam}
        players={availablePlayers}
        onAdd={() => setPickerFor('british')}
        onRemove={id => removeFromTeam('british', id)}
        onHandicapChange={(id, h) => setHandicap('british', id, h)}
      />

      <PickerModal
        visible={pickerFor !== null}
        title={pickerFor ? `Add to ${teamLabel(pickerFor)}` : ''}
        items={pickerItems}
        keyExtractor={p => p.id}
        renderLabel={p => playerFullName(p)}
        onSelect={p => pickerFor && addToTeam(pickerFor, p)}
        onClose={() => setPickerFor(null)}
        searchable
      />
    </View>
  );
}

function TeamColumn({
  team,
  roster,
  slots,
  players,
  onAdd,
  onRemove,
  onHandicapChange,
}: {
  team: TeamId;
  roster: RosterEntry[];
  slots: number;
  players: Player[];
  onAdd: () => void;
  onRemove: (playerId: string) => void;
  onHandicapChange: (playerId: string, handicap: RosterEntry['handicap']) => void;
}) {
  const remaining = slots - roster.length;
  return (
    <Card style={styles.column}>
      <View style={styles.columnHeader}>
        <Text style={[type.h2, styles.text]}>{teamLabel(team).toUpperCase()}</Text>
        <Text style={[type.small, styles.subtext]}>{roster.length} / {slots}</Text>
      </View>

      {roster.map(entry => {
        const player = players.find(p => p.id === entry.playerId);
        if (!player) return null;
        return (
          <View key={entry.playerId} style={styles.slotRow}>
            <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={26} />
            <Text style={[type.body, styles.text, styles.slotName]} numberOfLines={1}>{playerFullName(player)}</Text>
            <HandicapField value={entry.handicap} onChange={h => onHandicapChange(entry.playerId, h)} />
            <Pressable onPress={() => onRemove(entry.playerId)} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </Pressable>
          </View>
        );
      })}

      {remaining > 0 && (
        <Pressable style={styles.addSlot} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[type.body, { color: colors.accent }]}>Add player ({remaining} left)</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  column: { gap: spacing.sm },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  text: { color: colors.text, textAlign: 'left' },
  subtext: { color: colors.subtext, textAlign: 'left' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  slotName: { flex: 1 },
  addSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accentMuted,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
});
