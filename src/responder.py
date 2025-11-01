import random
from string import Template
from typing import Dict

from .persona_loader import Persona


class PersonaResponder:
    def __init__(self, personas: Dict[str, Persona]) -> None:
        self.personas = personas

    def render(self, message: str, state: Dict[str, object]) -> str:
        persona: Persona = state["persona"]
        template = self._choose_template(persona)
        context = self._build_context(message, state)
        return Template(template).safe_substitute(context)

    def _choose_template(self, persona: Persona) -> str:
        if not persona.templates:
            return "${persona_name} hört zu und sagt: ${insight}"
        return random.choice(persona.templates)

    def _build_context(self, message: str, state: Dict[str, object]) -> Dict[str, str]:
        persona: Persona = state["persona"]
        focus = state.get("focus", "")
        action = random.choice(persona.actions) if persona.actions else "deinen nächsten Schritt finden"
        insight = self._build_insight(message, focus, state)
        keywords = ", ".join(state.get("matched_keywords", [])) or "deine Themen"

        return {
            "user_message": message,
            "persona_name": persona.name,
            "tone": state.get("tone", "ausgeglichen"),
            "mood": state.get("mood", "ausgeglichen"),
            "focus": focus,
            "action": action,
            "insight": insight,
            "keywords": keywords,
        }

    def _build_insight(self, message: str, focus: str, state: Dict[str, object]) -> str:
        if focus and focus != "das, was dich gerade bewegt":
            return f"dass {focus} im Zentrum steht"
        trimmed = message.strip()
        if len(trimmed) < 10:
            return "eine stille Frage in dir"
        first_sentence = trimmed.split('.')[0][:120]
        return first_sentence or "die Nuancen deiner Worte"
