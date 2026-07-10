import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Day1Match, Day2Match, formatHandicap, Player, playerFullName, Tournament } from '../models';
import { computeStanding, playerPointsInTournament } from '../services/stats';
import { colors, radius, spacing, teamColor, type } from '../theme';
import Card from './Card';
import PlayerIcon from './PlayerIcon';

interface Props {
  tournament: Tournament;
  players: Player[];
}

function nameFor(players: Player[], id: string | null): string {
  if (!id) return 'TBC';
  const p = players.find(pl => pl.id === id);
  return p ? playerFullName(p) : 'Unknown player';
}

function outcomeLabel(m: Day1Match | Day2Match): string {
  if (m.result === null) return 'Not yet played';
  if (m.result === 'halved') return `Halved${m.score ? '' : ''}`;
  const winner = m.result === 'boere' ? 'Boere' : 'British';
  return m.score ? `${winner} win ${m.score}` : `${winner} win`;
}

export default function TournamentDetail({ tournament, players }: Props) {
  const standing = tournament.status === 'ended' ? tournament.result : computeStanding(tournament);
  const sameCourse = tournament.courses.day1 === tournament.courses.day2;
  const tied = standing.boere === standing.british && tournament.status === 'ended';

  const rosterIds = [
    ...tournament.rosters.boere.map(r => r.playerId),
    ...tournament.rosters.british.map(r => r.playerId),
  ];

  return (
    <View style={styles.container}>
      <Card>
        <Text style={[type.h1, styles.text]}>{tournament.name}</Text>
        <Text style={[type.small, styles.subtext]}>
          {sameCourse ? tournament.courses.day1 : `Day 1: ${tournament.courses.day1}  ·  Day 2: ${tournament.courses.day2}`}
        </Text>
        <View style={styles.standingRow}>
          <Text style={[type.display, { color: teamColor('boere') }]}>{standing.boere}</Text>
          <Text style={[type.h2, styles.subtext]}>{tied ? 'Tied' : 'vs'}</Text>
          <Text style={[type.display, { color: teamColor('british') }]}>{standing.british}</Text>
        </View>
        <View style={styles.standingLabels}>
          <Text style={[type.caption, { color: teamColor('boere') }]}>BOERE</Text>
          <Text style={[type.caption, { color: teamColor('british') }]}>BRITISH</Text>
        </View>
      </Card>

      <Section title="Day 1 · Four-ball">
        {tournament.matches.day1.map(m => (
          <MatchRow
            key={m.match}
            label={`Match ${m.match}`}
            boere={m.boere.map(id => nameFor(players, id)).join(' & ')}
            british={m.british.map(id => nameFor(players, id)).join(' & ')}
            outcome={outcomeLabel(m)}
            decided={m.result !== null}
          />
        ))}
      </Section>

      <Section title="Day 2 · Singles">
        {tournament.matches.day2.map(m => (
          <MatchRow
            key={m.match}
            label={`Match ${m.match}`}
            boere={nameFor(players, m.boere)}
            british={nameFor(players, m.british)}
            outcome={outcomeLabel(m)}
            decided={m.result !== null}
          />
        ))}
      </Section>

      <Section title="Players">
        {rosterIds.map(id => {
          const player = players.find(p => p.id === id);
          if (!player) return null;
          const onBoere = tournament.rosters.boere.some(r => r.playerId === id);
          const team = onBoere ? 'boere' : 'british';
          const rosterEntry = (onBoere ? tournament.rosters.boere : tournament.rosters.british).find(r => r.playerId === id);
          const points = playerPointsInTournament(tournament, id);
          return (
            <View key={id} style={styles.playerRow}>
              <PlayerIcon firstName={player.firstName} surname={player.surname} team={team} size={26} />
              <Text style={[type.body, styles.text, styles.playerName]}>{playerFullName(player)}</Text>
              {rosterEntry?.handicap !== null && rosterEntry?.handicap !== undefined && (
                <Text style={[type.small, styles.subtext]}>{formatHandicap(rosterEntry.handicap)}</Text>
              )}
              <Text style={[type.smallStrong, { color: teamColor(team) }]}>{points} pts</Text>
            </View>
          );
        })}
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[type.caption, styles.subtext, styles.sectionTitle]}>{title.toUpperCase()}</Text>
      <Card style={styles.sectionCard}>{children}</Card>
    </View>
  );
}

function MatchRow({
  label,
  boere,
  british,
  outcome,
  decided,
}: {
  label: string;
  boere: string;
  british: string;
  outcome: string;
  decided: boolean;
}) {
  return (
    <View style={styles.matchRow}>
      <Text style={[type.caption, styles.subtext]}>{label}</Text>
      <View style={styles.matchPlayers}>
        <Text style={[type.body, { color: teamColor('boere') }]} numberOfLines={1}>{boere}</Text>
        <Text style={[type.small, styles.subtext]}>vs</Text>
        <Text style={[type.body, { color: teamColor('british') }]} numberOfLines={1}>{british}</Text>
      </View>
      <Text style={[type.small, decided ? styles.text : styles.subtext]}>{outcome}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  standingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxxl,
  },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  sectionCard: { gap: spacing.md },
  matchRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  matchPlayers: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  playerName: { flex: 1 },
  radius: { borderRadius: radius.md },
});
