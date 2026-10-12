// ============================================================================
// note-chrome — shared presentational atoms for the note-entity surfaces
// (fe-notes-and-pages #27, S2). The EC-22 icon-tint + eyebrow idiom, extracted at
// the rule of three (note-renderers S1 + notion-header + note-overview). Icons are
// Lucide, tinted by a theme token via a CSS var (the gated S1 note-renderers pattern).
// ============================================================================
import { styled, Text, View } from '@tamagui/core'
import {
  StickyNote, CalendarClock, ListChecks, FolderKanban, Flag, Package, type LucideIcon,
} from 'lucide-react'

/** A horizontal icon+text row (the S1 note-renderers `Row` idiom). */
export const Row = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8' })

/** A section eyebrow — uppercase caption label (the house list-view idiom; EC-19 inline sections, no boxes). */
export const Eyebrow = styled(Text, {
  fontSize: '$caption',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
})

export type IconTone = 'muted' | 'primary' | 'accent'

/** A Lucide icon tinted by a theme token (EC-22). Mirrors the gated S1 note-renderers helper:
 *  a CSS-var color so the tint tracks the active preset/mode. */
export function Icon({ icon: Ico, size = 16, tone = 'muted' }: { icon: LucideIcon; size?: number; tone?: IconTone }) {
  const color =
    tone === 'accent' ? 'var(--colorBrandEmphasis)' : tone === 'primary' ? 'var(--colorTextPrimary)' : 'var(--colorTextMuted)'
  return <Ico size={size} color={color} strokeWidth={2} />
}

const TYPE_ICON: Record<string, LucideIcon> = {
  note: StickyNote,
  journal: CalendarClock,
  task_note: ListChecks,
  task_group_note: FolderKanban,
  milestone_note: Flag,
  deliverable_note: Package,
}
export const typeIcon = (t: string): LucideIcon => TYPE_ICON[t] ?? StickyNote

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  journal: 'Journal',
  task_note: 'Task',
  task_group_note: 'Task group',
  milestone_note: 'Milestone',
  deliverable_note: 'Deliverable',
}
export const typeLabel = (t: string): string => TYPE_LABEL[t] ?? t
