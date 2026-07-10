import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import PlayerIcon from '../../components/PlayerIcon';
import { useApp } from '../../services/AppContext';
import { playerHasHistory } from '../../services/mutations';
import { Player, playerFullName } from '../../models';
import { colors, radius, spacing, type } from '../../theme';

export default function PlayerManagementScreen() {
  const { data, addPlayer, updatePlayer, deletePlayer, setPlayerArchived } = useApp();
  const [editing, setEditing] = useState<Player | 'new' | null>(null);

  if (!data) return null;

  const players = [...data.players].sort((a, b) => a.firstName.localeCompare(b.firstName));

  const handleDelete = (player: Player) => {
    Alert.alert('Delete player', `Remove ${playerFullName(player)}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlayer(player.id) },
    ]);
  };

  return (
    <View style={styles.gap}>
      <Button label="Add Player" onPress={() => setEditing('new')} />

      {players.map(player => {
        const archived = data.archivedPlayerIds.includes(player.id);
        const hasHistory = playerHasHistory(data, player.id);
        return (
          <Card key={player.id} style={styles.row}>
            <PlayerIcon firstName={player.firstName} surname={player.surname} size={30} />
            <View style={styles.rowText}>
              <Text style={[type.bodyStrong, styles.text]}>{playerFullName(player)}</Text>
              {archived && <Text style={[type.caption, styles.subtext]}>ARCHIVED</Text>}
            </View>
            <Pressable onPress={() => setEditing(player)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="pencil" size={18} color={colors.subtext} />
            </Pressable>
            <Pressable onPress={() => setPlayerArchived(player.id, !archived)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name={archived ? 'arrow-undo' : 'archive-outline'} size={18} color={colors.subtext} />
            </Pressable>
            {!hasHistory && (
              <Pressable onPress={() => handleDelete(player)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
          </Card>
        );
      })}

      <PlayerEditorModal
        visible={editing !== null}
        player={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={async (first, last) => {
          if (editing === 'new') await addPlayer(first, last);
          else if (editing) await updatePlayer(editing.id, first, last);
          setEditing(null);
        }}
      />
    </View>
  );
}

function PlayerEditorModal({
  visible,
  player,
  onClose,
  onSave,
}: {
  visible: boolean;
  player: Player | null;
  onClose: () => void;
  onSave: (firstName: string, surname: string) => void;
}) {
  const [firstName, setFirstName] = useState(player?.firstName ?? '');
  const [surname, setSurname] = useState(player?.surname ?? '');

  React.useEffect(() => {
    if (visible) {
      setFirstName(player?.firstName ?? '');
      setSurname(player?.surname ?? '');
    }
  }, [visible, player]);

  const canSave = firstName.trim().length > 0 && surname.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <Text style={[type.h2, styles.text, styles.sheetTitle]}>{player ? 'Edit Player' : 'Add Player'}</Text>
          <TextField label="First name" value={firstName} onChangeText={setFirstName} autoFocus />
          <TextField label="Surname" value={surname} onChangeText={setSurname} />
          <View style={styles.sheetActions}>
            <Button label="Cancel" variant="secondary" onPress={onClose} />
            <Button label="Save" onPress={() => onSave(firstName, surname)} disabled={!canSave} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  iconBtn: { padding: spacing.xs },
  backdrop: { flex: 1, backgroundColor: colors.dimmed, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: { marginBottom: spacing.xs },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
