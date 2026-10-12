// App shell — AR-4 (LIF-75). The provider hierarchy (BR-RT-11): gate on DB-ready,
// then QueryClientProvider ⊃ RouterProvider. `main.tsx` stays a bare React root.
// This is NOT the app layout/IA (UX-3) or final chrome (UI-4) — just the runtime shell.
import { useCallback, useEffect, useState } from 'react'
import { View } from '@tamagui/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { THEME_DEFAULT, ToastProvider, UIProvider, type ThemePreset, type ThemeSelection } from '@vida/ui'
import { ensureDbReady } from './db/boot'
import { queryClient } from './lib/query-client'
import { Onboarding } from './onboarding/onboarding'
import { useFirstRun } from './onboarding/use-first-run'
import { useGuidedSetupStore } from './onboarding/guided-setup-store'
import { GuidedSetupInvitation } from './onboarding/guided-setup-entry'
import { GuidedSetupTakeover } from './onboarding/guided-setup-mount'
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

  // fe-onboarding S4 — the app-owned theme selection STATE (minimal; the full Zustand switcher store stays deferred to
  // Settings/fe-codec). Making it stateful here is what lets the guided-setup theme picker LIVE-PREVIEW across the app.
  const [selection, setSelection] = useState<ThemeSelection>(THEME_DEFAULT)
  const previewPreset = useCallback((preset: ThemePreset) => setSelection((s) => ({ ...s, preset })), [])

  // fe-onboarding S4 — the guided-setup launch phase (opt-in overlay; both reach paths drive it). The post-first-run
  // invitation is offered once, right after onboarding completes.
  const guidedPhase = useGuidedSetupStore((s) => s.phase)
  const inviteGuidedSetup = useGuidedSetupStore((s) => s.invite)
  const startGuidedSetup = useGuidedSetupStore((s) => s.start)
  const dismissGuidedSetup = useGuidedSetupStore((s) => s.dismiss)

  // Wrap the onboarding handoff: write the marker (flips to the app) THEN offer guided setup. A rejecting markComplete
  // throws before invite(), so onboarding's own retry still fires (no invitation on a failed completion).
  const handleOnboardingComplete = useCallback(async () => {
    await firstRun.markComplete()
    inviteGuidedSetup()
  }, [firstRun, inviteGuidedSetup])

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
    <UIProvider selection={selection}>
      {firstRun.status === 'onboarding' ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )}

      {/* fe-onboarding S4 — the guided-setup overlay (opt-in, never a wall — IR2). A fixed, opaque takeover OVER the app
          so it never remounts the router (no lost route state); the app re-themes live behind it as the picker previews. */}
      {guidedPhase !== 'none' && (
        <View position="fixed" top={0} left={0} right={0} bottom={0} zIndex="$modal" backgroundColor="$colorSurfacePrimary">
          {guidedPhase === 'invited' ? (
            <GuidedSetupInvitation onStart={startGuidedSetup} onSkip={dismissGuidedSetup} />
          ) : (
            <GuidedSetupTakeover
              mode={selection.mode}
              initialPreset={selection.preset}
              onPreview={previewPreset}
              onClose={dismissGuidedSetup}
            />
          )}
        </View>
      )}

      <ToastProvider />
    </UIProvider>
  )
}
