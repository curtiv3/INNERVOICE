import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

type RecordButtonProps = {
  onPress?: () => void;
  label?: string;
};

export const RecordButton: React.FC<RecordButtonProps> = ({ onPress, label = 'Start Recording' }) => {
  const theme = useAppTheme();

  return (
    <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={onPress}>
      <Text style={[styles.label, { color: theme.surface }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
