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
  const inner = size - 6;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      {team ? (
        <View style={[styles.iconClip, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          {/* Source icon PNGs have a thin white bezel baked in near their edge — zoom in past it. */}
          <Image
            source={ICONS[team]}
            style={{ width: inner * 1.35, height: inner * 1.35 }}
            resizeMode="cover"
          />
        </View>
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
  iconClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontWeight: '700',
  },
});
