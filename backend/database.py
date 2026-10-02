import sqlite3
from contextlib import closing
from pathlib import Path

DB_PATH = Path(__file__).parent / "poker.db"

# Money is stored as whole cents. PnL is never stored: it is always
# cash_out_cents - buy_in_cents.
SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY,
    played_on  TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_entries (
    id             INTEGER PRIMARY KEY,
    session_id     INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id      INTEGER NOT NULL REFERENCES players(id),
    buy_in_cents   INTEGER NOT NULL CHECK (buy_in_cents >= 0),
    cash_out_cents INTEGER NOT NULL CHECK (cash_out_cents >= 0),
    UNIQUE (session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_player ON session_entries(player_id);
"""


def connect():
    # FastAPI may run the dependency and the endpoint on different worker
    # threads, so the connection cannot be pinned to the thread that opened it.
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with closing(connect()) as conn:
        conn.executescript(SCHEMA)


def get_db():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
