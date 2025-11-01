import json
import os
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Persona:
    slug: str
    name: str
    description: str
    tones: List[str]
    keywords: List[str]
    moods: List[str]
    actions: List[str]
    templates: List[str] = field(default_factory=list)


class PersonaRepository:
    def __init__(self, persona_dir: str, template_dir: str) -> None:
        self.persona_dir = persona_dir
        self.template_dir = template_dir
        self._personas: Dict[str, Persona] = {}

    def load(self) -> Dict[str, Persona]:
        self._personas = {}
        for filename in os.listdir(self.persona_dir):
            if not filename.endswith('.json'):
                continue
            path = os.path.join(self.persona_dir, filename)
            with open(path, 'r', encoding='utf-8') as handle:
                data = json.load(handle)
            slug = data['slug']
            templates = self._load_templates(slug)
            persona = Persona(
                slug=slug,
                name=data['name'],
                description=data['description'],
                tones=data.get('tones', []),
                keywords=[word.lower() for word in data.get('keywords', [])],
                moods=data.get('moods', []),
                actions=data.get('actions', []),
                templates=templates,
            )
            self._personas[slug] = persona
        return self._personas

    def _load_templates(self, slug: str) -> List[str]:
        template_path = os.path.join(self.template_dir, f"{slug}.json")
        if not os.path.exists(template_path):
            return []
        with open(template_path, 'r', encoding='utf-8') as handle:
            data = json.load(handle)
        return data.get('responses', [])

    @property
    def personas(self) -> Dict[str, Persona]:
        if not self._personas:
            return self.load()
        return self._personas
