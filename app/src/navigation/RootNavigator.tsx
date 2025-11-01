import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DialogScreen } from '../screens/DialogScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { useAppTheme } from '../theme/ThemeContext';

export type RootTabParamList = {
  Home: undefined;
  Dialog: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const buildPlaceholderIcon = (label: string) => ({ color }: { focused: boolean; color: string; size: number }) => (
  <Text style={{ color, fontSize: 16 }}>{label}</Text>
);

const RootNavigator: React.FC = () => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: buildPlaceholderIcon('🏠') }} />
      <Tab.Screen name="Dialog" component={DialogScreen} options={{ tabBarIcon: buildPlaceholderIcon('💬') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: buildPlaceholderIcon('🕑') }} />
    </Tab.Navigator>
  );
};

export default RootNavigator;
