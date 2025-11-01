import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type BadgeTone = 'neutral' | 'accent' | 'alert' | 'success';

const BACKGROUNDS: Record<BadgeTone, string> = {
  neutral: '#1F2937',
  accent: '#1E3A8A',
  alert: '#7F1D1D',
  success: '#065F46'
};

const TEXT_COLORS: Record<BadgeTone, string> = {
  neutral: '#E5E7EB',
  accent: '#BFDBFE',
  alert: '#FECACA',
  success: '#BBF7D0'
};

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  compact?: boolean;
};

export function Badge({ label, tone = 'neutral', compact = false }: BadgeProps) {
  return (
    <View style={[styles.base, { backgroundColor: BACKGROUNDS[tone] }, compact && styles.compact]}>
      <Text style={[styles.text, { color: TEXT_COLORS[tone] }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3
  }
});

export default Badge;
