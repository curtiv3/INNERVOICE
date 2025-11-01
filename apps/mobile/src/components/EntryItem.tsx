import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { useI18n } from '../i18n';

export type EntryItemProps = {
  title: string;
  timestamp: number;
  favorite?: boolean;
  pendingSync?: boolean;
  encrypted?: boolean;
  score?: number | null;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function EntryItem({
  title,
  timestamp,
  favorite,
  pendingSync,
  encrypted,
  score,
  onPress,
  onLongPress
}: EntryItemProps) {
  const { t, language } = useI18n();
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
    [language]
  );
  const icons: string[] = [];
  if (favorite) icons.push('★');
  if (encrypted) icons.push('🔒');
  if (pendingSync) icons.push('☁️');
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {title || t('history.item.empty')}
        </Text>
        <Text style={styles.icons}>{icons.join(' ')}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatter.format(new Date(timestamp))}</Text>
        {typeof score === 'number' ? (
          <Badge label={t('history.item.relevance', { value: (score * 100).toFixed(0) })} tone="accent" compact />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8
  },
  pressed: {
    opacity: 0.85
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  title: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '500',
    flex: 1
  },
  icons: {
    color: '#FACC15',
    fontSize: 18
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12
  }
});

export default EntryItem;
