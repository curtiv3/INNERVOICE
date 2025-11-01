export type Replacement = {
  original: string;
  masked: string;
};

export type SanitizeOptions = {
  anonymize?: boolean;
};

type ReplacementType = 'person' | 'email' | 'phone';

const STOP_WORDS = new Set([
  'Ich',
  'Du',
  'Und',
  'Der',
  'Die',
  'Das',
  'Ein',
  'Eine',
  'Einer',
  'Einem',
  'Eines',
  'Er',
  'Sie',
  'Es',
  'Wir',
  'Ihr',
  'Sie',
  'Den',
  'Dem',
  'Im',
  'Am',
  'Zum',
  'Zur',
  'Von',
  'Mit',
  'Aus',
  'Bei',
  'Für',
  'Doch',
  'Aber',
  'Oder',
  'Wie',
  'Was',
  'Warum',
  'Wenn',
  'Dann',
  'Auch',
  'So',
  'Dass'
]);

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phoneRegex = /\b\+?\d[\d\s\-]{6,}\d\b/g;
const nameRegex = /\b\p{Lu}\p{Ll}{2,}\b/gu;

function buildMask(type: ReplacementType, index: number): string {
  switch (type) {
    case 'email':
      return `[E-Mail ${index}]`;
    case 'phone':
      return `[Telefon ${index}]`;
    default:
      return `[Person ${index}]`;
  }
}

function shouldMaskName(word: string): boolean {
  if (!word) return false;
  if (STOP_WORDS.has(word)) return false;
  if (/^[0-9]+$/.test(word)) return false;
  return true;
}

export function sanitizeBlocks(
  blocks: string[],
  options: SanitizeOptions = {}
): { blocks: string[]; replacements: Replacement[] } {
  if (!options.anonymize) {
    return { blocks: [...blocks], replacements: [] };
  }
  const replacementMap = new Map<string, { masked: string; type: ReplacementType }>();
  const counters: Record<ReplacementType, number> = {
    person: 0,
    email: 0,
    phone: 0
  };

  const applyReplacement = (value: string, type: ReplacementType): string => {
    if (replacementMap.has(value)) {
      return replacementMap.get(value)!.masked;
    }
    counters[type] += 1;
    const masked = buildMask(type, counters[type]);
    replacementMap.set(value, { masked, type });
    return masked;
  };

  const sanitizeValue = (value: string): string => {
    if (!value) return value;
    let sanitized = value.replace(emailRegex, match => applyReplacement(match, 'email'));
    sanitized = sanitized.replace(phoneRegex, match => applyReplacement(match, 'phone'));
    sanitized = sanitized.replace(nameRegex, match => {
      return shouldMaskName(match) ? applyReplacement(match, 'person') : match;
    });
    return sanitized;
  };

  const sanitizedBlocks = blocks.map(block => sanitizeValue(block ?? ''));
  const replacements: Replacement[] = Array.from(replacementMap.entries()).map(([original, { masked }]) => ({
    original,
    masked
  }));
  return { blocks: sanitizedBlocks, replacements };
}

export function sanitizeText(text: string, options: SanitizeOptions = {}): { text: string; replacements: Replacement[] } {
  const { blocks, replacements } = sanitizeBlocks([text], options);
  return { text: blocks[0] ?? '', replacements };
}
