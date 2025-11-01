export type AppTheme = {
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
};

export const lightTheme: AppTheme = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  primary: '#6366F1',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

export const darkTheme: AppTheme = {
  background: '#0F172A',
  surface: '#111827',
  primary: '#818CF8',
  text: '#F9FAFB',
  textSecondary: '#94A3B8',
  border: '#1F2937',
};
