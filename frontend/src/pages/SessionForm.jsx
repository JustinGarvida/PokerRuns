import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, useLoad } from '../api.js'
import { centsToInput, formatCents, parseDollars, todayIso } from '../money.js'
import Pnl from '../components/Pnl.jsx'
import Status from '../components/Status.jsx'

const blankRow = (key) => ({ key, name: '', buyIn: '', cashOut: '' })
const isBlank = (row) => !row.name.trim() && !row.buyIn.trim() && !row.cashOut.trim()

export function NewSession() {
  return (
    <SessionForm
      title="Record a session"
      initial={{ playedOn: todayIso(), note: '', rows: [0, 1, 2, 3].map(blankRow) }}
      save={api.createSession}
    />
  )
}

export function EditSession() {
  const { id } = useParams()
  const { data: session, loading, error } = useLoad(() => api.session(id), [id])

  if (loading || error) return <Status loading={loading} error={error} />

  return (
    <SessionForm
      key={id}
      title="Edit session"
      cancelTo={`/sessions/${id}`}
      initial={{
        playedOn: session.played_on,
        note: session.note,
        rows: session.entries.map((entry, index) => ({
          key: index,
          name: entry.player_name,
          buyIn: centsToInput(entry.buy_in_cents),
          cashOut: centsToInput(entry.cash_out_cents),
        })),
      }}
      save={(data) => api.updateSession(id, data)}
    />
  )
}

function SessionForm({ title, initial, save, cancelTo = '/sessions' }) {
  const navigate = useNavigate()
  const { data: players } = useLoad(api.players)
  const [playedOn, setPlayedOn] = useState(initial.playedOn)
  const [note, setNote] = useState(initial.note)
  const [rows, setRows] = useState(initial.rows)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const nextKey = useRef(initial.rows.length)

  const updateRow = (key, field, value) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    )
  const addRow = () => setRows((current) => [...current, blankRow(nextKey.current++)])
  const removeRow = (key) => setRows((current) => current.filter((row) => row.key !== key))

  // Live totals count whatever parses so far; blanks and typos count as zero.
  const totalBuyIn = rows.reduce((sum, row) => sum + (parseDollars(row.buyIn) ?? 0), 0)
  const totalCashOut = rows.reduce((sum, row) => sum + (parseDollars(row.cashOut) ?? 0), 0)
  const imbalance = totalCashOut - totalBuyIn

  function buildEntries() {
    const filled = rows.filter((row) => !isBlank(row))
    if (filled.length < 2) throw new Error('Add at least two players.')

    const seen = new Set()
    return filled.map((row) => {
      const name = row.name.trim()
      if (!name) throw new Error('Every row with amounts needs a player name.')
      if (seen.has(name.toLowerCase())) throw new Error(`${name} is listed more than once.`)
      seen.add(name.toLowerCase())

      const buyIn = parseDollars(row.buyIn)
      const cashOut = parseDollars(row.cashOut)
      if (buyIn === null || cashOut === null) {
        throw new Error(`Enter a buy-in and cash-out for ${name}, like 100 or 62.50.`)
      }
      return { player_name: name, buy_in_cents: buyIn, cash_out_cents: cashOut }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    let entries
    try {
      if (!playedOn) throw new Error('Choose the date the session was played.')
      entries = buildEntries()
    } catch (err) {
      setError(err.message)
      return
    }

    setSaving(true)
    try {
      const saved = await save({ played_on: playedOn, note, entries })
      navigate(`/sessions/${saved.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="session-form" noValidate>
      <h1>{title}</h1>

      <div className="fields">
        <label className="field">
          <span>Date played</span>
          <input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
        </label>
        <label className="field grow">
          <span>Note (optional)</span>
          <input
            type="text"
            value={note}
            maxLength={200}
            placeholder="Where you played, stakes, anything worth remembering"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <datalist id="known-players">
        {(players ?? []).map((player) => (
          <option key={player.id} value={player.name} />
        ))}
      </datalist>

      <div className="entry-grid" role="group" aria-label="Players">
        <div className="entry-head">
          <span>Player</span>
          <span>Buy-in</span>
          <span>Cash-out</span>
          <span className="num">Result</span>
          <span />
        </div>

        {rows.map((row, index) => {
          const buyIn = parseDollars(row.buyIn)
          const cashOut = parseDollars(row.cashOut)
          return (
            <div className="entry-row" key={row.key}>
              <input
                type="text"
                list="known-players"
                aria-label={`Player ${index + 1} name`}
                placeholder="Name"
                value={row.name}
                maxLength={60}
                onChange={(e) => updateRow(row.key, 'name', e.target.value)}
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Player ${index + 1} buy-in`}
                placeholder="0"
                value={row.buyIn}
                onChange={(e) => updateRow(row.key, 'buyIn', e.target.value)}
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Player ${index + 1} cash-out`}
                placeholder="0"
                value={row.cashOut}
                onChange={(e) => updateRow(row.key, 'cashOut', e.target.value)}
              />
              <span className="num result">
                {buyIn !== null && cashOut !== null && <Pnl cents={cashOut - buyIn} />}
              </span>
              <button
                type="button"
                className="remove"
                aria-label={`Remove player ${index + 1}`}
                onClick={() => removeRow(row.key)}
              >
                ×
              </button>
            </div>
          )
        })}

        <div className="entry-row totals">
          <span>Table total</span>
          <span>{formatCents(totalBuyIn)}</span>
          <span>{formatCents(totalCashOut)}</span>
          <span className="num result">
            <Pnl cents={imbalance} />
          </span>
          <span />
        </div>
      </div>

      <button type="button" className="button" onClick={addRow}>
        Add a player
      </button>

      {imbalance !== 0 && (
        <p className="notice warn">
          Cash-outs are {formatCents(imbalance)} {imbalance > 0 ? 'more' : 'less'} than
          buy-ins. A balanced table comes to $0. You can still save.
        </p>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save session'}
        </button>
        <Link to={cancelTo} className="button">
          Cancel
        </Link>
      </div>
    </form>
  )
}
