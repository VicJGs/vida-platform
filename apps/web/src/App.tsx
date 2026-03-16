import { getAppInfo } from '@vida/core'

export function App() {
  const info = getAppInfo()

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{info.name}</h1>
      <p>Version {info.version}</p>
      <p>Zero-knowledge, local-first life management platform.</p>
      <p style={{ color: '#888', fontSize: '0.875rem' }}>Pipeline deployment verified.</p>
    </main>
  )
}
