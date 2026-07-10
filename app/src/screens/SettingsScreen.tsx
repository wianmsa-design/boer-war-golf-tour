import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import PlayerManagementScreen from './settings/PlayerManagementScreen';
import TournamentManagementScreen from './settings/TournamentManagementScreen';
import { useApp } from '../services/AppContext';
import { colors, type } from '../theme';

type SubTab = 'Players' | 'Tournament';

export default function SettingsScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Players');

  if (loading && !data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <Card>
          <Text style={[type.h2, { color: colors.text }]}>Couldn't load data</Text>
          <Text style={[type.body, { color: colors.subtext }]}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SegmentedControl options={['Players', 'Tournament'] as const} value={tab} onChange={setTab} />
      {tab === 'Players' ? <PlayerManagementScreen /> : <TournamentManagementScreen />}
    </Screen>
  );
}
