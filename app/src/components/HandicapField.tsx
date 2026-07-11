import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { formatHandicap, Handicap, parseHandicapInput } from '../models';
import { colors, radius, type } from '../theme';

interface Props {
  value: Handicap;
  onChange: (h: Handicap) => void;
}

/** Compact handicap entry: type "16" or "+2". Turns red while the text doesn't parse to a valid handicap. */
export default function HandicapField({ value, onChange }: Props) {
  const [text, setText] = useState(formatHandicap(value));

  useEffect(() => {
    setText(formatHandicap(value));
  }, [value]);

  const invalid = text.trim() !== '' && parseHandicapInput(text) === null;

  return (
    <TextInput
      value={text}
      onChangeText={t => {
        setText(t);
        const parsed = parseHandicapInput(t);
        if (parsed !== null || t.trim() === '') onChange(parsed);
      }}
      placeholder="hcp"
      placeholderTextColor={colors.subtext}
      keyboardType="numbers-and-punctuation"
      style={[styles.input, invalid && styles.invalid]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 6,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'transparent',
    ...type.smallStrong,
    textAlign: 'center',
  },
  invalid: {
    borderColor: colors.danger,
  },
});
