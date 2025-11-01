import { EmotionHints } from '../types/hints';
import { PersonaLabel } from './classify';

export type PersonaVoice = {
  tone: string;
  encouragement: string;
  prompt: string;
};

const PERSONA_LABELS: Record<PersonaLabel, PersonaVoice> = {
  EMOTIONAL: {
    tone: 'Sanft und validierend',
    encouragement: 'Es ist okay, alles zu fühlen.',
    prompt: 'Atme einmal tief durch und erlaube dir, diesen Moment zu halten.'
  },
  LOGICAL: {
    tone: 'Klar und strukturiert',
    encouragement: 'Wir schauen auf die nächsten konkreten Schritte.',
    prompt: 'Skizziere drei kleine Schritte, die du sofort angehen kannst.'
  },
  MENTOR: {
    tone: 'Ruhig und unterstützend',
    encouragement: 'Du bist nicht allein in diesem Prozess.',
    prompt: 'Erinnere dich an eine Situation, die du schon gemeistert hast.'
  },
  WARRIOR: {
    tone: 'Energiegeladen und fokussiert',
    encouragement: 'Du hast die Kraft, direkt ins Handeln zu kommen.',
    prompt: 'Wähle eine Sache, die du heute anpackst.'
  },
  SHADOW: {
    tone: 'Direkt aber achtsam',
    encouragement: 'Schau ehrlich hin, ohne dich abzuwerten.',
    prompt: 'Welche Grenze kannst du heute klarer ziehen?'
  },
  CHILD: {
    tone: 'Warm und zugewandt',
    encouragement: 'Du darfst Unterstützung einfordern.',
    prompt: 'Wen könntest du heute um Hilfe bitten?'
  }
};

const FALLBACK_VOICE: PersonaVoice = {
  tone: 'Ruhig und klar',
  encouragement: 'Du darfst dir zuhören und freundlich bleiben.',
  prompt: 'Notiere, was dir jetzt am wichtigsten ist.'
};

const FORBIDDEN_PHRASES = [/"\s*placeholder\s*"/i, /\bTODO\b/i];

export function generatePersonaResponse(
  persona: PersonaLabel | null,
  hints: EmotionHints | null,
  text: string
): { message: string; voice: PersonaVoice } {
  const voice = (persona ? PERSONA_LABELS[persona] : null) ?? FALLBACK_VOICE;
  const arousal = hints ? Math.round(hints.arousal * 100) : null;
  const tempo = hints?.tempoClass ?? null;
  const pauses = hints?.pausesClass ?? null;
  const summaryParts = [
    arousal != null ? `Arousal: ${arousal}%` : null,
    tempo ? `Tempo: ${tempo}` : null,
    pauses ? `Pausen: ${pauses}` : null
  ].filter(Boolean);
  const summary = summaryParts.length > 0 ? `Hinweise → ${summaryParts.join(' • ')}` : '';
  const body = [
    voice.tone,
    voice.encouragement,
    summary,
    voice.prompt,
    text.length > 140 ? 'Fasse den Kern in zwei Sätzen zusammen.' : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  FORBIDDEN_PHRASES.forEach(pattern => {
    if (pattern.test(body)) {
      throw new Error(`Generated response contains forbidden phrase: ${pattern}`);
    }
  });

  return { message: body, voice };
}
