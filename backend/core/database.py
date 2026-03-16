import json
import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "graInt.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS proposals (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT,
                inputs      TEXT    NOT NULL,
                sections    TEXT    NOT NULL DEFAULT '{}',
                review      TEXT,
                status      TEXT    NOT NULL DEFAULT 'draft',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)


def create_proposal(inputs: dict) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO proposals (inputs) VALUES (?)",
            (json.dumps(inputs),),
        )
        return cur.lastrowid


def get_proposal(proposal_id: int) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM proposals WHERE id = ?", (proposal_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["inputs"] = json.loads(d["inputs"])
    d["sections"] = json.loads(d["sections"])
    return d


def list_proposals() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, title, status, created_at, updated_at "
            "FROM proposals ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def update_section(proposal_id: int, section: str, content: str):
    with _connect() as conn:
        row = conn.execute(
            "SELECT sections, title FROM proposals WHERE id = ?", (proposal_id,)
        ).fetchone()
        sections = json.loads(row["sections"])
        sections[section] = content

        # Auto-populate title from the generated title section
        title = row["title"]
        if section == "title" and not title:
            title = content[:120].strip()

        conn.execute(
            "UPDATE proposals SET sections = ?, title = ?, updated_at = datetime('now') WHERE id = ?",
            (json.dumps(sections), title, proposal_id),
        )


def update_review(proposal_id: int, review: str):
    with _connect() as conn:
        conn.execute(
            "UPDATE proposals SET review = ?, status = 'reviewed', "
            "updated_at = datetime('now') WHERE id = ?",
            (review, proposal_id),
        )


def set_status(proposal_id: int, status: str):
    with _connect() as conn:
        conn.execute(
            "UPDATE proposals SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (status, proposal_id),
        )


def delete_proposal(proposal_id: int):
    with _connect() as conn:
        conn.execute("DELETE FROM proposals WHERE id = ?", (proposal_id,))
