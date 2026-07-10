import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, teamColor, teamMutedColor, type } from '../theme';
import { TeamId } from '../models';

interface Props {
  team: TeamId;
  label: string;
}

/** Small pill used to show a team-attributed value (score, W/L, streak). One of the few places team colour is allowed. */
export default function ScorePill({ team, label }: Props) {
  return (
    <View style={[styles.pill, { backgroundColor: teamMutedColor(team) }]}>
      <Text style={[styles.text, { color: teamColor(team) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { ...type.smallStrong },
});
