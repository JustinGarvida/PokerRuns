import { Link } from 'react-router-dom'
import { api, useLoad } from '../api.js'
import { formatCents, formatDate } from '../money.js'
import Pnl from '../components/Pnl.jsx'
import Status from '../components/Status.jsx'

export default function Sessions() {
  const { data, loading, error } = useLoad(api.sessions)

  if (loading || error) return <Status loading={loading} error={error} />

  if (data.length === 0) {
    return (
      <div className="empty">
        <h1>No sessions yet</h1>
        <p>Each game you record shows up here with its results.</p>
        <Link to="/sessions/new" className="button primary">
          Record a session
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1>Sessions</h1>
      <p className="lede">Every game on record, newest first.</p>

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th className="optional">Note</th>
            <th className="num">Players</th>
            <th className="num optional">Total buy-ins</th>
            <th>Biggest winner</th>
          </tr>
        </thead>
        <tbody>
          {data.map((session) => (
            <tr key={session.id}>
              <td className="name">
                <Link to={`/sessions/${session.id}`}>{formatDate(session.played_on)}</Link>
              </td>
              <td className="optional muted">{session.note}</td>
              <td className="num">{session.player_count}</td>
              <td className="num optional">{formatCents(session.total_buy_in_cents)}</td>
              <td>
                {session.top_winner && (
                  <>
                    {session.top_winner.name} <Pnl cents={session.top_winner.pnl_cents} />
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
