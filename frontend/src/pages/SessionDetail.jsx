import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, useLoad } from '../api.js'
import { formatCents, formatDate } from '../money.js'
import Pnl from '../components/Pnl.jsx'
import Status from '../components/Status.jsx'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: session, loading, error } = useLoad(() => api.session(id), [id])
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  if (loading || error) return <Status loading={loading} error={error} />

  const imbalance = session.total_cash_out_cents - session.total_buy_in_cents

  async function deleteSession() {
    try {
      await api.deleteSession(id)
      navigate('/sessions')
    } catch (err) {
      setDeleteError(err.message)
      setConfirming(false)
    }
  }

  return (
    <>
      <p className="back">
        <Link to="/sessions">All sessions</Link>
      </p>
      <h1>{formatDate(session.played_on)}</h1>
      {session.note && <p className="lede">{session.note}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Player</th>
            <th className="num">Buy-in</th>
            <th className="num">Cash-out</th>
            <th className="num">Result</th>
          </tr>
        </thead>
        <tbody>
          {session.entries.map((entry) => (
            <tr key={entry.player_id}>
              <td className="name">
                <Link to={`/players/${entry.player_id}`}>{entry.player_name}</Link>
              </td>
              <td className="num">{formatCents(entry.buy_in_cents)}</td>
              <td className="num">{formatCents(entry.cash_out_cents)}</td>
              <td className="num">
                <Pnl cents={entry.pnl_cents} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Table total</td>
            <td className="num">{formatCents(session.total_buy_in_cents)}</td>
            <td className="num">{formatCents(session.total_cash_out_cents)}</td>
            <td className="num">
              <Pnl cents={imbalance} />
            </td>
          </tr>
        </tfoot>
      </table>

      {imbalance !== 0 && (
        <p className="notice warn">
          Cash-outs are {formatCents(imbalance)} {imbalance > 0 ? 'more' : 'less'} than
          buy-ins, so this session doesn't balance.
        </p>
      )}

      {deleteError && (
        <p className="notice error" role="alert">
          {deleteError}
        </p>
      )}

      <div className="actions">
        {confirming ? (
          <>
            <span>Delete this session for good?</span>
            <button className="button danger" onClick={deleteSession}>
              Delete session
            </button>
            <button className="button" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </>
        ) : (
          <>
            <Link to={`/sessions/${id}/edit`} className="button">
              Edit session
            </Link>
            <button className="button quiet-danger" onClick={() => setConfirming(true)}>
              Delete session
            </button>
          </>
        )}
      </div>
    </>
  )
}
