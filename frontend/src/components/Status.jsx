// Shown while a page's data is loading or when loading failed.
export default function Status({ loading, error }) {
  if (loading) return <p className="status">Loading…</p>
  if (error) {
    return (
      <p className="status error" role="alert">
        {error.message}
      </p>
    )
  }
  return null
}
