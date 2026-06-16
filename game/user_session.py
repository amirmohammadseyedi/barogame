"""User + session storage backed by SQLite."""

from __future__ import annotations

import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from migrate import get_db_path

PHONE_RE = re.compile(r"^09\d{9}$")
SESSION_DAYS = int(__import__("os").environ.get("SESSION_DAYS", "30"))


class UserSession:
    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or get_db_path()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @staticmethod
    def normalize_phone(raw: str) -> str | None:
        digits = re.sub(r"\D", "", raw or "")
        if digits.startswith("989") and len(digits) == 12:
            digits = "0" + digits[2:]
        if digits.startswith("9") and len(digits) == 10:
            digits = "0" + digits
        if PHONE_RE.fullmatch(digits):
            return digits
        return None

    @staticmethod
    def mask_phone(phone: str) -> str:
        return f"****{phone[-4:]}"

    def login(self, phone: str) -> dict[str, Any]:
        normalized = self.normalize_phone(phone)
        if not normalized:
            raise ValueError("invalid phone")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
        expires_text = expires_at.strftime("%Y-%m-%d %H:%M:%S")

        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO users (phone)
                VALUES (?)
                ON CONFLICT(phone) DO UPDATE SET updated_at = datetime('now')
                """,
                (normalized,),
            )
            user = conn.execute(
                "SELECT id, phone, best_score FROM users WHERE phone = ?",
                (normalized,),
            ).fetchone()

            conn.execute(
                """
                INSERT INTO user_sessions (user_id, token, expires_at)
                VALUES (?, ?, ?)
                """,
                (user["id"], token, expires_text),
            )
            conn.commit()

        return {
            "token": token,
            "expiresAt": expires_text,
            "phoneMask": self.mask_phone(normalized),
            "bestScore": user["best_score"],
        }

    def get_user_by_token(self, token: str) -> dict[str, Any] | None:
        if not token:
            return None

        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT u.id AS user_id, u.phone, u.best_score, s.expires_at
                FROM user_sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                  AND datetime(s.expires_at) > datetime('now')
                """,
                (token,),
            ).fetchone()

        if not row:
            return None

        return {
            "userId": row["user_id"],
            "phone": row["phone"],
            "phoneMask": self.mask_phone(row["phone"]),
            "bestScore": row["best_score"],
            "expiresAt": row["expires_at"],
        }

    def save_score(self, token: str, score: int, level: int) -> dict[str, Any] | None:
        user = self.get_user_by_token(token)
        if not user:
            return None

        score = max(0, int(score))
        level = max(1, int(level))

        with self._connect() as conn:
            conn.execute(
                "INSERT INTO scores (user_id, score, level) VALUES (?, ?, ?)",
                (user["userId"], score, level),
            )
            if score > user["bestScore"]:
                conn.execute(
                    """
                    UPDATE users
                    SET best_score = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (score, user["userId"]),
                )
                best_score = score
            else:
                best_score = user["bestScore"]
            conn.commit()

        return {
            "saved": True,
            "bestScore": best_score,
            "isNewRecord": score >= best_score and score > user["bestScore"],
        }

    def get_leaderboard(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT phone, best_score
                FROM users
                WHERE best_score > 0
                ORDER BY best_score DESC, updated_at ASC
                LIMIT ?
                """,
                (max(1, limit),),
            ).fetchall()

        return [
            {
                "rank": index + 1,
                "phoneMask": self.mask_phone(row["phone"]),
                "score": row["best_score"],
            }
            for index, row in enumerate(rows)
        ]

    def logout(self, token: str) -> None:
        if not token:
            return
        with self._connect() as conn:
            conn.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
            conn.commit()
