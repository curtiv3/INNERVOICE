import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  HistoryEntryWithEmbedding,
  listHistoryEntriesWithEmbeddings,
  markEntryDeleted,
  setEntryFavorite
} from '../storage/entries';
import { useDatabaseReady } from '../hooks/useDatabaseReady';
import { hasContentKey } from '../crypto/deviceKeys';
import { SectionHeader } from '../components/SectionHeader';
import { EntryItem } from '../components/EntryItem';
import { embedText, cosineSimilarity } from '../services/embeddings';
import { showToast } from '../utils/notify';
import { useExportSettings } from '../hooks/useExportSettings';
import { exportDialog, type ExportFormat } from '../services/exporter';
import { useI18n } from '../i18n';

type HistoryResult = HistoryEntryWithEmbedding & { score?: number };

function sortDefault(entries: HistoryEntryWithEmbedding[]) {
  return [...entries].sort((a, b) => {
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }
    return b.updated_at - a.updated_at;
  });
}

export function HistoryScreen() {
  const ready = useDatabaseReady();
  const [allEntries, setAllEntries] = useState<HistoryEntryWithEmbedding[]>([]);
  const [visible, setVisible] = useState<HistoryResult[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { anonymizeByDefault } = useExportSettings(ready);
  const { t } = useI18n();

  const loadEntries = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const [items, keyPresent] = await Promise.all([listHistoryEntriesWithEmbeddings(), hasContentKey()]);
    const sorted = sortDefault(items);
    setAllEntries(sorted);
    setHasKey(keyPresent);
    if (query.trim()) {
      const vector = embedText(query.trim());
      const lowered = query.trim().toLowerCase();
      const scored = sorted
        .map(entry => {
          const vectorScore = entry.embedding ? cosineSimilarity(entry.embedding, vector) : 0;
          const fallback = entry.text.toLowerCase().includes(lowered) ? 0.45 : 0;
          const score = Math.min(1, Math.max(vectorScore, fallback));
          return { ...entry, score: score > 0 ? score : undefined };
        })
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setVisible(scored);
    } else {
      setVisible(sorted);
    }
    setLoading(false);
  }, [query, ready]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const runSearch = useCallback(
    (value: string, source: HistoryEntryWithEmbedding[] = allEntries) => {
      const trimmed = value.trim();
      setQuery(value);
      if (!trimmed) {
        setVisible(sortDefault(source));
        return;
      }
      const vector = embedText(trimmed);
      const lowered = trimmed.toLowerCase();
      const scored = source
        .map(entry => {
          const vectorScore = entry.embedding ? cosineSimilarity(entry.embedding, vector) : 0;
          const fallback = entry.text.toLowerCase().includes(lowered) ? 0.45 : 0;
          const score = Math.min(1, Math.max(vectorScore, fallback));
          return { ...entry, score: score > 0 ? score : undefined };
        })
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setVisible(scored);
    },
    [allEntries]
  );

  const presentExportOptions = useCallback(
    (entry: HistoryResult) => {
      const maskedMd = t('history.export.markdownMasked');
      const maskedPdf = t('history.export.pdfMasked');
      const openMd = t('history.export.markdownOpen');
      const openPdf = t('history.export.pdfOpen');
      const primaryMd = anonymizeByDefault ? maskedMd : openMd;
      const primaryPdf = anonymizeByDefault ? maskedPdf : openPdf;
      const alternateMd = anonymizeByDefault ? openMd : maskedMd;
      const alternatePdf = anonymizeByDefault ? openPdf : maskedPdf;
      const cancel = t('history.actions.cancel');
      const runExport = async (format: ExportFormat, anonymize: boolean) => {
        try {
          await exportDialog(entry.id, format, { anonymize });
        } catch (error) {
          Alert.alert(
            t('history.alerts.exportFailedTitle'),
            error instanceof Error ? error.message : t('history.alerts.exportFailedMessage')
          );
        }
      };
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: t('history.export.title'),
            options: [cancel, primaryMd, primaryPdf, alternateMd, alternatePdf],
            cancelButtonIndex: 0
          },
          buttonIndex => {
            if (buttonIndex === 1) runExport('markdown', anonymizeByDefault);
            if (buttonIndex === 2) runExport('pdf', anonymizeByDefault);
            if (buttonIndex === 3) runExport('markdown', !anonymizeByDefault);
            if (buttonIndex === 4) runExport('pdf', !anonymizeByDefault);
          }
        );
      } else {
        Alert.alert(t('history.export.title'), t('history.export.prompt'), [
          { text: primaryMd, onPress: () => runExport('markdown', anonymizeByDefault) },
          { text: primaryPdf, onPress: () => runExport('pdf', anonymizeByDefault) },
          { text: alternateMd, onPress: () => runExport('markdown', !anonymizeByDefault) },
          { text: alternatePdf, onPress: () => runExport('pdf', !anonymizeByDefault) },
          { text: cancel, style: 'cancel' }
        ]);
      }
    },
    [anonymizeByDefault, t]
  );

  const handleLongPress = useCallback(
    (entry: HistoryResult) => {
      const toggleFavorite = async () => {
        await setEntryFavorite(entry.id, !entry.favorite);
        showToast(entry.favorite ? t('history.toast.favoriteRemoved') : t('history.toast.favoriteAdded'));
        loadEntries();
      };
      const deleteEntry = async () => {
        await markEntryDeleted(entry.id);
        showToast(t('history.toast.deleted'));
        loadEntries();
      };
      const shareEntry = async () => {
        await Share.share({ message: entry.text });
      };
      const exportEntry = () => presentExportOptions(entry);
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [
              t('history.actions.cancel'),
              t('history.actions.export'),
              t('history.actions.share'),
              entry.favorite ? t('history.actions.unfavorite') : t('history.actions.favorite'),
              t('history.actions.delete')
            ],
            destructiveButtonIndex: 4,
            cancelButtonIndex: 0
          },
          buttonIndex => {
            if (buttonIndex === 1) exportEntry();
            if (buttonIndex === 2) shareEntry();
            if (buttonIndex === 3) toggleFavorite();
            if (buttonIndex === 4) deleteEntry();
          }
        );
      } else {
        Alert.alert(t('history.actions.title'), entry.text.slice(0, 64) || t('history.item.empty'), [
          { text: t('history.actions.export'), onPress: exportEntry },
          { text: t('history.actions.share'), onPress: shareEntry },
          { text: entry.favorite ? t('history.actions.unfavorite') : t('history.actions.favorite'), onPress: toggleFavorite },
          { text: t('history.actions.delete'), style: 'destructive', onPress: deleteEntry },
          { text: t('history.actions.cancel'), style: 'cancel' }
        ]);
      }
    },
    [loadEntries, presentExportOptions, t]
  );

  const content = useMemo(() => {
    return visible.map(entry => (
      <EntryItem
        key={entry.id}
        title={entry.text}
        timestamp={entry.updated_at}
        favorite={entry.favorite}
        pendingSync={entry.pendingSync}
        encrypted={hasKey && entry.hasHints}
        score={entry.score ?? null}
        onLongPress={() => handleLongPress(entry)}
      />
    ));
  }, [visible, hasKey, handleLongPress]);

  if (!ready || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6CC3F7" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <SectionHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        action={<Text style={styles.count}>{t('history.count', { count: visible.length })}</Text>}
      />
      <TextInput
        value={query}
        placeholder={t('history.searchPlaceholder')}
        placeholderTextColor="#64748B"
        style={styles.search}
        onChangeText={value => runSearch(value)}
      />
      <View style={styles.list}>{content}</View>
      {visible.length === 0 && <Text style={styles.empty}>{t('history.empty')}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0E1117'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1117'
  },
  count: {
    color: '#94A3B8',
    fontSize: 12
  },
  search: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#E2E8F0',
    marginBottom: 18,
    fontSize: 14
  },
  list: {
    flexDirection: 'column'
  },
  empty: {
    marginTop: 24,
    color: '#6B7280',
    textAlign: 'center'
  }
});

export default HistoryScreen;
