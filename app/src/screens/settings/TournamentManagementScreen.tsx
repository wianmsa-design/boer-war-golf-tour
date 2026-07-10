import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import SegmentedControl from '../../components/SegmentedControl';
import PickerModal from '../../components/PickerModal';
import RosterBuilder from '../../components/RosterBuilder';
import { useApp } from '../../services/AppContext';
import { getAllCourses, rememberCustomCourse } from '../../services/courses';
import { getTournament } from '../../services/stats';
import { RosterEntry, Tournament } from '../../models';
import { colors, radius, spacing, type } from '../../theme';

type CourseMode = 'Same course' | 'Different per day';

export default function TournamentManagementScreen() {
  const { data } = useApp();
  if (!data) return null;

  const active = getTournament(data.tournaments, data.currentTournamentId);
  const isActive = active && active.status === 'active';

  return (
    <View style={styles.gap}>
      {isActive ? <EditTournamentForm tournamentId={active!.id} /> : <CreateTournamentWizard />}
      <AllTournamentsList tournaments={data.tournaments} currentTournamentId={data.currentTournamentId} />
    </View>
  );
}

function AllTournamentsList({ tournaments, currentTournamentId }: { tournaments: Tournament[]; currentTournamentId: string | null }) {
  const { deleteTournament } = useApp();
  if (tournaments.length === 0) return null;

  const sorted = [...tournaments].sort((a, b) => b.year - a.year);

  const handleDelete = (t: Tournament) => {
    Alert.alert(
      'Delete tournament',
      `Delete "${t.name}"? This permanently removes it and its results from all-time stats. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTournament(t.id) },
      ],
    );
  };

  return (
    <View style={styles.gap}>
      <Text style={[type.caption, styles.subtext, styles.sectionTitle]}>ALL TOURNAMENTS</Text>
      <Card style={styles.listCard}>
        {sorted.map(t => (
          <View key={t.id} style={styles.tournamentRow}>
            <View style={styles.tournamentInfo}>
              <Text style={[type.bodyStrong, styles.text]}>{t.name}</Text>
              <Text style={[type.small, styles.subtext]}>{t.year}</Text>
            </View>
            {t.status === 'active' && (
              <View style={styles.statusPill}>
                <Text style={[type.caption, { color: colors.accent }]}>ACTIVE</Text>
              </View>
            )}
            <Pressable onPress={() => handleDelete(t)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  );
}

function YearPickerField({ label, value, onChange }: { label: string; value: number; onChange: (y: number) => void }) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y < currentYear + 20; y++) list.push(y);
    return list;
  }, []);

  return (
    <View style={styles.fieldGap}>
      <Text style={[type.caption, styles.subtext]}>{label.toUpperCase()}</Text>
      <Pressable style={styles.coursePicker} onPress={() => setOpen(true)}>
        <Text style={[type.body, styles.text]}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.subtext} />
      </Pressable>
      <PickerModal
        visible={open}
        title="Select Year"
        items={years}
        keyExtractor={y => `${y}`}
        renderLabel={y => `${y}`}
        onSelect={y => {
          onChange(y);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function useCourseList() {
  const [courses, setCourses] = useState<string[]>([]);
  const reload = () => getAllCourses().then(setCourses);
  useEffect(() => {
    reload();
  }, []);
  return { courses, reload };
}

function CoursePickerField({
  label,
  value,
  onChange,
  courses,
  onCourseAdded,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  courses: string[];
  onCourseAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldGap}>
      <Text style={[type.caption, styles.subtext]}>{label.toUpperCase()}</Text>
      <Pressable style={styles.coursePicker} onPress={() => setOpen(true)}>
        <Text style={[type.body, value ? styles.text : styles.subtext]}>{value || 'Select a course'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.subtext} />
      </Pressable>
      <PickerModal
        visible={open}
        title="Select Course"
        items={courses}
        keyExtractor={c => c}
        renderLabel={c => c}
        searchable
        onSelect={c => {
          onChange(c);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onCreateNew={async name => {
          await rememberCustomCourse(name);
          onCourseAdded();
          onChange(name);
          setOpen(false);
        }}
        createNewLabel={q => `Add "${q}" as a new course`}
      />
    </View>
  );
}

function PlayersPerTeamStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.fieldGap}>
      <Text style={[type.caption, styles.subtext]}>PLAYERS PER TEAM</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperBtn} onPress={() => onChange(Math.max(2, value - 2))}>
          <Ionicons name="remove" size={18} color={colors.accent} />
        </Pressable>
        <Text style={[type.h2, styles.text, styles.stepperValue]}>{value}</Text>
        <Pressable style={styles.stepperBtn} onPress={() => onChange(value + 2)}>
          <Ionicons name="add" size={18} color={colors.accent} />
        </Pressable>
      </View>
      <Text style={[type.small, styles.subtext]}>{value} per team → {value * 2} players</Text>
    </View>
  );
}

function CreateTournamentWizard() {
  const { data, createTournament } = useApp();
  const { courses, reload } = useCourseList();
  const currentYear = new Date().getFullYear();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(`${currentYear} Tour`);
  const [year, setYear] = useState(currentYear);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [courseMode, setCourseMode] = useState<CourseMode>('Same course');
  const [courseDay1, setCourseDay1] = useState('');
  const [courseDay2, setCourseDay2] = useState('');
  const [boereRoster, setBoereRoster] = useState<RosterEntry[]>([]);
  const [britishRoster, setBritishRoster] = useState<RosterEntry[]>([]);
  const [saving, setSaving] = useState(false);

  if (!data) return null;

  const availablePlayers = data.players.filter(p => !data.archivedPlayerIds.includes(p.id));

  const step1Valid = name.trim().length > 0 && playersPerTeam >= 2 && playersPerTeam % 2 === 0
    && courseDay1.trim().length > 0 && (courseMode === 'Same course' || courseDay2.trim().length > 0);

  const rostersFull = boereRoster.length === playersPerTeam && britishRoster.length === playersPerTeam;
  const handicapsSet = [...boereRoster, ...britishRoster].every(r => r.handicap !== null);
  const canCreate = rostersFull && handicapsSet;

  const handleCreate = async () => {
    setSaving(true);
    const ok = await createTournament({
      name: name.trim(),
      year,
      playersPerTeam,
      courses: { day1: courseDay1, day2: courseMode === 'Same course' ? courseDay1 : courseDay2 },
      rosters: { boere: boereRoster, british: britishRoster },
    });
    setSaving(false);
    if (!ok) return;
    Alert.alert('Tournament created', `${name.trim()} is now the active tournament.`);
  };

  return (
    <View style={styles.gap}>
      <Card>
        <Text style={[type.caption, styles.subtext]}>NEW TOURNAMENT · STEP {step} OF 2</Text>
      </Card>

      {step === 1 ? (
        <Card style={styles.gap}>
          <TextField label="Name" value={name} onChangeText={setName} />
          <YearPickerField label="Year" value={year} onChange={setYear} />
          <PlayersPerTeamStepper value={playersPerTeam} onChange={setPlayersPerTeam} />
          <View style={styles.fieldGap}>
            <Text style={[type.caption, styles.subtext]}>COURSE(S)</Text>
            <SegmentedControl
              options={['Same course', 'Different per day'] as const}
              value={courseMode}
              onChange={setCourseMode}
            />
          </View>
          <CoursePickerField
            label={courseMode === 'Same course' ? 'Course' : 'Day 1 Course'}
            value={courseDay1}
            onChange={setCourseDay1}
            courses={courses}
            onCourseAdded={reload}
          />
          {courseMode === 'Different per day' && (
            <CoursePickerField
              label="Day 2 Course"
              value={courseDay2}
              onChange={setCourseDay2}
              courses={courses}
              onCourseAdded={reload}
            />
          )}
          <Button label="Next: Assign Players" onPress={() => setStep(2)} disabled={!step1Valid} />
        </Card>
      ) : (
        <View style={styles.gap}>
          <RosterBuilder
            playersPerTeam={playersPerTeam}
            boereRoster={boereRoster}
            britishRoster={britishRoster}
            onChangeBoere={setBoereRoster}
            onChangeBritish={setBritishRoster}
            availablePlayers={availablePlayers}
            tournaments={data.tournaments}
          />
          <View style={styles.actionsRow}>
            <Button label="Back" variant="secondary" onPress={() => setStep(1)} />
            <Button label="Create Tournament" onPress={handleCreate} disabled={!canCreate} loading={saving} />
          </View>
          {!canCreate && (
            <Text style={[type.small, styles.subtext]}>
              Fill every slot and set every handicap to create the tournament.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function EditTournamentForm({ tournamentId }: { tournamentId: string }) {
  const { data, updateTournamentDetails, changePlayersPerTeam, replaceRosters } = useApp();
  const { courses, reload } = useCourseList();
  const tournament = useMemo(() => getTournament(data!.tournaments, tournamentId), [data, tournamentId]);

  const [name, setName] = useState(tournament?.name ?? '');
  const [year, setYear] = useState(tournament?.year ?? new Date().getFullYear());
  const [playersPerTeam, setPlayersPerTeam] = useState(tournament?.playersPerTeam ?? 4);
  const [courseMode, setCourseMode] = useState<CourseMode>(
    tournament && tournament.courses.day1 === tournament.courses.day2 ? 'Same course' : 'Different per day',
  );
  const [courseDay1, setCourseDay1] = useState(tournament?.courses.day1 ?? '');
  const [courseDay2, setCourseDay2] = useState(tournament?.courses.day2 ?? '');
  const [boereRoster, setBoereRoster] = useState<RosterEntry[]>(tournament?.rosters.boere ?? []);
  const [britishRoster, setBritishRoster] = useState<RosterEntry[]>(tournament?.rosters.british ?? []);
  const [saving, setSaving] = useState(false);

  if (!data || !tournament) return null;

  const availablePlayers = data.players.filter(
    p => !data.archivedPlayerIds.includes(p.id)
      || boereRoster.some(r => r.playerId === p.id)
      || britishRoster.some(r => r.playerId === p.id),
  );

  const handicapsSet = [...boereRoster, ...britishRoster].every(r => r.handicap !== null);

  const doSave = async () => {
    setSaving(true);
    if (playersPerTeam !== tournament.playersPerTeam) {
      await changePlayersPerTeam(tournament.id, playersPerTeam);
    }
    await updateTournamentDetails(tournament.id, {
      name: name.trim(),
      year,
      courses: { day1: courseDay1, day2: courseMode === 'Same course' ? courseDay1 : courseDay2 },
    });
    await replaceRosters(tournament.id, { boere: boereRoster, british: britishRoster });
    setSaving(false);
    Alert.alert('Saved', 'Tournament updated.');
  };

  const handleSave = () => {
    if (playersPerTeam !== tournament.playersPerTeam) {
      Alert.alert(
        'Players per team changed',
        'This clears all match results for this tournament (the match count no longer lines up). Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'destructive', onPress: doSave },
        ],
      );
    } else {
      doSave();
    }
  };

  return (
    <View style={styles.gap}>
      <Card>
        <Text style={[type.caption, styles.subtext]}>EDITING · {tournament.name.toUpperCase()}</Text>
      </Card>
      <Card style={styles.gap}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <YearPickerField label="Year" value={year} onChange={setYear} />
        <PlayersPerTeamStepper value={playersPerTeam} onChange={setPlayersPerTeam} />
        <View style={styles.fieldGap}>
          <Text style={[type.caption, styles.subtext]}>COURSE(S)</Text>
          <SegmentedControl options={['Same course', 'Different per day'] as const} value={courseMode} onChange={setCourseMode} />
        </View>
        <CoursePickerField
          label={courseMode === 'Same course' ? 'Course' : 'Day 1 Course'}
          value={courseDay1}
          onChange={setCourseDay1}
          courses={courses}
          onCourseAdded={reload}
        />
        {courseMode === 'Different per day' && (
          <CoursePickerField label="Day 2 Course" value={courseDay2} onChange={setCourseDay2} courses={courses} onCourseAdded={reload} />
        )}
      </Card>

      <RosterBuilder
        playersPerTeam={playersPerTeam}
        boereRoster={boereRoster}
        britishRoster={britishRoster}
        onChangeBoere={setBoereRoster}
        onChangeBritish={setBritishRoster}
        availablePlayers={availablePlayers}
        tournaments={data.tournaments}
      />

      <Button label="Save Changes" onPress={handleSave} loading={saving} disabled={!handicapsSet} />
      {!handicapsSet && <Text style={[type.small, styles.subtext]}>Every assigned player needs a handicap before saving.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  fieldGap: { gap: spacing.xs },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  coursePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { minWidth: 32, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { paddingHorizontal: spacing.xs },
  listCard: { padding: spacing.sm, gap: 0 },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tournamentInfo: { flex: 1, gap: 2 },
  statusPill: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
});
