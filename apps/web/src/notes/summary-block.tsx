// ============================================================================
// SummaryBlock — the `/summary` block render (fe-notes-and-pages #27, S5; EC-9/EC-15).
// Renders the MOD-journals engine's `buildDashboard().summary: SectionData[]` — each
// section by its engine-produced `state`, so a failing source degrades THAT section
// only, never the whole block (NOT-34). Split (the BacklinksView precedent): SummaryView
// is pure presentational (state-as-prop); SummaryBlock is the thin hook shell.
//
// `SectionData.items` is OPAQUE (unknown[]) — this renders the section FRAME + the
// human-readable `dataPoints[].label`s GENERICALLY; the rich per-module body is each
// module's ② / the ui-3 inline editor node (F-S5-1), not fe-notes.
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import {
  CircleDot, GraduationCap, ListChecks, RefreshCw, Repeat, Smile, Target, Timer, Trophy, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { SectionData } from '@vida/core'
import { Eyebrow, Icon, Row } from './note-chrome'
import { useJournalSummary, type SummaryState } from './use-journal-summary'

function Muted({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

const MODULE_ICON: Record<string, LucideIcon> = {
  habits: Repeat,
  tasks: ListChecks,
  routines: RefreshCw,
  learning: GraduationCap,
  finance: Wallet,
  relationships: Users,
  checkins: Smile,
  purpose: Target,
  gamification: Trophy,
  pomodoro: Timer,
}
const moduleIcon = (m: string): LucideIcon => MODULE_ICON[m] ?? CircleDot
const moduleLabel = (m: string): string => (m.length === 0 ? m : m[0].toUpperCase() + m.slice(1))

/** One summary section, rendered by its engine-produced terminal state (per-section degrade — EC-9/NOT-34). */
function SummarySection({ section }: { section: SectionData }) {
  const label = moduleLabel(section.module)
  let body: ReactNode
  if (section.state === 'error') body = <Muted role="status">Couldn’t load {label}.</Muted>
  else if (section.state === 'empty') body = <Muted>No {label} today.</Muted>
  else if (section.state === 'loading') body = <Muted busy>Loading…</Muted>
  else
    body = (
      <View role="list" gap="$2">
        {section.dataPoints.map((dp) => (
          <Text key={dp.id} role="listitem" fontSize="$body" color="$colorTextPrimary">
            {dp.label}
          </Text>
        ))}
      </View>
    )
  return (
    <View gap="$4">
      <Row>
        <Icon icon={moduleIcon(section.module)} />
        <Eyebrow>{label}</Eyebrow>
      </Row>
      {body}
    </View>
  )
}

/** Pure presentational — block ladder as props (no hook, no env). */
export function SummaryView({ sections, state }: { sections: readonly SectionData[]; state: SummaryState }) {
  if (state === 'loading') return <Muted busy>Loading…</Muted>
  if (state === 'error') return <Muted role="status">Couldn’t load your summary.</Muted>
  if (state === 'empty')
    return <Muted>Your daily summary appears here once sources are connected.</Muted>
  return (
    <View gap="$16">
      {sections.map((section) => (
        <SummarySection key={section.module} section={section} />
      ))}
    </View>
  )
}

/** The hook-wired shell: reads the journals engine seam, delegates to the pure view. */
export function SummaryBlock({ date }: { date: string | null }) {
  const { sections, state } = useJournalSummary(date)
  return <SummaryView sections={sections} state={state} />
}
