import type { EmotionHints, PersonaLabel, PersonaVoice } from '@innervoice/persona-core';
import { generatePersonaResponse as coreGeneratePersonaResponse } from '@innervoice/persona-core';

function asPersonaLabel(value: string | null): PersonaLabel | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  const valid = ['EMOTIONAL', 'LOGICAL', 'MENTOR', 'WARRIOR', 'SHADOW', 'CHILD'];
  return valid.includes(upper) ? (upper as PersonaLabel) : null;
}

export function generatePersonaResponse(
  persona: string | null,
  hints: EmotionHints | null,
  text: string
): { message: string; voice: PersonaVoice } {
  try {
    return coreGeneratePersonaResponse(asPersonaLabel(persona), hints, text);
  } catch (error) {
    console.error('Persona generation failed, fallback response used.', error);
    return coreGeneratePersonaResponse(null, hints, text);
  }
}

export type { PersonaVoice };

type ActionVariant = 'reframe' | 'next-step' | 'more-question';

export function transformResponse(base: string, variant: ActionVariant): string {
  switch (variant) {
    case 'reframe':
      return `${base}\n\n🔁 Reframe: Welche neue Perspektive eröffnet sich, wenn du dir selbst Mitgefühl schenkst?`;
    case 'next-step':
      return `${base}\n\n➡️ Nächster Schritt: Formuliere eine kleine Handlung, die in den nächsten 24 Stunden möglich ist.`;
    case 'more-question':
      return `${base}\n\n❓ Weitere Frage: Was würde dein zukünftiges Ich dir jetzt raten?`;
    default:
      return base;
  }
}
