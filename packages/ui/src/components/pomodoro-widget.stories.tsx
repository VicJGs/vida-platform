import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { PomodoroWidget, type PomodoroPhase } from './pomodoro-widget'

// UI-2 · V5 · pomodoro-widget stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A self-timing countdown WIDGET; the session engine (sequencing/persistence/effects) is deferred (MOD-sessions) —
// here the callbacks are the seam.
//
// MEASURE (v5-pomodoro-widget.md §4): the mm:ss counts DOWN drift-free after Start · progress fill grows · controls
// swap by status (Start → Pause/Skip → Resume/Reset/Skip) · Skip/Reset return to idle · completion shows a message +
// the timer holds 00:00 · phase label · dark mode · a short `durationSec` makes it watchable at the gate.

const PHASES: PomodoroPhase[] = ['focus', 'short-break', 'long-break']

type PlaygroundArgs = { phase: PomodoroPhase; durationSec: number; autoStart: boolean; label: string }
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Pomodoro',
  argTypes: {
    phase: { control: 'select', options: PHASES },
    durationSec: { control: { type: 'range', min: 5, max: 1500, step: 5 } },
    autoStart: { control: 'boolean' },
    label: { control: 'text' },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

// Playground — click Start and watch it count down (set a short durationSec, e.g. 10, to see completion quickly).
export const Playground: Story = {
  args: { phase: 'focus', durationSec: 60, autoStart: false, label: 'Design review' },
  render: (args) => (
    <View width={280}>
      <PomodoroWidget
        durationMs={args.durationSec * 1000}
        phase={args.phase}
        label={args.label || undefined}
        autoStart={args.autoStart}
        aria-label="Pomodoro"
      />
    </View>
  ),
}

// The three phases side by side (idle).
export const Phases: Story = {
  render: () => (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      {PHASES.map((p) => (
        <View key={p} width={260}>
          <PomodoroWidget durationMs={(p === 'focus' ? 25 : p === 'short-break' ? 5 : 15) * 60 * 1000} phase={p} aria-label="Pomodoro" />
        </View>
      ))}
    </View>
  ),
}

// A wired session — onComplete advances focus → short-break → focus (the engine's job, demoed here with a wrapper).
// Short demo durations so the cycle is watchable.
const CYCLE: Record<PomodoroPhase, { next: PomodoroPhase; sec: number }> = {
  focus: { next: 'short-break', sec: 10 },
  'short-break': { next: 'focus', sec: 5 },
  'long-break': { next: 'focus', sec: 8 },
}
function SessionDemo() {
  const [phase, setPhase] = useState<PomodoroPhase>('focus')
  return (
    <View width={280} gap={8}>
      <PomodoroWidget
        durationMs={CYCLE[phase].sec * 1000}
        phase={phase}
        autoStart
        onComplete={() => setPhase(CYCLE[phase].next)}
        aria-label="Pomodoro session"
      />
    </View>
  )
}
export const WiredSession: Story = { render: () => <SessionDemo /> }
