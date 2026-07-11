import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { TeamId } from '../models';
import { colors } from '../theme';

interface Props {
  team: TeamId;
  size?: number;
}

const EMBLEMS: Record<TeamId, any> = {
  boere: require('../../assets/team/boere_emblem_512.png'),
  british: require('../../assets/team/british_emblem_512.png'),
};

export default function TeamEmblem({ team, size = 96 }: Props) {
  const borderWidth = Math.max(1.5, Math.round(size * 0.03));
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderWidth }]}>
      <Image source={EMBLEMS[team]} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderColor: colors.bg,
  },
});
