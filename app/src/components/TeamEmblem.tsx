import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamId } from '../models';
import { teamColor } from '../theme';

interface Props {
  team: TeamId;
  size?: number;
}

/**
 * Placeholder emblem: team initial in a coloured disc. Swap for
 * boere_emblem_512 / british_emblem_512 once those assets land — this is the
 * seam, callers don't need to change.
 */
export default function TeamEmblem({ team, size = 96 }: Props) {
  const color = teamColor(team);
  const initial = team === 'boere' ? 'BO' : 'BR';
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}22` },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.32, color }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '800',
  },
});
