// App shell — AR-4 (LIF-75). The provider hierarchy (BR-RT-11): gate on DB-ready + the preferences seed (R3),
// then QueryClientProvider ⊃ RouterProvider. `main.tsx` stays a bare React root.
// This is NOT the app layout/IA (UX-3) or final chrome (UI-4) — just the runtime shell.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { View } from '@tamagui/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ToastProvider, UIProvider, type ThemePreset } from '@vida/ui'
import { ensureDbReady } from './db/boot'
import { queryClient } from './lib/query-client'
import { Onboarding } from './onboarding/onboarding'
import { useFirstRun } from './onboarding/use-first-run'
import { useGuidedSetupStore } from './onboarding/guided-setup-store'
import { GuidedSetupInvitation } from './onboarding/guided-setup-entry'
import { GuidedSetupTakeover } from './onboarding/guided-setup-mount'
import { router } from './routes'
import { useThemeStore } from './stores/theme-store'
import { PreferencesBridge } from './preferences/preferences-bridge'
import { seedPreferences } from './preferences/preferences-queries'
import { paintRoot, toThemeHint } from './preferences/theme-hint'

export function App() {
  // Gate rendering on the local DB being open+migrated: React Query reads local
  // SQLite (BR-RT-3), so nothing may query before the worker is ready. The boot
  // promise is memoized, so the StrictMode double-effect opens only once (R9).
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  // preferences-rescope R3 (B2/N6): the persisted preferences are read INTO the cache before the first themed paint, so
  // the theme (derived store) and every reader (Home arrangement, F13) render the persisted value from their first frame.
  // The seed never rejects — a failed read boots on the defaults (PR-2) and Settings shows its read-only state (MUST-4).
  const [prefsSeeded, setPrefsSeeded] = useState(false)

  // UI-4 · S4: resolve first-run against the device-local marker once the DB is open. Called among the hooks
  // (before the early returns) — Rules of Hooks. `status` gates the branch below (S4-BR-c).
  const firstRun = useFirstRun(dbReady)

  // The theme selection feeds `UIProvider` (AR-4). preferences-rescope R3: `theme-store` is a DERIVED cache of the
  // persisted preferences (PR-5) — Settings writes go through the preferences writer, and the store follows the cache,
  // so the whole app still re-themes instantly (EC-5) and reverts on a failed save.
  const selection = useThemeStore((s) => s.selection)
  const setPreview = useThemeStore((s) => s.setPreview)

  // fe-onboarding S4 — the guided-setup theme picker live-previews across the app through the store's preview LAYER
  // (re-hydration never clobbers it, E8).
  const previewPreset = useCallback((preset: ThemePreset) => setPreview(preset), [setPreview])

  // fe-onboarding S4 — the guided-setup launch phase (opt-in overlay; both reach paths drive it). The post-first-run
  // invitation is offered once, right after onboarding completes.
  const guidedPhase = useGuidedSetupStore((s) => s.phase)
  const inviteGuidedSetup = useGuidedSetupStore((s) => s.invite)
  const startGuidedSetup = useGuidedSetupStore((s) => s.start)
  const dismissGuidedSetup = useGuidedSetupStore((s) => s.dismiss)

  // R3 (E8 revert): every way out of guided setup (finish · skip · close → `dismiss` → 'none') drops the preview, so the
  // app and Settings can never show different themes. Committing the pick on finish is R7's (E3); until then a finish
  // returns to the saved theme too.
  useEffect(() => {
    if (guidedPhase === 'none') setPreview(null)
  }, [guidedPhase, setPreview])

  // R3 (B6): keep the canvas (<html>) painted with the live theme. index.html's inline script painted the persisted hint
  // before React; until the seed settles `selection` is still THEME_DEFAULT, so painting then would overwrite that dark
  // canvas with light (the exact flash R3 removes) — hence the guard. After the seed the canvas follows the selection
  // (boot frame, the router-suspend window, overscroll, in-session changes). Never cleared.
  useLayoutEffect(() => {
    if (prefsSeeded) paintRoot(toThemeHint(selection))
  }, [prefsSeeded, selection])

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
        return seedPreferences(queryClient)
      })
      .then(() => {
        if (active) setPrefsSeeded(true)
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

  // The marker read (S4) and the preferences seed (R3) are part of boot: hold the same Loading surface while they resolve,
  // so the app chrome never flashes before onboarding (S4-BR-c) or in the default theme (IR-4). Then branch.
  if (!dbReady || !prefsSeeded || firstRun.status === 'resolving') {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <p>Loading…</p>
      </main>
    )
  }

  // UI-4 · S1: mount the design-system providers at the app root. UIProvider (Tamagui config/theme; selection STATE is
  // app-owned — the derived theme store, already seeded with the persisted selection, R3). ToastProvider is the singleton toast HOST —
  // it takes no children and portals to <body>, so it's a SIBLING of the app tree, inside UIProvider for the theme
  // context. The shell chrome (AppShell) mounts INSIDE the router, in routes.tsx RootComponent (it wraps the Outlet).
  //
  // UI-4 · S4: the first-run branch (FIRST_RUN_BRANCH — before <RouterProvider>). On first launch render the
  // onboarding takeover (full-viewport, OUTSIDE the router/AppShell — S4-BR-h); its completion write flips
  // `status` to 'ready', mounting the app at `/`. Onboarding needs no router.
  //
  // preferences-rescope R2: QueryClientProvider is HOISTED over both boot branches + the guided-setup overlay + the toast
  // host, so onboarding/guided-setup preference writes reach the same cache Settings reads (N7). PreferencesBridge
  // (mounted once, under it) mirrors the persisted view into the not-yet-migrated panes' store + flushes on hide.
  return (
    <UIProvider selection={selection}>
      <QueryClientProvider client={queryClient}>
        <PreferencesBridge />
        {firstRun.status === 'onboarding' ? (
          <Onboarding onComplete={handleOnboardingComplete} />
        ) : (
          <RouterProvider router={router} />
        )}

        {/* fe-onboarding S4 — the guided-setup overlay (opt-in, never a wall — IR2). A fixed, opaque takeover OVER the app
          so it never remounts the router (no lost route state); the app re-themes live behind it as the picker previews. */}
        {guidedPhase !== 'none' && (
          <View
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex="$modal"
            backgroundColor="$colorSurfacePrimary"
          >
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
      </QueryClientProvider>
    </UIProvider>
  )
}
