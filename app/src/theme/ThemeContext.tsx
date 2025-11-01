import React, { createContext, useContext } from 'react';
import { AppTheme, darkTheme, lightTheme } from './theme';

const ThemeContext = createContext<AppTheme>(darkTheme);

export type ThemeProviderProps = {
  value?: AppTheme;
  children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ value = darkTheme, children }) => {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};
