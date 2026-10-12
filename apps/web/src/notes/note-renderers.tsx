// ============================================================================
// renderNotesView — the Notes module's per-layout renderers (fe-notes-and-pages S1).
// COMPOSES the shipped @vida/ui view-mode renderers (never rebuilt) with notes' real
// row data + props. state-as-prop (BR-2). Legs NOT-48 (List·Gallery·Calendar) + NOT-49
// (Neural → empty terminal, AR-8 data-prep deferred). Icons = Lucide, tinted by token (EC-22).
// ============================================================================
import type { ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import {
  ListView, GalleryView, CalendarView, NeuralGraph, EmptyState, Card,
  type ViewLayout, type ViewState,
} from '@vida/ui'
import { StickyNote, CalendarClock, ListChecks, FolderKanban, Flag, Package, Star, type LucideIcon } from 'lucide-react'
import type { NotesRow } from './use-notes-rows'

const TYPE_ICON: Record<string, LucideIcon> = {
  note: StickyNote, journal: CalendarClock, task_note: ListChecks,
  task_group_note: FolderKanban, milestone_note: Flag, deliverable_note: Package,
}
const typeIcon = (t: string): LucideIcon => TYPE_ICON[t] ?? StickyNote
const TYPE_LABEL: Record<string, string> = {
  note: 'Note', journal: 'Journal', task_note: 'Task note',
  task_group_note: 'Group note', milestone_note: 'Milestone note', deliverable_note: 'Deliverable note',
}
const typeLabel = (t: string): string => TYPE_LABEL[t] ?? t

function Icon({ icon: Ico, size = 16, tone = 'muted' }: { icon: LucideIcon; size?: number; tone?: 'muted' | 'primary' | 'accent' }) {
  const color = tone === 'accent' ? 'var(--colorBrandEmphasis)' : tone === 'primary' ? 'var(--colorTextPrimary)' : 'var(--colorTextMuted)'
  return <Ico size={size} color={color} strokeWidth={2} />
}

const Row = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8', flexWrap: 'wrap' })
const Col = styled(View, { flexDirection: 'column', gap: '$4' })

function NoteRowCard({ r }: { r: NotesRow }) {
  return (
    <Card interactive onPress={() => {}} status={r.favorite ? 'warm' : 'neutral'} aria-label={r.title}
      header={<Row><Icon icon={typeIcon(r.type)} tone="primary" /><Text fontFamily="$display" fontSize="$body" color="$colorTextPrimary">{r.title}</Text></Row>}
      actions={r.favorite ? <Icon icon={Star} tone="accent" /> : undefined}>
      <Col>
        <Text fontSize="$small" color="$colorTextMuted">{r.excerpt}</Text>
        <Text fontSize="$small" color="$colorTextMuted">{typeLabel(r.type)} · {r.updated}</Text>
      </Col>
    </Card>
  )
}

function NoteTile({ r }: { r: NotesRow }) {
  return (
    <Card interactive onPress={() => {}} status={r.favorite ? 'warm' : 'neutral'} aria-label={r.title}>
      <Col>
        <View height={72} borderRadius="$sm" backgroundColor="$colorSurfaceSecondary" alignItems="center" justifyContent="center">
          <Icon icon={typeIcon(r.type)} size={24} />
        </View>
        <Row><Text fontFamily="$display" fontSize="$body" color="$colorTextPrimary">{r.title}</Text>{r.favorite && <Icon icon={Star} tone="accent" />}</Row>
        <Text fontSize="$small" color="$colorTextMuted">{typeLabel(r.type)} · {r.updated}</Text>
      </Col>
    </Card>
  )
}

/** Render the active layout's @vida/ui renderer with notes rows. `graph` always degrades to the `empty` terminal
 *  (AR-8 graph data-prep deferred, NOT-49) unless loading/error. `table`/`board`/`timeline` aren't offered for notes. */
export function renderNotesView(layout: ViewLayout, state: ViewState, rows: readonly NotesRow[]): ReactNode {
  switch (layout) {
    case 'gallery':
      return <GalleryView aria-label="Notes" items={rows} getKey={(r) => r.id} state={state} minTileWidth={220} renderItem={(r) => <NoteTile r={r} />} />
    case 'calendar':
      return <CalendarView aria-label="Notes by day" items={rows} getKey={(r) => r.id} getDate={(r) => r.date} state={state === 'empty' ? 'success' : state} renderItem={(r) => <Row><Icon icon={typeIcon(r.type)} size={12} /><Text fontSize="$small">{r.title}</Text></Row>} />
    case 'graph':
      return (
        <NeuralGraph aria-label="Notes graph" nodes={[]} edges={[]} height={380}
          state={state === 'loading' || state === 'error' ? state : 'empty'}
          empty={<EmptyState title="The graph is being prepared"><Text fontSize="$body" color="$colorTextMuted">Connections appear once link indexing is available.</Text></EmptyState>} />
      )
    case 'list':
    default:
      return <ListView aria-label="Notes" items={rows} getKey={(r) => r.id} state={state} dividers renderItem={(r) => <NoteRowCard r={r} />} />
  }
}
