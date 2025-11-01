import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RecordButton } from '../components/RecordButton';
import { Badge } from '../components/Badge';
import { SectionHeader } from '../components/SectionHeader';
import { useConversationFlow, type ConversationResult } from '../hooks/useConversationFlow';
import { useDatabaseReady } from '../hooks/useDatabaseReady';
import { useSyncSettings } from '../hooks/useSyncSettings';
import { useI18n } from '../i18n';

export type HomeScreenProps = {
  onConversationFinished?: (result: ConversationResult) => void;
};

export function HomeScreen({ onConversationFinished }: HomeScreenProps) {
  const { t } = useI18n();
  const dbReady = useDatabaseReady();
  const { phase, busy, start, stop, reset, currentEntry, persona, hints } = useConversationFlow();
  const { enabled: syncEnabled, loading: syncLoading } = useSyncSettings(dbReady);
  const notifiedRef = useRef<string | null>(null);

  const active = phase === 'recording';

  const statusLabel = t(`home.status.${phase}`);

  useEffect(() => {
    if (phase === 'completed' && currentEntry && currentEntry.entryId !== notifiedRef.current) {
      notifiedRef.current = currentEntry.entryId;
      onConversationFinished?.(currentEntry);
    }
  }, [phase, currentEntry, onConversationFinished]);

  const handlePress = async () => {
    if (!dbReady) return;
    try {
      if (phase === 'idle' || phase === 'completed' || phase === 'error') {
        await start();
        return;
      }
      if (phase === 'recording') {
        await stop();
      }
    } catch (err) {
      console.warn('Conversation flow error', err);
    }
  };

  const secondaryLabel = useMemo(() => {
    if (!currentEntry) {
      return t('home.secondary.prompt');
    }
    const snippet = currentEntry.transcription.text.slice(0, 90);
    const ellipsis = currentEntry.transcription.text.length > 90 ? '…' : '';
    return t('home.secondary.preview', { snippet, ellipsis });
  }, [currentEntry, t]);

  return (
    <View style={styles.container}>
      {!dbReady && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#6CC3F7" />
          <Text style={styles.overlayText}>{t('home.loadingDatabase')}</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.subtitle}>{t('app.tagline')}</Text>
      </View>
      <View style={styles.recordSection}>
        <RecordButton
          active={active}
          busy={busy && !active}
          onPress={handlePress}
          onLongPress={reset}
          label={t('record.label.primary')}
          disabled={!dbReady}
        />
        <View style={styles.statusRow}>
          <Badge label={statusLabel} tone={active ? 'accent' : 'neutral'} />
          <Badge
            label={syncEnabled ? t('common.syncBeta') : t('common.offline')}
            tone={syncEnabled ? 'success' : 'neutral'}
          />
        </View>
        <Text style={styles.statusHint}>{secondaryLabel}</Text>
      </View>
      {currentEntry && (
        <View style={styles.latestSection}>
          <SectionHeader title={t('home.latest.title')} subtitle={t('home.latest.subtitle')} />
          <View style={styles.latestCard}>
            <Text style={styles.latestPersona}>{persona ?? t('home.latest.personaPending')}</Text>
            <Text style={styles.latestText}>{currentEntry.response}</Text>
            <View style={styles.latestBadges}>
              {hints && (
                <>
                  <Badge label={t(`dialog.badges.tempo.${hints.tempoClass}`)} compact />
                  <Badge
                    label={t('home.latest.arousal', { value: (hints.arousal * 100).toFixed(0) })}
                    compact
                  />
                  <Badge
                    label={t('home.latest.pauses', { value: (hints.pauses_ratio * 100).toFixed(0) })}
                    compact
                  />
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetLabel}>{t('home.reset')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.footer}>
        <SectionHeader title={t('home.footer.title')} subtitle={t('home.footer.subtitle')} />
        <Text style={styles.flowStep}>{t('home.footer.step1')}</Text>
        <Text style={styles.flowStep}>{t('home.footer.step2')}</Text>
        <Text style={styles.flowStep}>{t('home.footer.step3')}</Text>
        <Text style={styles.flowStep}>{t('home.footer.step4')}</Text>
        {syncLoading && <ActivityIndicator color="#64748B" style={styles.syncIndicator} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1117',
    padding: 24,
    gap: 32
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 18, 25, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  overlayText: {
    color: '#E2E8F0',
    marginTop: 12
  },
  header: {
    gap: 6
  },
  title: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14
  },
  recordSection: {
    alignItems: 'center',
    gap: 16
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8
  },
  statusHint: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 14,
    maxWidth: 320
  },
  latestSection: {
    gap: 12
  },
  latestCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  latestPersona: {
    color: '#FBBF24',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  latestText: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22
  },
  latestBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  resetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1E3A8A'
  },
  resetLabel: {
    color: '#BFDBFE',
    fontWeight: '600'
  },
  footer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    gap: 8
  },
  flowStep: {
    color: '#CBD5F5',
    fontSize: 13,
    lineHeight: 20
  },
  syncIndicator: {
    marginTop: 12
  }
});

export default HomeScreen;
