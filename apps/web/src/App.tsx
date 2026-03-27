import { APP_NAME } from '@vida/core'

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{APP_NAME}</h1>
      <p>Zero-knowledge, local-first life management platform.</p>
    </main>
  )
}
