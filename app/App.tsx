import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './src/services/AppContext';
import { colors } from './src/theme';
import CurrentScreen from './src/screens/CurrentScreen';
import StatsScreen from './src/screens/StatsScreen';
import HistoricalScreen from './src/screens/HistoricalScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ScoreEntryScreen from './src/screens/ScoreEntryScreen';

const Tab = createBottomTabNavigator();

function AppNav() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: 54 + insets.bottom,
              paddingBottom: 6 + insets.bottom,
              paddingTop: 4,
            },
            tabBarShowLabel: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.subtext,
            tabBarIcon: ({ focused, color }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                'Score Entry': focused ? 'create' : 'create-outline',
                'Active Tournament': focused ? 'flag' : 'flag-outline',
                Stats: focused ? 'bar-chart' : 'bar-chart-outline',
                Historical: focused ? 'time' : 'time-outline',
                Settings: focused ? 'settings' : 'settings-outline',
              };
              return <Ionicons name={icons[route.name]} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Stats" component={StatsScreen} />
          <Tab.Screen name="Score Entry" component={ScoreEntryScreen} />
          <Tab.Screen name="Active Tournament" component={CurrentScreen} />
          <Tab.Screen name="Historical" component={HistoricalScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNav />
      </AppProvider>
    </SafeAreaProvider>
  );
}
