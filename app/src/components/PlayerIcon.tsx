import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamId } from '../models';
import { colors, teamColor } from '../theme';

interface Props {
  firstName: string;
  surname: string;
  team?: TeamId;
  size?: number;
}

/**
 * Placeholder avatar: initials in a team-coloured ring. Swap the inner circle
 * for boere_icon_96 / british_icon_96 once those assets land — this component
 * is the seam, callers don't need to change.
 */
export default function PlayerIcon({ firstName, surname, team, size = 28 }: Props) {
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase();
  const ringColor = team ? teamColor(team) : colors.border;
  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: ringColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontWeight: '700',
  },
});
