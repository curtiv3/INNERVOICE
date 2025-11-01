import { toMarkdown, toPdf, type ExportOptions, type ExportMeta, type ExportReply, type ExportEntry } from '@innervoice/core-export';
import type { WordTime, EmotionHints } from '@innervoice/persona-core';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import { loadEntry, type EntryRecord } from '../storage/entries';
import { showToast } from '../utils/notify';
import { getCurrentLanguage, translate } from '../i18n';

export type ExportFormat = 'markdown' | 'pdf';

export type ExportDialogOptions = {
  anonymize?: boolean;
  includeTimeline?: boolean;
};

export type ExportDialogResult = {
  fileUri: string;
  format: ExportFormat;
  replacements: { original: string; masked: string }[];
};

function parseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON for export', error);
    return null;
  }
}

function buildExportEntry(record: EntryRecord): ExportEntry {
  const hints = parseJSON<Pick<EmotionHints, 'arousal' | 'tempoClass' | 'pauses_ratio' | 'pausesClass'>>(record.hints_json ?? null);
  return {
    id: record.id,
    text: record.text || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    persona: record.active_persona,
    counterPersona: record.counter_persona,
    moodScore: record.mood_score ?? null,
    hints: hints ?? null
  };
}

function buildMeta(record: EntryRecord): ExportMeta {
  const language = getCurrentLanguage();
  const words = parseJSON<WordTime[]>(record.words_json ?? null) ?? undefined;
  return {
    locale: language === 'de' ? 'de-DE' : 'en-US',
    words,
    title: undefined
  };
}

function buildReply(record: EntryRecord): ExportReply {
  const response = parseJSON<{ message?: string; persona?: string }>(record.response_json ?? null);
  if (!response?.message) return null;
  return {
    message: response.message,
    persona: response.persona ?? record.counter_persona ?? record.active_persona ?? undefined
  };
}

async function ensureExportDirectory(): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error(translate('exporter.directoryMissing'));
  }
  const directory = `${base}InnerVoice/exports`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
  return directory;
}

function buildFileName(entry: ExportEntry, format: ExportFormat): string {
  const reference = new Date(entry.updatedAt || entry.createdAt);
  const date = reference.toISOString().slice(0, 10);
  const suffix = entry.id.split('_').pop() ?? entry.id;
  const shortId = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'entry';
  const ext = format === 'markdown' ? 'md' : 'pdf';
  return `${date}-${shortId}.${ext}`;
}

export async function exportDialog(entryId: string, format: ExportFormat, options: ExportDialogOptions = {}): Promise<ExportDialogResult> {
  const record = await loadEntry(entryId);
  if (!record) {
    throw new Error(translate('exporter.entryMissing'));
  }
  const entry = buildExportEntry(record);
  const meta = buildMeta(record);
  const reply = buildReply(record);
  const includeTimeline = options.includeTimeline ?? true;
  const exportOptions: ExportOptions = {
    anonymize: options.anonymize ?? true,
    includeTimeline
  };

  const language = getCurrentLanguage();
  const directory = await ensureExportDirectory();
  const fileName = buildFileName(entry, format);
  const fileUri = `${directory}/${fileName}`;

  if (format === 'markdown') {
    const { content, replacements } = toMarkdown(entry, reply, meta, exportOptions);
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Share.share({
      url: fileUri,
      message: translate('exporter.shareMessage', { file: fileName }, language)
    });
    showToast(translate('exporter.saved', { file: fileName }, language));
    return { fileUri, format, replacements };
  }

  const { base64, replacements } = await toPdf(entry, reply, meta, exportOptions);
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Share.share({
    url: fileUri,
    message: translate('exporter.shareMessage', { file: fileName }, language)
  });
  showToast(translate('exporter.saved', { file: fileName }, language));
  return { fileUri, format, replacements };
}
