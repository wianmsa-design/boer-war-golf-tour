import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Day1Match, Day2Match, formatHandicap, MatchOutcome, Player, TeamId, Tournament } from '../models';
import { computeStanding, playerPointsInTournament } from '../services/stats';
import { colors, spacing, teamLabel, type } from '../theme';
import Card from './Card';
import PlayerIcon from './PlayerIcon';
import TeamEmblem from './TeamEmblem';

interface Props {
  tournament: Tournament;
  players: Player[];
}

function firstNameFor(players: Player[], id: string | null): string {
  if (!id) return 'TBC';
  const p = players.find(pl => pl.id === id);
  return p ? p.firstName : 'Unknown';
}

function outcomeLabel(m: Day1Match | Day2Match): string {
  if (m.result === null) return 'Not yet played';
  if (m.result === 'halved') return 'Halved';
  const winner = teamLabel(m.result);
  return m.score ? `${winner} win ${m.score}` : `${winner} win`;
}

export default function TournamentDetail({ tournament, players }: Props) {
  const standing = tournament.status === 'ended' ? tournament.result : computeStanding(tournament);
  const sameCourse = tournament.courses.day1 === tournament.courses.day2;
  const tied = standing.boere === standing.british && tournament.status === 'ended';
  const winnerSide: TeamId | null = standing.boere > standing.british ? 'boere' : standing.british > standing.boere ? 'british' : null;

  const leaderboard = [
    ...tournament.rosters.boere.map(r => ({ ...r, team: 'boere' as const })),
    ...tournament.rosters.british.map(r => ({ ...r, team: 'british' as const })),
  ]
    .map(entry => ({ entry, points: playerPointsInTournament(tournament, entry.playerId) }))
    .sort((a, b) => b.points - a.points);

  return (
    <View style={styles.container}>
      <Card>
        <Text style={[type.h1, styles.text, styles.center]}>{tournament.name}</Text>
        <Text style={[type.small, styles.subtext, styles.center]}>
          {sameCourse ? tournament.courses.day1 : `Day 1: ${tournament.courses.day1}  ·  Day 2: ${tournament.courses.day2}`}
        </Text>
        <View style={styles.standingRow}>
          <View style={styles.standingCol}>
            <TeamEmblem team="boere" size={44} />
            <Text style={[type.display, styles.text]}>{standing.boere}</Text>
            <Text style={[type.caption, winnerSide === 'boere' ? { color: colors.accent } : styles.subtext, styles.center]}>
              {teamLabel('boere').toUpperCase()}
            </Text>
          </View>
          <Text style={[type.h2, styles.subtext]}>{tied ? 'Tied' : 'vs'}</Text>
          <View style={styles.standingCol}>
            <TeamEmblem team="british" size={44} />
            <Text style={[type.display, styles.text]}>{standing.british}</Text>
            <Text style={[type.caption, winnerSide === 'british' ? { color: colors.accent } : styles.subtext, styles.center]}>
              {teamLabel('british').toUpperCase()}
            </Text>
          </View>
        </View>
      </Card>

      <Section title="Day 1 · Four-ball">
        {tournament.matches.day1.map(m => (
          <MatchRow
            key={m.match}
            label={`Match ${m.match}`}
            boere={m.boere.map(id => firstNameFor(players, id)).join(' & ')}
            british={m.british.map(id => firstNameFor(players, id)).join(' & ')}
            result={m.result}
            outcome={outcomeLabel(m)}
          />
        ))}
      </Section>

      <Section title="Day 2 · Singles">
        {tournament.matches.day2.map(m => (
          <MatchRow
            key={m.match}
            label={`Match ${m.match}`}
            boere={firstNameFor(players, m.boere)}
            british={firstNameFor(players, m.british)}
            result={m.result}
            outcome={outcomeLabel(m)}
          />
        ))}
      </Section>

      <Section title="Players">
        <View style={styles.leaderboardHeader}>
          <Text style={[type.caption, styles.subtext, styles.lbPos, styles.noLetterSpacing]}>#</Text>
          <View style={styles.lbIcon} />
          <Text style={[type.caption, styles.subtext, styles.lbName]}>PLAYER</Text>
          <Text style={[type.caption, styles.subtext, styles.lbHcp, styles.noLetterSpacing]}>HCP</Text>
          <Text style={[type.caption, styles.subtext, styles.lbPts, styles.noLetterSpacing]}>PTS</Text>
        </View>
        {leaderboard.map(({ entry, points }, i) => {
          const player = players.find(p => p.id === entry.playerId);
          if (!player) return null;
          return (
            <View key={entry.playerId} style={styles.leaderboardRow}>
              <Text style={[type.small, styles.subtext, styles.lbPos]}>{i + 1}</Text>
              <View style={styles.lbIcon}>
                <PlayerIcon firstName={player.firstName} surname={player.surname} team={entry.team} size={26} />
              </View>
              <Text style={[type.body, styles.text, styles.lbName]} numberOfLines={1}>{player.firstName}</Text>
              <Text style={[type.small, styles.subtext, styles.lbHcp]}>
                {entry.handicap !== null ? formatHandicap(entry.handicap) : '—'}
              </Text>
              <Text style={[type.smallStrong, { color: colors.accent }, styles.lbPts]}>{points}</Text>
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
  result,
  outcome,
}: {
  label: string;
  boere: string;
  british: string;
  result: MatchOutcome | null;
  outcome: string;
}) {
  const decided = result !== null;
  return (
    <View style={styles.matchRow}>
      <Text style={[type.caption, styles.subtext, styles.center]}>{label}</Text>
      <View style={styles.matchPlayers}>
        <Text style={[type.body, result === 'boere' ? { color: colors.accent } : styles.text]} numberOfLines={1}>{boere}</Text>
        <Text style={[type.small, styles.subtext]}>vs</Text>
        <Text style={[type.body, result === 'british' ? { color: colors.accent } : styles.text]} numberOfLines={1}>{british}</Text>
      </View>
      <Text style={[type.small, decided ? styles.text : styles.subtext, styles.center]}>{outcome}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  text: { color: colors.text },
  subtext: { color: colors.subtext },
  center: { textAlign: 'center' },
  noLetterSpacing: { letterSpacing: 0 },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  standingCol: { alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs, textAlign: 'center' },
  sectionCard: { gap: spacing.md },
  matchRow: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  matchPlayers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  lbPos: { width: 24, textAlign: 'center' },
  lbIcon: { width: 32, alignItems: 'center' },
  lbName: { flex: 1, textAlign: 'left' },
  lbHcp: { width: 40, textAlign: 'center' },
  lbPts: { width: 36, textAlign: 'center' },
});
