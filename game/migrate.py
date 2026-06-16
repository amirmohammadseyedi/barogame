"""Apply SQL migrations in order."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = BASE_DIR / "migrations"
DEFAULT_DB_PATH = BASE_DIR / "data" / "arobazi.db"


def get_db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", DEFAULT_DB_PATH))


def run_migrations(db_path: Path | None = None) -> None:
    db_path = db_path or get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        applied = {row[0] for row in conn.execute("SELECT filename FROM schema_migrations")}

        for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if migration.name in applied:
                continue
            conn.executescript(migration.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES (?)",
                (migration.name,),
            )
            conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    run_migrations()
    print("migrations ok:", get_db_path())
