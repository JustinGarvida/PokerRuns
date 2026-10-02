import { Link, useParams } from 'react-router-dom'
import { api, useLoad } from '../api.js'
import { formatCents, formatDate } from '../money.js'
import Pnl from '../components/Pnl.jsx'
import Status from '../components/Status.jsx'

export default function PlayerDetail() {
  const { id } = useParams()
  const { data: player, loading, error } = useLoad(() => api.player(id), [id])

  if (loading || error) return <Status loading={loading} error={error} />

  const sessionsWord = player.sessions_played === 1 ? 'session' : 'sessions'

  return (
    <>
      <p className="back">
        <Link to="/">Leaderboard</Link>
      </p>
      <h1>{player.name}</h1>
      <p className="lede">
        <Pnl cents={player.total_pnl_cents} /> over {player.sessions_played} {sessionsWord}
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Session</th>
            <th className="num optional">Buy-in</th>
            <th className="num optional">Cash-out</th>
            <th className="num">Result</th>
            <th className="num">Running total</th>
          </tr>
        </thead>
        <tbody>
          {player.results.map((result) => (
            <tr key={result.session_id}>
              <td className="name">
                <Link to={`/sessions/${result.session_id}`}>
                  {formatDate(result.played_on)}
                </Link>
                {result.note && <span className="muted sub">{result.note}</span>}
              </td>
              <td className="num optional">{formatCents(result.buy_in_cents)}</td>
              <td className="num optional">{formatCents(result.cash_out_cents)}</td>
              <td className="num">
                <Pnl cents={result.pnl_cents} />
              </td>
              <td className="num">
                <Pnl cents={result.running_total_cents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
