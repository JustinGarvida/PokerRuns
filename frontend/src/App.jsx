import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Leaderboard from './pages/Leaderboard.jsx'
import Sessions from './pages/Sessions.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import { EditSession, NewSession } from './pages/SessionForm.jsx'
import PlayerDetail from './pages/PlayerDetail.jsx'

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="wordmark">
            Poker Runs
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Leaderboard
            </NavLink>
            <NavLink to="/sessions" end>
              Sessions
            </NavLink>
          </nav>
          <Link to="/sessions/new" className="button primary">
            Record a session
          </Link>
        </div>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/new" element={<NewSession />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/sessions/:id/edit" element={<EditSession />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <p>
                  That address doesn't match anything here.{' '}
                  <Link to="/">Go to the leaderboard</Link>
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  )
}
