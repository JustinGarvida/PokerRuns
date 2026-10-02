# Poker Runs

Track home-game poker sessions and each player's profit and loss.

- **Backend:** Python (FastAPI) with a SQLite database
- **Frontend:** React (JavaScript) built with Vite

## Run it

You need Python 3.10+ and Node 20+. Open two terminals.

**Terminal 1: backend** (http://127.0.0.1:8000)

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2: frontend** (http://localhost:5173)

```sh
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

After the first time, you only need `source .venv/bin/activate && uvicorn main:app --reload --port 8000`
in `backend/` and `npm run dev` in `frontend/`.

## Pages

| Page | Address | What it does |
|---|---|---|
| Leaderboard | `/` | Players ranked by total PnL across all sessions |
| Sessions | `/sessions` | Every recorded session, newest first |
| Record a session | `/sessions/new` | Date, note, and each player's buy-in and cash-out |
| Session | `/sessions/:id` | That night's results, with edit and delete |
| Player | `/players/:id` | One player's session-by-session results |

## Data

The database is a single file, `backend/poker.db`, created on first start. Back it up by
copying the file; delete it to start over. Amounts are stored as whole cents, and PnL is
always calculated as cash-out minus buy-in.

Players are created when you type a new name into a session. A player whose last session
is deleted or edited away is removed automatically.
