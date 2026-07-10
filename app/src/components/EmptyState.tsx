import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

interface Props {
  title: string;
  message: string;
}

/** Centered, card-free empty state for a whole screen. */
export default function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[type.h2, styles.title]}>{title}</Text>
      <Text style={[type.body, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.sm },
  title: { color: colors.text, textAlign: 'center' },
  message: { color: colors.subtext, textAlign: 'center' },
});
