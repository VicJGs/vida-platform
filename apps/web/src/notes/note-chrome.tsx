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

/**
 * The ONE page name projection (notes-rescope R1, E-3 / BR-R1-2) — the H1, the editor accname, collection rows and card
 * names never show an empty title. A titled page shows its title. An untitled `*_note` is named by its type ("Task note"):
 * `ensureEntityNote` leaves `pages.title` null but seeds the parent's title as the body's first heading, so "Untitled …"
 * above it would be false. `parentName` names it once R7's label seam (A-33) feeds it — R1 forward obligation. Anything
 * else untitled (a freeform `note`; `journal` is always titled with its date) is "Untitled note".
 */
export function pageLabel(page: { type: string; title: string | null }, parentName?: string | null): string {
  const title = page.title?.trim()
  if (title) return title
  if (page.type.endsWith('_note')) {
    const parent = parentName?.trim()
    return parent ? `${typeLabel(page.type)} · ${parent}` : `${typeLabel(page.type)} note`
  }
  return 'Untitled note'
}
