import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { TeamId } from '../models';
import { colors } from '../theme';

interface Props {
  firstName: string;
  surname: string;
  team?: TeamId;
  size?: number;
}

const ICONS: Record<TeamId, any> = {
  boere: require('../../assets/team/boere_icon_96.png'),
  british: require('../../assets/team/british_icon_96.png'),
};

/** Small inline player marker: the team icon (flag vs Union Jack) in a neutral ring, or initials when no team context. */
export default function PlayerIcon({ firstName, surname, team, size = 28 }: Props) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      {team ? (
        <Image
          source={ICONS[team]}
          style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
          {`${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontWeight: '700',
  },
});
