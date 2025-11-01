"""High level abstraction for semantic similarity search."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from core.embeddings.pipeline import EmbeddingPipeline
from core.storage.sqlite_vector_store import SQLiteVectorStore, SearchResult


@dataclass
class SemanticSearchConfig:
    model_path: str
    backend: str = "onnx"


class SemanticSearchEngine:
    """Coordinates embedding generation and vector storage for retrieval."""

    def __init__(
        self,
        pipeline: EmbeddingPipeline,
        store: SQLiteVectorStore,
    ) -> None:
        self._pipeline = pipeline
        self._store = store

    def index_texts(self, session_id: str, texts: Sequence[str]) -> List[str]:
        embeddings = self._pipeline(texts)
        metadatas = [{"text": text} for text in texts]
        return self._store.add_many(session_id, embeddings, metadatas)

    def query(self, session_id: str, text: str, top_k: int = 5) -> List[SearchResult]:
        query_embedding = self._pipeline(text)[0]
        return self._store.search(session_id, query_embedding, top_k=top_k)

    def close(self) -> None:
        self._store.close()


__all__ = ["SemanticSearchEngine", "SemanticSearchConfig"]
