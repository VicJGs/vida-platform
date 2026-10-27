import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { PomodoroWidget, type PomodoroPhase } from './pomodoro-widget'

// UI-2 · V5 · pomodoro-widget stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A self-timing countdown WIDGET; the session engine (sequencing/persistence/effects) is deferred (MOD-sessions) —
// here the callbacks are the seam.
//
// MEASURE (v5 §4 + fe-codec-controls-refinement P1): mm:ss counts DOWN drift-free after Start · progress indicator
// (bar OR ring) grows · controls swap by status · Skip/Reset → idle · completion message + holds 00:00 · phase label ·
// dark mode. P1 REFINEMENT to grade at the gate: **tabular figures** (the countdown holds a fixed digit advance, no
// jitter) · **eyebrow phase** (uppercase/tracked/caption) · **ring** (progress=ring; accent arc FLIPS with preset+mode —
// reader oxblood / quietDesk olive / dark — proving useTheme-resolved, not frozen) · **resting elevation**.

const PHASES: PomodoroPhase[] = ['focus', 'short-break', 'long-break']

type PlaygroundArgs = {
  phase: PomodoroPhase
  durationSec: number
  autoStart: boolean
  label: string
  progress: 'bar' | 'ring'
}
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Pomodoro',
  argTypes: {
    phase: { control: 'select', options: PHASES },
    durationSec: { control: { type: 'range', min: 5, max: 1500, step: 5 } },
    autoStart: { control: 'boolean' },
    label: { control: 'text' },
    progress: { control: 'inline-radio', options: ['bar', 'ring'] },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

// Playground — click Start and watch it count down (set a short durationSec, e.g. 10, to see completion quickly).
export const Playground: Story = {
  args: { phase: 'focus', durationSec: 60, autoStart: false, label: 'Design review', progress: 'bar' },
  render: (args) => (
    <View width={280}>
      <PomodoroWidget
        durationMs={args.durationSec * 1000}
        phase={args.phase}
        label={args.label || undefined}
        autoStart={args.autoStart}
        progress={args.progress}
        aria-label="Pomodoro"
      />
    </View>
  ),
}

// P1 Visual-Gate surface — bar vs ring side by side (idle). The gate drives Start/Pause to sample running/paused and
// reads the ring's computed `stroke` (accent, flips with preset+mode) + `stroke-dashoffset` (arc grows). autoStart so a
// partial arc/fill is visible in a static capture.
export const ProgressForms: Story = {
  render: () => (
    <View flexDirection="row" gap={32} flexWrap="wrap">
      <View width={260}>
        <PomodoroWidget
          durationMs={60_000}
          phase="focus"
          label="Linear bar"
          autoStart
          progress="bar"
          aria-label="Pomodoro bar"
        />
      </View>
      <View width={260}>
        <PomodoroWidget
          durationMs={60_000}
          phase="focus"
          label="Progress ring"
          autoStart
          progress="ring"
          aria-label="Pomodoro ring"
        />
      </View>
    </View>
  ),
}

// The three phases side by side (idle).
export const Phases: Story = {
  render: () => (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      {PHASES.map((p) => (
        <View key={p} width={260}>
          <PomodoroWidget
            durationMs={(p === 'focus' ? 25 : p === 'short-break' ? 5 : 15) * 60 * 1000}
            phase={p}
            aria-label="Pomodoro"
          />
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
