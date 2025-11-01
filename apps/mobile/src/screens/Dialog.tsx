import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioHints } from '../hooks/useAudioHints';
import type { WordTime } from '@innervoice/persona-core';
import { useDatabaseReady } from '../hooks/useDatabaseReady';
import { upsertEntry, updateEntryResponse } from '../storage/entries';
import { Badge } from '../components/Badge';
import { SectionHeader } from '../components/SectionHeader';
import { generatePersonaResponse, transformResponse, PersonaVoice } from '../services/respond';
import { showToast } from '../utils/notify';
import { useI18n } from '../i18n';

export type DialogScreenProps = {
  entryId?: string;
  fileUri?: string;
  transcription?: {
    text: string;
    words: WordTime[];
  };
  language?: 'de' | 'en';
  initialResponse?: string;
};

type Variant = 'base' | 'reframe' | 'next-step' | 'more-question';

function ActionButton({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, active && styles.actionButtonActive]}
    >
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DialogScreen({ entryId, fileUri, transcription, language: propLanguage = 'de', initialResponse }: DialogScreenProps) {
  const { t, language: contextLanguage } = useI18n();
  const activeLanguage = propLanguage ?? contextLanguage;
  const { compute, hints, persona, loading, error } = useAudioHints();
  const dbReady = useDatabaseReady();
  const [response, setResponse] = useState<string>(initialResponse ?? '');
  const [baseResponse, setBaseResponse] = useState<string | null>(initialResponse ?? null);
  const [voice, setVoice] = useState<PersonaVoice | null>(null);
  const [activeVariant, setActiveVariant] = useState<Variant>('base');

  useEffect(() => {
    if (initialResponse) {
      setResponse(initialResponse);
      setBaseResponse(initialResponse);
    }
  }, [initialResponse]);

  useEffect(() => {
    if (!dbReady || !entryId || !hints || !transcription) return;
    upsertEntry({
      id: entryId,
      text: transcription.text,
      activePersona: persona ?? null,
      audioUri: fileUri,
      words: transcription.words,
      response: response ? { message: response, variant: activeVariant, voice } : undefined,
      hints: {
        arousal: hints.arousal,
        tempoClass: hints.tempoClass,
        pauses_ratio: hints.pauses_ratio,
        pausesClass: hints.pausesClass
      }
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('Failed to persist entry hints', err);
    });
  }, [activeVariant, dbReady, entryId, fileUri, hints, persona, response, transcription, voice]);

  useEffect(() => {
    if (!dbReady || !fileUri || !transcription?.words?.length || !entryId) return;
    compute({
      fileUri,
      words: transcription.words,
      text: transcription.text,
      lang: activeLanguage,
      classifyOptions: { language: activeLanguage, useTempoHints: true }
    })
      .then(result => {
        const label = result?.persona?.label ?? persona ?? null;
        const generated = generatePersonaResponse(label, result?.hints ?? hints ?? null, transcription.text);
        setBaseResponse(generated.message);
        setResponse(generated.message);
        setVoice(generated.voice);
        setActiveVariant('base');
        updateEntryResponse(entryId, { message: generated.message, variant: 'base', voice: generated.voice }, label).catch(err => {
          console.warn('Failed to persist response', err);
        });
      })
      .catch(() => {
        // handled by hook state
      });
  }, [activeLanguage, compute, dbReady, entryId, fileUri, hints, persona, transcription]);

  const handleVariant = (variant: Exclude<Variant, 'base'>) => {
    if (!entryId) return;
    if (!baseResponse && !response) return;
    const target = activeVariant === variant ? 'base' : variant;
    const base = baseResponse ?? response;
    const nextMessage = target === 'base' ? base : transformResponse(base, variant);
    setActiveVariant(target);
    setResponse(nextMessage);
    updateEntryResponse(entryId, { message: nextMessage, variant: target, voice }, persona ?? null).catch(err => {
      console.warn('Failed to persist response variant', err);
    });
    showToast(target === 'base' ? t('dialog.toast.restored') : t('dialog.toast.updated'));
  };

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#6CC3F7" />
      </View>
    );
  }

  const badges = useMemo(() => {
    if (!hints) return [] as string[];
    const tempoBadge = t(`dialog.badges.tempo.${hints.tempoClass}`);
    const pauseBadge = t(`dialog.badges.pauses.${hints.pausesClass}`);
    const arousalBadge = t('dialog.badges.arousal', { value: (hints.arousal * 100).toFixed(0) });
    return [tempoBadge, pauseBadge, arousalBadge];
  }, [hints, t]);

  const personaLabel = persona ?? t('dialog.personaFallback');

  const hintList = useMemo(() => {
    if (!hints) return [] as string[];
    const tempoBadge = t(`dialog.badges.tempo.${hints.tempoClass}`);
    const tempoValue = tempoBadge.includes(':') ? tempoBadge.split(':').slice(1).join(':').trim() : tempoBadge;
    return [
      t('dialog.hints.tempo', { value: tempoValue }),
      t('dialog.hints.pauses', { value: (hints.pauses_ratio * 100).toFixed(1) }),
      t('dialog.hints.stability', { value: (hints.stability * 100).toFixed(0) }),
      t('dialog.hints.valence', { value: hints.valence_est })
    ];
  }, [hints, t]);

  if (!entryId || !fileUri || !transcription) {
    return (
      <ScrollView contentContainerStyle={styles.placeholderContainer}>
        <SectionHeader title={t('dialog.title')} subtitle={t('dialog.subtitle')} />
        <Text style={styles.placeholder}>{t('dialog.placeholder')}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionHeader title={t('dialog.title')} subtitle={t('dialog.subtitle')} />
      <View style={styles.badgeRow}>
        {persona && <Badge label={persona} tone="accent" />}
        {badges.map(badge => (
          <Badge key={badge} label={badge} />
        ))}
      </View>
      <View style={styles.chatArea}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.bubbleLabel}>{t('dialog.bubble.you')}</Text>
          <Text style={styles.bubbleText}>{transcription.text}</Text>
        </View>
        <View style={[styles.bubble, styles.personaBubble]}>
          <Text style={styles.bubbleLabel}>{personaLabel}</Text>
          {loading && <ActivityIndicator color="#6CC3F7" style={styles.inlineLoader} />}
          {error && <Text style={styles.error}>{error}</Text>}
          {!loading && !error && (
            <Text style={styles.bubbleText}>{response || t('dialog.bubble.pending')}</Text>
          )}
          {voice && (
            <Text style={styles.voiceMeta}>{voice.tone}</Text>
          )}
        </View>
      </View>
      <SectionHeader title={t('dialog.actions.title')} subtitle={t('dialog.actions.subtitle')} />
      <View style={styles.actions}>
        <ActionButton label={t('dialog.actions.reframe')} active={activeVariant === 'reframe'} onPress={() => handleVariant('reframe')} />
        <ActionButton
          label={t('dialog.actions.nextStep')}
          active={activeVariant === 'next-step'}
          onPress={() => handleVariant('next-step')}
        />
        <ActionButton
          label={t('dialog.actions.moreQuestion')}
          active={activeVariant === 'more-question'}
          onPress={() => handleVariant('more-question')}
        />
      </View>
      <SectionHeader title={t('dialog.hints.title')} subtitle={t('dialog.hints.subtitle')} />
      <View style={styles.hintList}>
        {hintList.map(item => (
          <Text key={item} style={styles.hint}>
            {item}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0E1117',
    gap: 24
  },
  placeholderContainer: {
    padding: 24,
    backgroundColor: '#0E1117',
    flexGrow: 1,
    justifyContent: 'center',
    gap: 24
  },
  placeholder: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1117'
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  chatArea: {
    gap: 16,
    marginBottom: 24
  },
  bubble: {
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  userBubble: {
    backgroundColor: '#111827',
    alignSelf: 'flex-end'
  },
  personaBubble: {
    backgroundColor: '#1F2937',
    alignSelf: 'flex-start'
  },
  bubbleLabel: {
    color: '#94A3B8',
    fontSize: 12,
    letterSpacing: 0.4
  },
  bubbleText: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22
  },
  voiceMeta: {
    color: '#F59E0B',
    fontSize: 12
  },
  error: {
    color: '#F87171',
    marginVertical: 4
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#111827',
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  actionButtonActive: {
    backgroundColor: '#1E3A8A'
  },
  actionLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500'
  },
  actionLabelActive: {
    color: '#BFDBFE'
  },
  hintList: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    gap: 6
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4
  },
  inlineLoader: {
    marginTop: 8
  }
});

export default DialogScreen;
