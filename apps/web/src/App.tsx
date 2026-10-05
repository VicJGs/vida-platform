// App shell — AR-4 (LIF-75). The provider hierarchy (BR-RT-11): gate on DB-ready,
// then QueryClientProvider ⊃ RouterProvider. `main.tsx` stays a bare React root.
// This is NOT the app layout/IA (UX-3) or final chrome (UI-4) — just the runtime shell.
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { THEME_DEFAULT, ToastProvider, UIProvider } from '@vida/ui'
import { ensureDbReady } from './db/boot'
import { queryClient } from './lib/query-client'
import { Onboarding } from './onboarding/onboarding'
import { useFirstRun } from './onboarding/use-first-run'
import { router } from './routes'

export function App() {
  // Gate rendering on the local DB being open+migrated: React Query reads local
  // SQLite (BR-RT-3), so nothing may query before the worker is ready. The boot
  // promise is memoized, so the StrictMode double-effect opens only once (R9).
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  // UI-4 · S4: resolve first-run against the device-local marker once the DB is open. Called among the hooks
  // (before the early returns) — Rules of Hooks. `status` gates the branch below (S4-BR-c).
  const firstRun = useFirstRun(dbReady)

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

  // The marker read (S4) is part of boot: hold the same Loading surface while it resolves, so the app chrome
  // never flashes before onboarding (S4-BR-c). Only after `resolving` clears do we branch.
  if (!dbReady || firstRun.status === 'resolving') {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <p>Loading…</p>
      </main>
    )
  }

  // UI-4 · S1: mount the design-system providers at the app root. UIProvider (Tamagui config/theme; selection STATE is
  // app-owned — fed the cold-start THEME_DEFAULT here, Editorial+light+calm; the Zustand store + switcher arrive with
  // Settings — fe-codec S3 / R5) wraps the app. ToastProvider is the singleton toast HOST —
  // it takes no children and portals to <body>, so it's a SIBLING of the app tree, inside UIProvider for the theme
  // context. The shell chrome (AppShell) mounts INSIDE the router, in routes.tsx RootComponent (it wraps the Outlet).
  //
  // UI-4 · S4: the first-run branch (FIRST_RUN_BRANCH — before <RouterProvider>). On first launch render the
  // onboarding takeover (full-viewport, OUTSIDE the router/AppShell — S4-BR-h); its completion write flips
  // `status` to 'ready', mounting the app at `/`. Onboarding needs neither the router nor the query client.
  return (
    <UIProvider selection={THEME_DEFAULT}>
      {firstRun.status === 'onboarding' ? (
        <Onboarding onComplete={firstRun.markComplete} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )}
      <ToastProvider />
    </UIProvider>
  )
}
