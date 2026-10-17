// THROWAWAY — Envision Gate harness for fe-session-hud #16 (deleted after the gate).
// Mounts the REAL AppShell (reserved top strip + hudSlot) with the greybox HUD, plus
// in-content controls: state × preset × mode. Bar-1 is a dumb occupancy stand-in
// (GlobalBar1 needs the router); the point is the strip's real crowding at 375.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Text, View } from '@tamagui/core'
import { Button, THEME_PRESETS, UIProvider, type ThemeMode, type ThemePreset } from '@vida/ui'
import '../fonts.css'
import '../index.css'
import { AppShell } from '../shell/app-shell'
import { SessionHud } from '../session-hud/session-hud'
import { sampleHudRead, type HudSampleForm } from '../session-hud/use-active-session'
import type { HudSessionsPort } from '../session-hud/types'
import { SessionHudGreybox, type HudState } from './session-hud-greybox'

// S2 Visual-Gate mode (`?real=1`): mounts the REAL SessionHud over the S1 sample reads in the REAL
// AppShell strip (no router needed — the pill's Link is exercised by unit tests; the gate measures
// rendered ink). Greybox mode stays for the envision record until S3 deletes this harness.
const REAL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('real')
const HUD_FORMS: readonly HudSampleForm[] = ['idle', 'focus', 'break', 'elapsed', 'paused', 'complete']
const gatePort: HudSessionsPort = {
  pauseFocus: async (id) => console.info(`[gate] pauseFocus(${id})`),
  resumeFocus: async (id) => console.info(`[gate] resumeFocus(${id})`),
}

function RealHudHarness({ form }: { form: HudSampleForm }) {
  // Rebuilt per form selection (fresh timestamps); stable within a selection via the state key.
  const [read] = useState(() => sampleHudRead(form, Date.now()))
  return <SessionHud read={read} port={gatePort} />
}

/** Fake Bar-1 occupancy: roughly what the strip carries at each width (scope + surfaces). */
function FakeBar1() {
  return (
    <View flexDirection="row" alignItems="center" gap="$8" opacity={0.45} aria-hidden="true">
      <Text fontSize={13} color="$colorTextMuted">
        Spaces: Personal ▾
      </Text>
      <View flex={1} />
      <Text fontSize={13} color="$colorTextMuted">
        ⌕ ⌂ ✦ ◫
      </Text>
    </View>
  )
}

function Harness() {
  const [state, setState] = useState<HudState>('running')
  const [form, setForm] = useState<HudSampleForm>('focus')
  const [preset, setPreset] = useState<ThemePreset>(THEME_PRESETS[0])
  const [mode, setMode] = useState<ThemeMode>('light')

  return (
    <UIProvider selection={{ preset, mode, density: 'calm' }}>
      <AppShell
        bar1Slot={<FakeBar1 />}
        hudSlot={
          REAL ? (
            <RealHudHarness key={form} form={form} />
          ) : (
            <SessionHudGreybox
              state={state}
              onTogglePause={() => setState((s) => (s === 'paused' ? 'running' : 'paused'))}
            />
          )
        }
      >
        <View padding="$24" gap="$16" maxWidth={640}>
          <Text fontSize={22}>Envision — Session HUD (#16)</Text>
          <Text color="$colorTextMuted">
            The HUD lives hard-right in the reserved top strip. Resize to 375 / 768 / 1440; flip state, preset, mode.
          </Text>
          <View flexDirection="row" gap="$8" flexWrap="wrap">
            {REAL
              ? HUD_FORMS.map((f) => (
                  <Button key={f} size="sm" intent={form === f ? 'primary' : 'ghost'} onPress={() => setForm(f)}>
                    {f}
                  </Button>
                ))
              : (['idle', 'running', 'paused'] as const).map((s) => (
                  <Button key={s} size="sm" intent={state === s ? 'primary' : 'ghost'} onPress={() => setState(s)}>
                    {s}
                  </Button>
                ))}
          </View>
          <View flexDirection="row" gap="$8" flexWrap="wrap">
            {THEME_PRESETS.map((p) => (
              <Button key={p} size="sm" intent={preset === p ? 'primary' : 'ghost'} onPress={() => setPreset(p)}>
                {p}
              </Button>
            ))}
            <Button size="sm" intent="ghost" onPress={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}>
              {mode === 'light' ? 'dark mode' : 'light mode'}
            </Button>
          </View>
        </View>
      </AppShell>
    </UIProvider>
  )
}

// The REAL SessionHud renders a TanStack Link → it needs a router context. A minimal memory router
// whose root component IS the harness (the test-router pattern); /sessions/$id registered so the pill's
// href builds. The greybox path rides along harmlessly.
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

const rootRoute = createRootRoute({ component: Harness })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$id',
  component: () => null,
})
const harnessRouter = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, sessionsRoute]),
  history: createMemoryHistory({ initialEntries: ['/'] }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={harnessRouter} />
  </StrictMode>,
)
