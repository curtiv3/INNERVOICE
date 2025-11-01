import re
from collections import Counter
from typing import Dict, List, Optional

from .persona_loader import Persona

POSITIVE_WORDS = {
    "danke",
    "freue",
    "glücklich",
    "hoffnung",
    "zufrieden",
    "motiviert",
    "stark",
    "kann",
}

NEGATIVE_WORDS = {
    "angst",
    "sorge",
    "traurig",
    "wütend",
    "überfordert",
    "zweifel",
    "scheitern",
    "müde",
    "kann nicht",
}


class PersonaStateMachine:
    def __init__(self, personas: Dict[str, Persona]) -> None:
        self.personas = personas
        self.current_slug: Optional[str] = None
        self.history: List[str] = []

    def resolve(self, message: str) -> Dict[str, object]:
        text = message.strip()
        lowered = text.lower()
        intensity = self._estimate_intensity(text)
        keyword_counts = {
            slug: self._count_keywords(lowered, persona.keywords)
            for slug, persona in self.personas.items()
        }
        sentiment = self._sentiment(lowered)

        scores = {}
        for slug, persona in self.personas.items():
            base = keyword_counts[slug] * 2.0
            if slug == 'mentor' and '?' in text:
                base += 1.5
            if slug == 'shadow' and sentiment < 0:
                base += abs(sentiment) * 2 + intensity
            if slug == 'emotional' and (sentiment <= 0 or intensity > 1):
                base += 1.0 + intensity
            if slug == 'logical' and sentiment == 0:
                base += 1.0
            if slug == self.current_slug:
                base *= 1.1
            scores[slug] = base

        best_slug = self._select_best(scores)
        persona = self.personas[best_slug]
        matched_keywords = self._matched_keywords(lowered, persona.keywords)
        focus_terms = self._focus_terms(lowered, matched_keywords)
        mood = self._select_mood(persona, sentiment, intensity)
        tone = self._select_tone(persona, intensity)
        confidence = self._confidence(scores, best_slug)

        self._update_state(best_slug)

        return {
            "persona": persona,
            "mood": mood,
            "tone": tone,
            "matched_keywords": matched_keywords,
            "focus": focus_terms,
            "confidence": confidence,
            "sentiment": sentiment,
            "intensity": intensity,
        }

    def _count_keywords(self, text: str, keywords: List[str]) -> int:
        count = 0
        for keyword in keywords:
            if keyword in text:
                count += text.count(keyword)
        return count

    def _matched_keywords(self, text: str, keywords: List[str]) -> List[str]:
        matches = []
        for keyword in keywords:
            if keyword in text:
                matches.append(keyword)
        return matches

    def _focus_terms(self, text: str, matched_keywords: List[str]) -> str:
        words = re.findall(r"[a-zäöüß]{4,}", text)
        counter = Counter(words)
        for keyword in matched_keywords:
            counter[keyword] += 2
        most_common = [word for word, _ in counter.most_common(2)]
        if not most_common:
            return "das, was dich gerade bewegt"
        if len(most_common) == 1:
            return most_common[0]
        return f"{most_common[0]} und {most_common[1]}"

    def _select_mood(self, persona: Persona, sentiment: float, intensity: float) -> str:
        if not persona.moods:
            return "ausgeglichen"
        if sentiment < -0.5:
            return persona.moods[0]
        if sentiment > 0.3:
            return persona.moods[-1]
        if intensity > 1.5 and len(persona.moods) > 1:
            return persona.moods[0]
        return persona.moods[min(1, len(persona.moods) - 1)]

    def _select_tone(self, persona: Persona, intensity: float) -> str:
        if not persona.tones:
            return "neutral"
        if intensity > 2 and len(persona.tones) > 1:
            return persona.tones[-1]
        return persona.tones[0]

    def _sentiment(self, text: str) -> float:
        positive = sum(text.count(word) for word in POSITIVE_WORDS)
        negative = sum(text.count(word) for word in NEGATIVE_WORDS)
        if positive == negative == 0:
            return 0.0
        total = positive + negative
        return (positive - negative) / total

    def _estimate_intensity(self, text: str) -> float:
        exclamations = text.count('!')
        caps = sum(1 for token in text.split() if token.isupper() and len(token) > 3)
        length_factor = min(len(text) / 120, 2.0)
        return exclamations * 0.5 + caps * 0.3 + length_factor

    def _select_best(self, scores: Dict[str, float]) -> str:
        best_slug = max(scores, key=scores.get)
        best_score = scores[best_slug]
        if best_score == 0 and self.current_slug:
            return self.current_slug
        return best_slug

    def _confidence(self, scores: Dict[str, float], best_slug: str) -> float:
        best_score = scores[best_slug]
        total = sum(score for score in scores.values() if score > 0)
        if total == 0:
            return 0.25
        confidence = best_score / total
        return round(min(max(confidence, 0.2), 0.95), 2)

    def _update_state(self, slug: str) -> None:
        self.history.append(slug)
        if len(self.history) > 20:
            self.history.pop(0)
        self.current_slug = slug
