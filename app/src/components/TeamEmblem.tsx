import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { TeamId } from '../models';

interface Props {
  team: TeamId;
  size?: number;
}

const EMBLEMS: Record<TeamId, any> = {
  boere: require('../../assets/team/boere_emblem_512.png'),
  british: require('../../assets/team/british_emblem_512.png'),
};

export default function TeamEmblem({ team, size = 96 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={EMBLEMS[team]} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
