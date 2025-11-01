import type { WordTime, EmotionHints } from '@innervoice/persona-core';
import { sanitizeBlocks, type Replacement, type SanitizeOptions } from './sanitize';

export type ExportEntry = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  persona?: string | null;
  counterPersona?: string | null;
  moodScore?: number | null;
  hints?: Pick<EmotionHints, 'arousal' | 'tempoClass' | 'pauses_ratio' | 'pausesClass'> | null;
};

export type ExportReply = { message: string; persona?: string | null } | string | null;

export type ExportMeta = {
  title?: string;
  locale?: string;
  tags?: string[];
  words?: WordTime[] | null;
  actions?: string[];
  appVersion?: string;
};

export type ExportOptions = SanitizeOptions & {
  includeTimeline?: boolean;
};

export type PreparedExport = {
  entry: ExportEntry;
  reply: { message: string; persona?: string | null } | null;
  meta: ExportMeta;
  options: ExportOptions;
  sanitizedEntry: string;
  sanitizedReply: string | null;
  replacements: Replacement[];
};

function normaliseReply(reply: ExportReply): { message: string; persona?: string | null } | null {
  if (!reply) return null;
  if (typeof reply === 'string') {
    return { message: reply };
  }
  if (typeof reply === 'object' && 'message' in reply) {
    return { message: reply.message, persona: reply.persona ?? null };
  }
  return null;
}

function withFallbackTitle(meta: ExportMeta, entry: ExportEntry): ExportMeta {
  if (meta.title && meta.title.trim().length > 0) {
    return meta;
  }
  const formatted = new Date(entry.createdAt || entry.updatedAt).toISOString().slice(0, 10);
  return { ...meta, title: `InnerVoice Dialog ${formatted}` };
}

export function prepareExport(
  entry: ExportEntry,
  reply: ExportReply,
  meta: ExportMeta = {},
  options: ExportOptions = {}
): PreparedExport {
  const normalisedMeta = withFallbackTitle(meta, entry);
  const replyObject = normaliseReply(reply);
  const blocks = [entry.text, replyObject?.message ?? ''];
  const { blocks: sanitizedBlocks, replacements } = sanitizeBlocks(blocks, options);
  const [sanitizedEntry, sanitizedReply] = sanitizedBlocks;
  return {
    entry,
    reply: replyObject,
    meta: normalisedMeta,
    options,
    sanitizedEntry,
    sanitizedReply: replyObject ? sanitizedReply : null,
    replacements
  };
}

export function formatDate(timestamp: number, locale = 'de-DE'): string {
  const safeTs = Number.isFinite(timestamp) ? timestamp : Date.now();
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(safeTs));
}

export function renderHintSummary(hints: ExportEntry['hints'] | null | undefined): string[] {
  if (!hints) return [];
  const lines: string[] = [];
  if (typeof hints.arousal === 'number') {
    lines.push(`Arousal: ${(hints.arousal * 100).toFixed(0)}%`);
  }
  if (typeof hints.pauses_ratio === 'number') {
    lines.push(`Pausenanteil: ${(hints.pauses_ratio * 100).toFixed(0)}%`);
  }
  if (hints.tempoClass) {
    lines.push(`Tempo: ${hints.tempoClass}`);
  }
  if (hints.pausesClass) {
    lines.push(`Pausen: ${hints.pausesClass}`);
  }
  return lines;
}
