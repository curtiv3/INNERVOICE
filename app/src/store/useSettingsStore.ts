import { create } from 'zustand';

type ThemePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  setThemePreference: (preference) => set({ themePreference: preference }),
}));
