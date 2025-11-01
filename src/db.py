import os
import sqlite3
from contextlib import contextmanager
from typing import Iterable, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'interactions.sqlite')


class InteractionStore:
    def __init__(self, db_path: str = DB_PATH) -> None:
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._ensure_schema()

    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT DEFAULT (datetime('now')),
                    user_message TEXT NOT NULL,
                    persona_slug TEXT NOT NULL,
                    persona_name TEXT NOT NULL,
                    tone TEXT,
                    mood TEXT,
                    response TEXT NOT NULL,
                    keywords TEXT,
                    confidence REAL
                )
                """
            )
            conn.commit()

    def log(self, user_message: str, state: dict, response: str) -> int:
        persona = state["persona"]
        keywords = ",".join(state.get("matched_keywords", []))
        with self._connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO interactions (
                    user_message, persona_slug, persona_name, tone, mood, response, keywords, confidence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_message,
                    persona.slug,
                    persona.name,
                    state.get("tone"),
                    state.get("mood"),
                    response,
                    keywords,
                    state.get("confidence"),
                ),
            )
            conn.commit()
            return cursor.lastrowid

    def fetch_recent(self, limit: int = 20) -> Iterable[sqlite3.Row]:
        with self._connection() as conn:
            cursor = conn.execute(
                "SELECT id, created_at, user_message, persona_name, response, tone, mood, keywords, confidence "
                "FROM interactions ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            return cursor.fetchall()
