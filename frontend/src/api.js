import { useEffect, useState } from 'react'

function errorMessage(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ msg: "Value error, ..." }, ...]
    return detail.map((d) => d.msg.replace(/^Value error, /, '')).join('. ')
  }
  return `Request failed (${status})`
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error("Can't reach the server. Check that the backend is running.")
  }
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  return body
}

export const api = {
  leaderboard: () => request('/leaderboard'),
  sessions: () => request('/sessions'),
  session: (id) => request(`/sessions/${id}`),
  createSession: (data) =>
    request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id, data) =>
    request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  players: () => request('/players'),
  player: (id) => request(`/players/${id}`),
}

// Loads data when the component mounts or `deps` change.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  useEffect(() => {
    let live = true
    setState({ data: null, error: null, loading: true })
    loader().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error) => live && setState({ data: null, error, loading: false }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
