import { Link } from 'react-router-dom'
import { api, useLoad } from '../api.js'
import Pnl from '../components/Pnl.jsx'
import Status from '../components/Status.jsx'

// A bar growing right (winnings) or left (losses) from a shared zero line,
// scaled against the largest absolute total on the board.
function PnlBar({ cents, maxAbs }) {
  const width = maxAbs ? (Math.abs(cents) / maxAbs) * 50 : 0
  const style =
    cents >= 0
      ? { left: '50%', width: `${width}%` }
      : { right: '50%', width: `${width}%` }
  return (
    <div className="bar-track" aria-hidden="true">
      <div className={`bar ${cents >= 0 ? 'up' : 'down'}`} style={style} />
    </div>
  )
}

export default function Leaderboard() {
  const { data, loading, error } = useLoad(api.leaderboard)

  if (loading || error) return <Status loading={loading} error={error} />

  if (data.length === 0) {
    return (
      <div className="empty">
        <h1>No sessions yet</h1>
        <p>The leaderboard fills in once you record your first game.</p>
        <Link to="/sessions/new" className="button primary">
          Record a session
        </Link>
      </div>
    )
  }

  const maxAbs = Math.max(...data.map((row) => Math.abs(row.total_pnl_cents)))

  return (
    <>
      <h1>Leaderboard</h1>
      <p className="lede">Everyone's total winnings and losses across all sessions.</p>

      <table className="table board">
        <thead>
          <tr>
            <th className="rank">Rank</th>
            <th>Player</th>
            <th className="bar-cell">
              <span className="visually-hidden">Total as a bar</span>
            </th>
            <th className="num">Total</th>
            <th className="num optional">Sessions</th>
            <th className="num optional">Per session</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.player_id} className={index === 0 ? 'leader' : undefined}>
              <td className="rank">{index + 1}</td>
              <td className="name">
                <Link to={`/players/${row.player_id}`}>{row.player_name}</Link>
              </td>
              <td className="bar-cell">
                <PnlBar cents={row.total_pnl_cents} maxAbs={maxAbs} />
              </td>
              <td className="num">
                <Pnl cents={row.total_pnl_cents} />
              </td>
              <td className="num optional">{row.sessions_played}</td>
              <td className="num optional">
                <Pnl cents={Math.round(row.total_pnl_cents / row.sessions_played)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
