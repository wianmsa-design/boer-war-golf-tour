import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '../theme';

interface Props<T> {
  visible: boolean;
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderLabel: (item: T) => string;
  renderSubLabel?: (item: T) => string | undefined;
  onSelect: (item: T) => void;
  onClose: () => void;
  searchable?: boolean;
  disabledKeys?: Set<string>;
  /** Shown as an extra row at the top when searchable and no exact match exists (e.g. "Add course"). */
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
}

export default function PickerModal<T>({
  visible,
  title,
  items,
  keyExtractor,
  renderLabel,
  renderSubLabel,
  onSelect,
  onClose,
  searchable,
  disabledKeys,
  onCreateNew,
  createNewLabel,
}: Props<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(i => renderLabel(i).toLowerCase().includes(q));
  }, [items, query, searchable, renderLabel]);

  const exactMatch = items.some(i => renderLabel(i).toLowerCase() === query.trim().toLowerCase());

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={[type.h2, styles.text]}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.subtext} />
            </Pressable>
          </View>

          {searchable && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={colors.subtext}
              style={styles.search}
              autoCapitalize="words"
            />
          )}

          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              searchable && onCreateNew && query.trim() && !exactMatch ? (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onCreateNew(query.trim());
                    setQuery('');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                  <Text style={[type.body, { color: colors.accent }]}>
                    {createNewLabel ? createNewLabel(query.trim()) : `Add "${query.trim()}"`}
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              const key = keyExtractor(item);
              const disabled = disabledKeys?.has(key);
              const sub = renderSubLabel?.(item);
              return (
                <Pressable
                  style={[styles.row, disabled && styles.rowDisabled]}
                  disabled={disabled}
                  onPress={() => {
                    setQuery('');
                    onSelect(item);
                  }}
                >
                  <View style={styles.rowText}>
                    <Text style={[type.body, disabled ? styles.subtext : styles.text]}>{renderLabel(item)}</Text>
                    {sub && <Text style={[type.small, styles.subtext]}>{sub}</Text>}
                  </View>
                  {disabled && <Text style={[type.caption, styles.subtext]}>ASSIGNED</Text>}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={[type.body, styles.subtext, styles.empty]}>No matches.</Text>}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.dimmed, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  list: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowDisabled: { opacity: 0.4 },
  rowText: { flex: 1 },
  text: { color: colors.text, textAlign: 'left' },
  subtext: { color: colors.subtext, textAlign: 'left' },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
});
