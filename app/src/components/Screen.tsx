import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../theme';

interface Props {
  children: React.ReactNode;
  title?: string;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

/** Standard screen shell: dark background, safe area, pinned title, optional pull-to-refresh. */
export default function Screen({ children, title, onRefresh, refreshing, scroll = true, contentStyle }: Props) {
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={!!refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  ) : undefined;

  const titleEl = title ? <Text style={styles.title}>{title}</Text> : null;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {titleEl}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {titleEl}
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.h1, color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
});
