import type { Replacement } from './sanitize';
import {
  prepareExport,
  type PreparedExport,
  type ExportEntry,
  type ExportReply,
  type ExportMeta,
  type ExportOptions,
  formatDate,
  renderHintSummary
} from './common';

type MarkdownResult = {
  content: string;
  replacements: Replacement[];
};

function isPreparedExport(value: unknown): value is PreparedExport {
  return !!value && typeof value === 'object' && 'sanitizedEntry' in value && 'entry' in value;
}

function renderMetadata(doc: PreparedExport): string[] {
  const lines: string[] = [];
  lines.push(`# ${doc.meta.title}`);
  lines.push('');
  lines.push(`- Erstellt: ${formatDate(doc.entry.createdAt, doc.meta.locale)}`);
  lines.push(`- Aktualisiert: ${formatDate(doc.entry.updatedAt ?? doc.entry.createdAt, doc.meta.locale)}`);
  if (doc.entry.persona) {
    lines.push(`- Persona (aktiv): ${doc.entry.persona}`);
  }
  if (doc.entry.counterPersona) {
    lines.push(`- Persona (Antwort): ${doc.entry.counterPersona}`);
  } else if (doc.reply?.persona) {
    lines.push(`- Persona (Antwort): ${doc.reply.persona}`);
  }
  if (typeof doc.entry.moodScore === 'number') {
    lines.push(`- Stimmungsscore: ${doc.entry.moodScore}`);
  }
  const hints = renderHintSummary(doc.entry.hints);
  if (hints.length > 0) {
    hints.forEach(hint => lines.push(`- ${hint}`));
  }
  if (doc.meta.tags && doc.meta.tags.length > 0) {
    lines.push(`- Tags: ${doc.meta.tags.join(', ')}`);
  }
  if (doc.meta.appVersion) {
    lines.push(`- App-Version: ${doc.meta.appVersion}`);
  }
  if (doc.options.anonymize) {
    lines.push(`- Anonymisierung: ${doc.replacements.length} Ersetzungen`);
  }
  lines.push('');
  lines.push('---');
  return lines;
}

function renderTimeline(doc: PreparedExport): string[] {
  if (!doc.options.includeTimeline || !doc.meta.words || doc.meta.words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  lines.push('');
  lines.push('### Zeitmarken');
  lines.push('| Zeit (s) | Wort |');
  lines.push('| --- | --- |');
  doc.meta.words.forEach(word => {
    const start = word.start?.toFixed(2) ?? '0.00';
    lines.push(`| ${start} | ${word.text} |`);
  });
  return lines;
}

function renderReplacements(doc: PreparedExport): string[] {
  if (!doc.options.anonymize || doc.replacements.length === 0) {
    return [];
  }
  const lines: string[] = [];
  lines.push('');
  lines.push('### Ersetzte Begriffe');
  doc.replacements.forEach(replacement => {
    lines.push(`- ${replacement.original} → ${replacement.masked}`);
  });
  return lines;
}

export function toMarkdown(doc: PreparedExport): MarkdownResult;
export function toMarkdown(
  entry: ExportEntry,
  reply: ExportReply,
  meta?: ExportMeta,
  options?: ExportOptions
): MarkdownResult;
export function toMarkdown(
  arg1: PreparedExport | ExportEntry,
  reply?: ExportReply,
  meta?: ExportMeta,
  options?: ExportOptions
): MarkdownResult {
  const doc = isPreparedExport(arg1) ? arg1 : prepareExport(arg1, reply ?? null, meta, options);
  const lines: string[] = [];
  lines.push(...renderMetadata(doc));
  lines.push('');
  lines.push('## Du');
  lines.push('');
  lines.push(doc.sanitizedEntry || '_Leer_');
  if (doc.sanitizedReply) {
    lines.push('');
    lines.push('## InnerVoice');
    lines.push('');
    lines.push(doc.sanitizedReply);
  }
  lines.push(...renderTimeline(doc));
  lines.push(...renderReplacements(doc));
  lines.push('');
  lines.push(`Exportiert am ${formatDate(Date.now(), doc.meta.locale)} • Offline gespeichert`);
  return { content: lines.join('\n'), replacements: doc.replacements };
}
