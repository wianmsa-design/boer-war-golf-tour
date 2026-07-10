import React, { useState } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import PlayerManagementScreen from './settings/PlayerManagementScreen';
import TournamentManagementScreen from './settings/TournamentManagementScreen';
import { useApp } from '../services/AppContext';
import { useAnimatedTab } from '../hooks/useAnimatedTab';
import { colors, type } from '../theme';

const SUB_TABS = ['Players', 'Tournament'] as const;
type SubTab = typeof SUB_TABS[number];

export default function SettingsScreen() {
  const { data, loading, refreshing, error, refresh } = useApp();
  const [tab, setTab] = useState<SubTab>('Players');
  const { panHandlers, animStyle, setTabAnimated } = useAnimatedTab(SUB_TABS, tab, setTab);

  if (loading && !data) {
    return (
      <Screen scroll={false} title="Settings">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing} title="Settings">
        <Card>
          <Text style={[type.h2, { color: colors.text }]}>Couldn't load data</Text>
          <Text style={[type.body, { color: colors.subtext }]}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!data) return null;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} title="Settings">
      <SegmentedControl options={SUB_TABS} value={tab} onChange={setTabAnimated} />
      <Animated.View style={animStyle} {...panHandlers}>
        {tab === 'Players' ? <PlayerManagementScreen /> : <TournamentManagementScreen />}
      </Animated.View>
    </Screen>
  );
}
