// App shell — AR-4 (LIF-75). The provider hierarchy (BR-RT-11): gate on DB-ready,
// then QueryClientProvider ⊃ RouterProvider. `main.tsx` stays a bare React root.
// This is NOT the app layout/IA (UX-3) or final chrome (UI-4) — just the runtime shell.
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ToastProvider, UIProvider } from '@vida/ui'
import { ensureDbReady } from './db/boot'
import { queryClient } from './lib/query-client'
import { router } from './routes'

export function App() {
  // Gate rendering on the local DB being open+migrated: React Query reads local
  // SQLite (BR-RT-3), so nothing may query before the worker is ready. The boot
  // promise is memoized, so the StrictMode double-effect opens only once (R9).
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setDbError(null)
    ensureDbReady()
      .then(() => {
        if (active) setDbReady(true)
      })
      .catch((e: unknown) => {
        // Open can reject (WASM load, migration error). Surface it with a retry
        // instead of an unhandled rejection + a permanent "Loading…" (MUST-4).
        if (active) setDbError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      active = false
    }
  }, [attempt])

  if (dbError) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <p>Failed to open the local database: {dbError.message}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </main>
    )
  }

  if (!dbReady) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <p>Loading…</p>
      </main>
    )
  }

  // UI-4 · S1: mount the design-system providers at the app root. UIProvider (Tamagui config/theme; theme STATE is
  // app-owned, light-only in M1.0 — no theme store yet) wraps the app. ToastProvider is the singleton toast HOST —
  // it takes no children and portals to <body>, so it's a SIBLING of the app tree, inside UIProvider for the theme
  // context. The shell chrome (AppShell) mounts INSIDE the router, in routes.tsx RootComponent (it wraps the Outlet).
  return (
    <UIProvider theme="light">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
      <ToastProvider />
    </UIProvider>
  )
}
