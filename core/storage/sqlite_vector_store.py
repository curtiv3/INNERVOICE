"""SQLite backed vector store with per-session indices."""
from __future__ import annotations

import json
import math
import sqlite3
import string
import sys
import uuid
from array import array
from dataclasses import dataclass
from pathlib import Path
from itertools import zip_longest
from typing import Iterable, List, Sequence


Vector = Sequence[float]


def _vector_to_blob(vector: Vector) -> bytes:
    arr = array("f", vector)
    if sys.byteorder != "little":  # pragma: no cover - big endian systems are rare
        arr.byteswap()
    return arr.tobytes()


def _blob_to_vector(blob: bytes) -> List[float]:
    arr = array("f")
    arr.frombytes(blob)
    if sys.byteorder != "little":  # pragma: no cover - big endian systems are rare
        arr.byteswap()
    return list(arr)


def _normalise_session_id(session_id: str) -> str:
    safe_chars = string.ascii_letters + string.digits + "_"
    normalised = [char if char in safe_chars else "_" for char in session_id]
    return "".join(normalised)


@dataclass
class SearchResult:
    vector_id: str
    score: float
    metadata: dict | None


class SQLiteVectorStore:
    """Persist embeddings and perform cosine similarity search."""

    def __init__(self, path: str | Path = ":memory:", dimension: int | None = None) -> None:
        self._path = Path(path)
        self._dimension = dimension
        self._connection = sqlite3.connect(self._path)
        self._connection.execute(
            """
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                vector BLOB NOT NULL,
                norm REAL NOT NULL,
                metadata TEXT
            )
            """
        )
        self._connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_embeddings_session ON embeddings(session_id)"
        )
        self._connection.commit()

    def close(self) -> None:
        self._connection.close()

    def _ensure_dimension(self, vector: Vector) -> None:
        if self._dimension is None:
            self._dimension = len(vector)
        elif len(vector) != self._dimension:
            raise ValueError(
                f"Embedding dimensionality mismatch: expected {self._dimension}, received {len(vector)}"
            )

    def _ensure_session_index(self, session_id: str) -> None:
        normalised = _normalise_session_id(session_id)
        index_name = f"idx_embeddings_{normalised}"
        query = (
            "CREATE INDEX IF NOT EXISTS "
            f"{index_name} "
            "ON embeddings(id) "
            f"WHERE session_id = ?"
        )
        # SQLite does not allow parameters in index expressions, so we have to inline the value.
        escaped_session = session_id.replace("'", "''")
        query_inlined = query.replace("?", f"'{escaped_session}'")
        self._connection.execute(query_inlined)
        self._connection.commit()

    def add_vector(
        self,
        session_id: str,
        vector: Vector,
        metadata: dict | None = None,
        vector_id: str | None = None,
    ) -> str:
        self._ensure_dimension(vector)
        self._ensure_session_index(session_id)

        if vector_id is None:
            vector_id = uuid.uuid4().hex

        blob = _vector_to_blob(vector)
        norm = math.sqrt(sum(value * value for value in vector))
        metadata_json = json.dumps(metadata) if metadata is not None else None
        self._connection.execute(
            "INSERT OR REPLACE INTO embeddings(id, session_id, vector, norm, metadata) VALUES (?, ?, ?, ?, ?)",
            (vector_id, session_id, blob, norm, metadata_json),
        )
        self._connection.commit()
        return vector_id

    def add_many(
        self,
        session_id: str,
        vectors: Iterable[Vector],
        metadatas: Iterable[dict | None] | None = None,
    ) -> List[str]:
        ids: List[str] = []
        if metadatas is None:
            for vector in vectors:
                ids.append(self.add_vector(session_id, vector, None))
        else:
            for vector, metadata in zip_longest(vectors, metadatas, fillvalue=None):
                if vector is None:  # metadatas longer than vectors
                    break
                ids.append(self.add_vector(session_id, vector, metadata))
        return ids

    def search(
        self,
        session_id: str,
        query_vector: Vector,
        top_k: int = 5,
    ) -> List[SearchResult]:
        self._ensure_dimension(query_vector)
        query_norm = math.sqrt(sum(value * value for value in query_vector))
        if query_norm == 0:
            raise ValueError("Query vector norm must be > 0")

        cursor = self._connection.execute(
            "SELECT id, vector, norm, metadata FROM embeddings WHERE session_id = ?",
            (session_id,),
        )
        candidates: List[SearchResult] = []
        for vector_id, blob, norm, metadata_json in cursor.fetchall():
            if norm == 0:
                continue
            vector = _blob_to_vector(blob)
            dot = sum(a * b for a, b in zip(query_vector, vector))
            score = dot / (query_norm * norm)
            metadata = json.loads(metadata_json) if metadata_json else None
            candidates.append(SearchResult(vector_id=vector_id, score=score, metadata=metadata))
        candidates.sort(key=lambda item: item.score, reverse=True)
        return candidates[:top_k]


__all__ = ["SQLiteVectorStore", "SearchResult"]
