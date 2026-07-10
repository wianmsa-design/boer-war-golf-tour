import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/** Custom sub-tab switcher (Teams/Players, Recent/Past, Day 1/Day 2, ...). No native tab-view dependency. */
export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[type.smallStrong, styles.label, active && styles.labelActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  label: { color: colors.subtext },
  labelActive: { color: colors.onAccent },
});
