import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';

export type RecordButtonProps = {
  active?: boolean;
  busy?: boolean;
  label?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
};

export function RecordButton({ active = false, busy = false, label, onPress, onLongPress, disabled }: RecordButtonProps) {
  const { t } = useI18n();
  const statusLabel = busy
    ? t('record.status.processing')
    : active
      ? t('record.status.active')
      : label ?? t('record.label.default');
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed, (disabled || busy) && styles.disabled]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled || busy}
      >
        <View style={[styles.inner, active && styles.innerActive]}>
          <View style={[styles.dot, active && styles.dotActive]} />
        </View>
      </Pressable>
      <Text style={styles.caption}>{statusLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12
  },
  button: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    opacity: 0.8
  },
  disabled: {
    opacity: 0.5
  },
  inner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1F2937'
  },
  innerActive: {
    borderColor: '#F87171'
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155'
  },
  dotActive: {
    backgroundColor: '#DC2626'
  },
  caption: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default RecordButton;
