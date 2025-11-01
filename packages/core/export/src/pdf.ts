import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
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

type PdfResult = {
  base64: string;
  replacements: Replacement[];
};

function isPreparedExport(value: unknown): value is PreparedExport {
  return !!value && typeof value === 'object' && 'sanitizedEntry' in value && 'entry' in value;
}

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 portrait in points
const MARGIN = 48;

function wrapLines(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  paragraphs.forEach(paragraph => {
    const words = paragraph.split(/\s+/);
    let current = '';
    words.forEach(word => {
      if (!word) return;
      const tentative = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, size);
      if (width <= maxWidth) {
        current = tentative;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    });
    if (current) {
      lines.push(current);
    }
    if (paragraph.trim().length === 0) {
      lines.push('');
    }
  });
  if (lines.length === 0) {
    lines.push('');
  }
  return lines;
}

export async function toPdf(doc: PreparedExport): Promise<PdfResult>;
export async function toPdf(
  entry: ExportEntry,
  reply: ExportReply,
  meta?: ExportMeta,
  options?: ExportOptions
): Promise<PdfResult>;
export async function toPdf(
  arg1: PreparedExport | ExportEntry,
  reply?: ExportReply,
  meta?: ExportMeta,
  options?: ExportOptions
): Promise<PdfResult> {
  const doc = isPreparedExport(arg1) ? arg1 : prepareExport(arg1, reply ?? null, meta, options);
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const addPage = () => pdfDoc.addPage(PAGE_SIZE);
  let page = addPage();
  let y = page.getHeight() - MARGIN;
  const maxWidth = page.getWidth() - MARGIN * 2;

  const ensureSpace = (linesCount: number, lineHeight: number) => {
    if (y - linesCount * lineHeight < MARGIN) {
      page = addPage();
      y = page.getHeight() - MARGIN;
    }
  };

  const drawLines = (textLines: string[], font: PDFFont, size: number, lineHeight: number) => {
    textLines.forEach(line => {
      if (y < MARGIN) {
        page = addPage();
        y = page.getHeight() - MARGIN;
      }
      if (line === '') {
        y -= lineHeight;
        return;
      }
      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font
      });
      y -= lineHeight;
    });
  };

  const titleLines = wrapLines(doc.meta.title ?? 'InnerVoice Dialog', maxWidth, boldFont, 18);
  ensureSpace(titleLines.length, 24);
  drawLines(titleLines, boldFont, 18, 24);
  y -= 8;

  const metaLines: string[] = [];
  metaLines.push(`Erstellt: ${formatDate(doc.entry.createdAt, doc.meta.locale)}`);
  metaLines.push(`Aktualisiert: ${formatDate(doc.entry.updatedAt ?? doc.entry.createdAt, doc.meta.locale)}`);
  if (doc.entry.persona) {
    metaLines.push(`Persona (aktiv): ${doc.entry.persona}`);
  }
  if (doc.entry.counterPersona) {
    metaLines.push(`Persona (Antwort): ${doc.entry.counterPersona}`);
  } else if (doc.reply?.persona) {
    metaLines.push(`Persona (Antwort): ${doc.reply.persona}`);
  }
  if (typeof doc.entry.moodScore === 'number') {
    metaLines.push(`Stimmungsscore: ${doc.entry.moodScore}`);
  }
  const hints = renderHintSummary(doc.entry.hints);
  hints.forEach(hint => metaLines.push(hint));
  if (doc.meta.tags && doc.meta.tags.length > 0) {
    metaLines.push(`Tags: ${doc.meta.tags.join(', ')}`);
  }
  if (doc.meta.appVersion) {
    metaLines.push(`App-Version: ${doc.meta.appVersion}`);
  }
  if (doc.options.anonymize) {
    metaLines.push(`Anonymisierung: ${doc.replacements.length} Ersetzungen`);
  }
  const wrappedMeta = metaLines.flatMap(line => wrapLines(line, maxWidth, regularFont, 12));
  ensureSpace(wrappedMeta.length, 16);
  drawLines(wrappedMeta, regularFont, 12, 16);
  y -= 12;

  drawLines(['Du'], boldFont, 14, 20);
  const entryLines = wrapLines(doc.sanitizedEntry || '_Leer_', maxWidth, regularFont, 12);
  drawLines(entryLines, regularFont, 12, 16);
  y -= 8;

  if (doc.sanitizedReply) {
    drawLines(['InnerVoice'], boldFont, 14, 20);
    const replyLines = wrapLines(doc.sanitizedReply, maxWidth, regularFont, 12);
    drawLines(replyLines, regularFont, 12, 16);
    y -= 8;
  }

  if (doc.options.includeTimeline && doc.meta.words && doc.meta.words.length > 0) {
    drawLines(['Zeitmarken'], boldFont, 13, 18);
    const timelineLines = doc.meta.words.map(word => {
      const start = word.start?.toFixed(2) ?? '0.00';
      return `${start}s – ${word.text}`;
    });
    const wrappedTimeline = timelineLines.flatMap(line => wrapLines(line, maxWidth, regularFont, 11));
    drawLines(wrappedTimeline, regularFont, 11, 14);
    y -= 8;
  }

  if (doc.options.anonymize && doc.replacements.length > 0) {
    drawLines(['Ersetzte Begriffe'], boldFont, 13, 18);
    const replacementLines = doc.replacements.map(rep => `${rep.original} → ${rep.masked}`);
    const wrappedReplacements = replacementLines.flatMap(line => wrapLines(line, maxWidth, regularFont, 11));
    drawLines(wrappedReplacements, regularFont, 11, 14);
    y -= 8;
  }

  const footer = `Exportiert am ${formatDate(Date.now(), doc.meta.locale)} • Offline gespeichert`;
  const footerLines = wrapLines(footer, maxWidth, regularFont, 11);
  ensureSpace(footerLines.length, 14);
  drawLines(footerLines, regularFont, 11, 14);

  const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  return { base64, replacements: doc.replacements };
}
