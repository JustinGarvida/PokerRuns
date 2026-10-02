import sqlite3
from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field, field_validator, model_validator

from database import get_db, init_db

init_db()

app = FastAPI(title="Poker Runs")


class EntryIn(BaseModel):
    player_name: str = Field(max_length=60)
    buy_in_cents: int = Field(ge=0)
    cash_out_cents: int = Field(ge=0)

    @field_validator("player_name")
    @classmethod
    def clean_name(cls, value):
        value = " ".join(value.split())
        if not value:
            raise ValueError("Player name is required")
        return value


class SessionIn(BaseModel):
    played_on: date
    note: str = Field(default="", max_length=200)
    entries: list[EntryIn]

    @field_validator("note")
    @classmethod
    def clean_note(cls, value):
        return value.strip()

    @model_validator(mode="after")
    def check_entries(self):
        if len(self.entries) < 2:
            raise ValueError("A session needs at least two players")
        names = [entry.player_name.lower() for entry in self.entries]
        if len(names) != len(set(names)):
            raise ValueError("Each player can only appear once in a session")
        return self


def get_or_create_player(db: sqlite3.Connection, name: str) -> int:
    row = db.execute("SELECT id FROM players WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    return db.execute("INSERT INTO players (name) VALUES (?)", (name,)).lastrowid


def write_entries(db: sqlite3.Connection, session_id: int, entries: list[EntryIn]):
    for entry in entries:
        db.execute(
            "INSERT INTO session_entries"
            " (session_id, player_id, buy_in_cents, cash_out_cents)"
            " VALUES (?, ?, ?, ?)",
            (
                session_id,
                get_or_create_player(db, entry.player_name),
                entry.buy_in_cents,
                entry.cash_out_cents,
            ),
        )


def prune_players(db: sqlite3.Connection):
    # Players exist only through the sessions they played, so a name that was
    # edited away or deleted with its last session should not linger.
    db.execute(
        "DELETE FROM players"
        " WHERE id NOT IN (SELECT DISTINCT player_id FROM session_entries)"
    )


def session_detail(db: sqlite3.Connection, session_id: int):
    session = db.execute(
        "SELECT id, played_on, note FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    entries = db.execute(
        "SELECT p.id AS player_id, p.name AS player_name,"
        "       e.buy_in_cents, e.cash_out_cents,"
        "       e.cash_out_cents - e.buy_in_cents AS pnl_cents"
        " FROM session_entries e JOIN players p ON p.id = e.player_id"
        " WHERE e.session_id = ?"
        " ORDER BY pnl_cents DESC, p.name",
        (session_id,),
    ).fetchall()
    return {
        **dict(session),
        "entries": [dict(entry) for entry in entries],
        "total_buy_in_cents": sum(entry["buy_in_cents"] for entry in entries),
        "total_cash_out_cents": sum(entry["cash_out_cents"] for entry in entries),
    }


@app.get("/api/sessions")
def list_sessions(db: sqlite3.Connection = Depends(get_db)):
    sessions = db.execute(
        "SELECT s.id, s.played_on, s.note,"
        "       COUNT(e.id) AS player_count,"
        "       COALESCE(SUM(e.buy_in_cents), 0) AS total_buy_in_cents"
        " FROM sessions s LEFT JOIN session_entries e ON e.session_id = s.id"
        " GROUP BY s.id"
        " ORDER BY s.played_on DESC, s.id DESC"
    ).fetchall()

    # Biggest winner of each session, for the history list.
    winners = {}
    for row in db.execute(
        "SELECT e.session_id, p.name,"
        "       e.cash_out_cents - e.buy_in_cents AS pnl_cents"
        " FROM session_entries e JOIN players p ON p.id = e.player_id"
    ):
        best = winners.get(row["session_id"])
        if best is None or row["pnl_cents"] > best["pnl_cents"]:
            winners[row["session_id"]] = {
                "name": row["name"],
                "pnl_cents": row["pnl_cents"],
            }

    return [{**dict(s), "top_winner": winners.get(s["id"])} for s in sessions]


@app.post("/api/sessions", status_code=201)
def create_session(body: SessionIn, db: sqlite3.Connection = Depends(get_db)):
    with db:
        session_id = db.execute(
            "INSERT INTO sessions (played_on, note) VALUES (?, ?)",
            (body.played_on.isoformat(), body.note),
        ).lastrowid
        write_entries(db, session_id, body.entries)
    return session_detail(db, session_id)


@app.get("/api/sessions/{session_id}")
def get_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    return session_detail(db, session_id)


@app.put("/api/sessions/{session_id}")
def update_session(
    session_id: int, body: SessionIn, db: sqlite3.Connection = Depends(get_db)
):
    with db:
        updated = db.execute(
            "UPDATE sessions SET played_on = ?, note = ? WHERE id = ?",
            (body.played_on.isoformat(), body.note, session_id),
        ).rowcount
        if not updated:
            raise HTTPException(status_code=404, detail="Session not found")
        db.execute("DELETE FROM session_entries WHERE session_id = ?", (session_id,))
        write_entries(db, session_id, body.entries)
        prune_players(db)
    return session_detail(db, session_id)


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    with db:
        deleted = db.execute(
            "DELETE FROM sessions WHERE id = ?", (session_id,)
        ).rowcount
        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found")
        prune_players(db)
    return Response(status_code=204)


@app.get("/api/leaderboard")
def leaderboard(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT p.id AS player_id, p.name AS player_name,"
        "       COUNT(e.id) AS sessions_played,"
        "       SUM(e.cash_out_cents - e.buy_in_cents) AS total_pnl_cents,"
        "       SUM(e.cash_out_cents > e.buy_in_cents) AS winning_sessions"
        " FROM players p JOIN session_entries e ON e.player_id = p.id"
        " GROUP BY p.id"
        " ORDER BY total_pnl_cents DESC, p.name"
    ).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/players")
def list_players(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT id, name FROM players ORDER BY name").fetchall()
    return [dict(row) for row in rows]


@app.get("/api/players/{player_id}")
def get_player(player_id: int, db: sqlite3.Connection = Depends(get_db)):
    player = db.execute(
        "SELECT id, name FROM players WHERE id = ?", (player_id,)
    ).fetchone()
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    rows = db.execute(
        "SELECT s.id AS session_id, s.played_on, s.note,"
        "       e.buy_in_cents, e.cash_out_cents,"
        "       e.cash_out_cents - e.buy_in_cents AS pnl_cents"
        " FROM session_entries e JOIN sessions s ON s.id = e.session_id"
        " WHERE e.player_id = ?"
        " ORDER BY s.played_on, s.id",
        (player_id,),
    ).fetchall()

    results = []
    running = 0
    for row in rows:
        running += row["pnl_cents"]
        results.append({**dict(row), "running_total_cents": running})
    results.reverse()  # newest first

    return {
        **dict(player),
        "sessions_played": len(results),
        "total_pnl_cents": running,
        "results": results,
    }
