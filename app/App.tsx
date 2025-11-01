import React from 'react';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme, NavigationContainer } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, themes } from './src/theme/ThemeContext';
import { useSettingsStore } from './src/store/useSettingsStore';

const App: React.FC = () => {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);

  const resolvedScheme = themePreference === 'system' ? colorScheme ?? 'light' : themePreference;
  const appTheme = resolvedScheme === 'dark' ? themes.dark : themes.light;
  const navigationTheme = resolvedScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

  return (
    <ThemeProvider value={appTheme}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;
