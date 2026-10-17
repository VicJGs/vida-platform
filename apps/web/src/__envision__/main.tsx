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
import { SessionHudGreybox, type HudState } from './session-hud-greybox'

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
  const [preset, setPreset] = useState<ThemePreset>(THEME_PRESETS[0])
  const [mode, setMode] = useState<ThemeMode>('light')

  return (
    <UIProvider selection={{ preset, mode, density: 'calm' }}>
      <AppShell
        bar1Slot={<FakeBar1 />}
        hudSlot={
          <SessionHudGreybox
            state={state}
            onTogglePause={() => setState((s) => (s === 'paused' ? 'running' : 'paused'))}
          />
        }
      >
        <View padding="$24" gap="$16" maxWidth={640}>
          <Text fontSize={22}>Envision — Session HUD (#16)</Text>
          <Text color="$colorTextMuted">
            The HUD lives hard-right in the reserved top strip. Resize to 375 / 768 / 1440; flip state, preset, mode.
          </Text>
          <View flexDirection="row" gap="$8" flexWrap="wrap">
            {(['idle', 'running', 'paused'] as const).map((s) => (
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
