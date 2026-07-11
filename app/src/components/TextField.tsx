import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

interface Props extends TextInputProps {
  label?: string;
}

export default function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={[type.caption, styles.label]}>{label.toUpperCase()}</Text>}
      <TextInput
        placeholderTextColor={colors.subtext}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.subtext, textAlign: 'left' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...type.body,
    textAlign: 'left',
  },
});
