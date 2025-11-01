import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { ModelStatus, ModelVerification } from '@innervoice/core-models';
import { useSyncSettings } from '../hooks/useSyncSettings';
import { useExportSettings } from '../hooks/useExportSettings';
import { syncNow, getPreparedBlobCount } from '../sync/service';
import { useDatabaseReady } from '../hooks/useDatabaseReady';
import { SectionHeader } from '../components/SectionHeader';
import { Badge } from '../components/Badge';
import {
  listModelStatuses,
  installModel as installModelService,
  removeModel as removeModelService,
  verifyModel as verifyModelService,
  DEFAULT_EMBEDDING_MODEL_ID,
  DEFAULT_WHISPER_MODEL_ID
} from '../services/models';
import { useI18n, type Language } from '../i18n';

function formatSize(bytes: number, fallbackMb: number, t: (key: string, values?: Record<string, string | number>) => string) {
  if (!bytes) {
    return t('settings.models.size.expected', { value: fallbackMb });
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return t('settings.models.size.gb', { value: (mb / 1024).toFixed(1) });
  }
  return t('settings.models.size.mb', { value: mb.toFixed(1) });
}

function describeVerification(
  result: ModelVerification | undefined,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  if (!result) return null;
  if (!result.valid) {
    if (result.reason === 'missing') return t('settings.models.verification.missing');
    if (result.reason === 'hash-mismatch') return t('settings.models.verification.hashMismatch');
  }
  if (result.reason === 'no-checksum') return t('settings.models.verification.noChecksum');
  if (result.reason === 'no-hash-support') return t('settings.models.verification.noHashSupport');
  return t('settings.models.verification.ok');
}

function buildWarningText(
  model: ModelStatus,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const hints = [t('settings.models.warning.manual')];
  if (model.type === 'whisper') {
    hints.push(t('settings.models.warning.whisperSource'));
  } else {
    hints.push(t('settings.models.warning.embeddingSource'));
  }
  if (Platform.OS === 'ios') {
    hints.push(t('settings.models.warning.ios'));
  } else if (Platform.OS === 'android') {
    hints.push(t('settings.models.warning.android'));
  }
  return hints.join('\n');
}

function groupByType(models: ModelStatus[]) {
  return {
    whisper: models.filter(model => model.type === 'whisper'),
    embedding: models.filter(model => model.type === 'embedding')
  };
}

export function SettingsScreen() {
  const ready = useDatabaseReady();
  const { enabled, loading, setEnabled } = useSyncSettings(ready);
  const { anonymizeByDefault, loading: exportLoading, setAnonymizeByDefault } = useExportSettings(ready);
  const { t, language, setLanguage } = useI18n();

  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [operation, setOperation] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [verifications, setVerifications] = useState<Record<string, ModelVerification | undefined>>({});
  const [totalUsage, setTotalUsage] = useState(0);
  const [languageUpdating, setLanguageUpdating] = useState(false);

  const refreshModels = useCallback(async () => {
    setModelLoading(true);
    try {
      const statuses = await listModelStatuses();
      setModelStatuses(statuses);
      setTotalUsage(statuses.reduce((sum, status) => sum + status.sizeOnDisk, 0));
    } catch (error) {
      console.error('Modelle konnten nicht geladen werden', error);
    } finally {
      setModelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) {
      void refreshModels();
    }
  }, [ready, refreshModels]);

  const handleSync = useCallback(async () => {
    try {
      const report = await syncNow();
      const blobs = getPreparedBlobCount();
      Alert.alert(
        t('settings.sync.prepared'),
        t('settings.sync.preparedMessage', { count: report.pushed, local: blobs })
      );
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('errors.unknown'));
    }
  }, [t]);

  const handleToggle = useCallback(
    (next: boolean) => {
      setEnabled(next).catch(error => {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('settings.sync.keyError'));
      });
    },
    [setEnabled, t]
  );

  const handleAnonymizeToggle = useCallback(
    (next: boolean) => {
      setAnonymizeByDefault(next).catch(error => {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('settings.export.error'));
      });
    },
    [setAnonymizeByDefault, t]
  );

  const handleInstall = useCallback(
    (model: ModelStatus) => {
      Alert.alert(t('settings.models.alerts.installTitle'), buildWarningText(model, t), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: () => {
            void (async () => {
              setOperation(model.id);
              setProgress(prev => ({ ...prev, [model.id]: 0 }));
              try {
                await installModelService(model.id, {
                  onProgress: value => {
                    setProgress(prev => ({ ...prev, [model.id]: value }));
                  }
                });
                setVerifications(prev => ({ ...prev, [model.id]: undefined }));
                await refreshModels();
                Alert.alert(t('common.success'), t('settings.models.alerts.success', { name: model.name }));
              } catch (error) {
                Alert.alert(
                  t('common.error'),
                  error instanceof Error ? error.message : t('settings.models.alerts.installError')
                );
              } finally {
                setOperation(null);
                setProgress(prev => ({ ...prev, [model.id]: 0 }));
              }
            })();
          }
        }
      ]);
    },
    [refreshModels, t]
  );

  const handleRemove = useCallback(
    (model: ModelStatus) => {
      Alert.alert(t('settings.models.alerts.removeTitle'), t('settings.models.alerts.removeMessage', { name: model.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setOperation(model.id);
              try {
                await removeModelService(model.id);
                setVerifications(prev => ({ ...prev, [model.id]: undefined }));
                await refreshModels();
              } catch (error) {
                Alert.alert(
                  t('common.error'),
                  error instanceof Error ? error.message : t('settings.models.alerts.removeError')
                );
              } finally {
                setOperation(null);
              }
            })();
          }
        }
      ]);
    },
    [refreshModels, t]
  );

  const handleVerify = useCallback(async (model: ModelStatus) => {
    setOperation(model.id);
    try {
      const result = await verifyModelService(model.id);
      setVerifications(prev => ({ ...prev, [model.id]: result }));
      const summary = describeVerification(result, t);
      const message = summary ?? (result.valid ? t('settings.models.alerts.verifyOk') : t('settings.models.alerts.verifyFailed'));
      Alert.alert(result.valid ? t('common.success') : t('common.warning'), message);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('settings.models.alerts.verifyError'));
    } finally {
      setOperation(null);
    }
  }, [t]);

  const handleLanguageChange = useCallback(
    async (next: Language) => {
      if (next === language) return;
      setLanguageUpdating(true);
      try {
        await setLanguage(next);
      } catch (error) {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('errors.unknown'));
      } finally {
        setLanguageUpdating(false);
      }
    },
    [language, setLanguage, t]
  );

  const groupedModels = useMemo(() => groupByType(modelStatuses), [modelStatuses]);

  const isBusy = !ready || loading || exportLoading || modelLoading;

  if (isBusy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6CC3F7" />
      </View>
    );
  }

  const whisperModels = groupedModels.whisper;
  const embeddingModels = groupedModels.embedding;
  const usageText = totalUsage ? formatSize(totalUsage, 0, t) : t('settings.models.none');

  return (
    <View style={styles.container}>
      <SectionHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.label}>{t('settings.sync.title')}</Text>
          <Switch value={enabled} onValueChange={handleToggle} />
        </View>
        <Text style={styles.description}>{t('settings.sync.description')}</Text>
        <TouchableOpacity style={[styles.primaryButton, !enabled && styles.primaryButtonDisabled]} onPress={handleSync} disabled={!enabled}>
          <Text style={styles.primaryButtonLabel}>{t('settings.sync.button')}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{t('settings.sync.hint')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.label}>{t('settings.export.title')}</Text>
          <Switch value={anonymizeByDefault} onValueChange={handleAnonymizeToggle} />
        </View>
        <Text style={styles.description}>{t('settings.export.description')}</Text>
        <Text style={styles.hint}>{t('settings.export.hint')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.label}>{t('settings.language.title')}</Text>
        </View>
        <Text style={styles.description}>{t('settings.language.description')}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'de' && styles.languageButtonActive]}
            onPress={() => handleLanguageChange('de')}
            disabled={languageUpdating}
          >
            <Text
              style={[styles.languageButtonLabel, language === 'de' && styles.languageButtonLabelActive]}
            >
              {t('settings.language.german')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => handleLanguageChange('en')}
            disabled={languageUpdating}
          >
            <Text
              style={[styles.languageButtonLabel, language === 'en' && styles.languageButtonLabelActive]}
            >
              {t('settings.language.english')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionHeader title={t('settings.models.title')} subtitle={t('settings.models.subtitle')} />
      <Text style={styles.footnote}>{t('settings.models.usage', { value: usageText })}</Text>

      <ModelList
        title="Whisper.cpp"
        models={whisperModels}
        operation={operation}
        progress={progress}
        verifications={verifications}
        onInstall={handleInstall}
        onRemove={handleRemove}
        onVerify={handleVerify}
      />

      <ModelList
        title="Embeddings"
        models={embeddingModels}
        operation={operation}
        progress={progress}
        verifications={verifications}
        onInstall={handleInstall}
        onRemove={handleRemove}
        onVerify={handleVerify}
      />

      <Text style={styles.footnote}>{t('settings.models.footer')}</Text>
    </View>
  );
}

type ModelListProps = {
  title: string;
  models: ModelStatus[];
  operation: string | null;
  progress: Record<string, number>;
  verifications: Record<string, ModelVerification | undefined>;
  onInstall(model: ModelStatus): void;
  onRemove(model: ModelStatus): void;
  onVerify(model: ModelStatus): void;
};

function ModelList({ title, models, operation, progress, verifications, onInstall, onRemove, onVerify }: ModelListProps) {
  const { t } = useI18n();
  if (models.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.listTitle}>{title}</Text>
      {models.map(model => {
        const busy = operation === model.id;
        const verification = verifications[model.id];
        const verificationLabel = describeVerification(verification, t);
        const progressValue = progress[model.id] ?? 0;
        const installed = model.installed;
        const defaultBadge =
          model.id === DEFAULT_WHISPER_MODEL_ID || model.id === DEFAULT_EMBEDDING_MODEL_ID ? (
            <Badge label={t('settings.models.status.default')} tone="accent" compact />
          ) : null;

        return (
          <View key={model.id} style={styles.modelCard}>
            <View style={styles.modelHeader}>
              <Text style={styles.modelTitle}>{model.name}</Text>
              <View style={styles.modelBadges}>
                <Badge
                  label={installed ? t('settings.models.status.installed') : t('settings.models.status.missing')}
                  tone={installed ? 'success' : 'alert'}
                  compact
                />
                {defaultBadge}
              </View>
            </View>
            <Text style={styles.modelHint}>{formatSize(model.sizeOnDisk, model.expectedSizeMB, t)}</Text>
            <Text style={styles.modelPath}>{model.path}</Text>
            {verificationLabel ? <Text style={styles.verification}>{verificationLabel}</Text> : null}
            {progressValue > 0 && progressValue < 1 ? (
              <Text style={styles.progress}>{t('settings.models.progress', { value: (progressValue * 100).toFixed(0) })}</Text>
            ) : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, busy && styles.disabledButton]}
                disabled={busy}
                onPress={() => onInstall(model)}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {installed ? t('settings.models.actions.reload') : t('settings.models.actions.install')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, (!installed || busy) && styles.disabledButton]}
                disabled={!installed || busy}
                onPress={() => onVerify(model)}
              >
                <Text style={styles.secondaryButtonLabel}>{t('settings.models.actions.verify')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, (!installed || busy) && styles.disabledButton]}
                disabled={!installed || busy}
                onPress={() => onRemove(model)}
              >
                <Text style={styles.secondaryButtonLabel}>{t('settings.models.actions.remove')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#0E1117',
    gap: 24
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1117'
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    gap: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '500'
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4
  },
  primaryButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonDisabled: {
    backgroundColor: '#1E293B'
  },
  primaryButtonLabel: {
    color: '#BFDBFE',
    fontWeight: '600'
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 12
  },
  footnote: {
    color: '#64748B',
    fontSize: 12
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12
  },
  languageButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1F2937'
  },
  languageButtonActive: {
    backgroundColor: '#1E3A8A'
  },
  languageButtonLabel: {
    color: '#E5E7EB',
    fontWeight: '500'
  },
  languageButtonLabelActive: {
    color: '#BFDBFE'
  },
  listTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600'
  },
  modelCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    gap: 10
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modelTitle: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '600'
  },
  modelBadges: {
    flexDirection: 'row',
    gap: 8
  },
  modelHint: {
    color: '#CBD5F5',
    fontSize: 12
  },
  modelPath: {
    color: '#64748B',
    fontSize: 11
  },
  verification: {
    color: '#C4B5FD',
    fontSize: 11
  },
  progress: {
    color: '#FCD34D',
    fontSize: 11
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1F2937'
  },
  disabledButton: {
    opacity: 0.5
  },
  secondaryButtonLabel: {
    color: '#E5E7EB',
    fontWeight: '500'
  }
});

export default SettingsScreen;
