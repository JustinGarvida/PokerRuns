import { formatPnl } from '../money.js'

export default function Pnl({ cents }) {
  const tone = cents > 0 ? 'up' : cents < 0 ? 'down' : 'flat'
  return <span className={`pnl ${tone}`}>{formatPnl(cents)}</span>
}
