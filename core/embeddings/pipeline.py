"""Simple text embedding pipeline built around lightweight runtimes."""
from __future__ import annotations

import re
import unicodedata
from typing import List, Sequence

from .model_loader import BaseEmbeddingModel

_WHITESPACE_RE = re.compile(r"\s+")


def normalise_text(text: str) -> str:
    """Normalise user provided text to stabilise embedding quality."""

    # Unicode normalisation collapses accented characters into their canonical form
    normalised = unicodedata.normalize("NFKC", text)
    # Lower-case and collapse repeated whitespace
    normalised = normalised.lower()
    normalised = _WHITESPACE_RE.sub(" ", normalised)
    return normalised.strip()


class EmbeddingPipeline:
    """Pipeline that turns raw text into normalised embedding vectors."""

    def __init__(self, model: BaseEmbeddingModel) -> None:
        self._model = model

    def __call__(self, texts: Sequence[str] | str) -> List[List[float]]:
        if isinstance(texts, str):
            texts_to_process: List[str] = [texts]
        else:
            texts_to_process = list(texts)

        normalised = [normalise_text(text) for text in texts_to_process]
        return self._model.embed(normalised)


__all__ = ["EmbeddingPipeline", "normalise_text"]
