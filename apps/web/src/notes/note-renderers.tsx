// ============================================================================
// renderNotesView — the Notes module's per-layout renderers (fe-notes-and-pages S1).
// COMPOSES the shipped @vida/ui view-mode renderers (never rebuilt) with notes' real
// row data + props. state-as-prop (BR-2). Legs NOT-48 (List·Gallery·Calendar) + NOT-49
// (Neural → empty terminal, AR-8 data-prep deferred). Icons = Lucide, tinted by token (EC-22); icons + type labels come
// from note-chrome (one set — notes-rescope R1, B-60).
// ============================================================================
import type { ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import {
  ListView, GalleryView, CalendarView, NeuralGraph, EmptyState, Card,
  type ViewLayout, type ViewState,
} from '@vida/ui'
import { Star } from 'lucide-react'
import { Icon, typeLabel } from './note-chrome'
import { pageIconFor } from './page-icons'
import { CoverImage } from './cover-image'
import type { NotesRow } from './use-notes-rows'

/** The card's full accessible name (B-63): title · type · edited · favorite — the type is dropped when the title IS the
 *  type label (an untitled page, `pageLabel`). One shared helper for list rows and gallery tiles. */
function cardName(r: NotesRow): string {
  return [r.title, r.labelFromType ? null : typeLabel(r.type), `edited ${r.updated}`, r.favorite ? 'favorite' : null]
    .filter(Boolean)
    .join(', ')
}

const Row = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8', flexWrap: 'wrap' })
const Col = styled(View, { flexDirection: 'column', gap: '$4' })

function NoteRowCard({ r, onOpen }: { r: NotesRow; onOpen: (id: string) => void }) {
  return (
    <Card interactive onPress={() => onOpen(r.id)} status={r.favorite ? 'warm' : 'neutral'} aria-label={cardName(r)}
      header={<Row><Icon icon={pageIconFor({ icon: r.icon ?? null, type: r.type })} tone="primary" /><Text fontFamily="$display" fontSize="$body" color="$colorTextPrimary">{r.title}</Text></Row>}
      actions={r.favorite ? <Icon icon={Star} tone="accent" /> : undefined}>
      <Col>
        <Text fontSize="$small" color="$colorTextMuted">{r.excerpt}</Text>
        <Text fontSize="$small" color="$colorTextMuted">{typeLabel(r.type)} · {r.updated}</Text>
      </Col>
    </Card>
  )
}

function NoteTile({ r, onOpen }: { r: NotesRow; onOpen: (id: string) => void }) {
  return (
    <Card interactive onPress={() => onOpen(r.id)} status={r.favorite ? 'warm' : 'neutral'} aria-label={cardName(r)}>
      <Col>
        {r.cover ? (
          // The tile's media area carries the cover (R3, E-4); attachment covers load once in view (R-8).
          <View height={72}>
            <CoverImage cover={r.cover} variant="tile" />
          </View>
        ) : (
          <View height={72} borderRadius="$sm" backgroundColor="$colorSurfaceSecondary" alignItems="center" justifyContent="center">
            <Icon icon={pageIconFor({ icon: r.icon ?? null, type: r.type })} size={24} />
          </View>
        )}
        <Row><Text fontFamily="$display" fontSize="$body" color="$colorTextPrimary">{r.title}</Text>{r.favorite && <Icon icon={Star} tone="accent" />}</Row>
        <Text fontSize="$small" color="$colorTextMuted">{typeLabel(r.type)} · {r.updated}</Text>
      </Col>
    </Card>
  )
}

/** Render the active layout's @vida/ui renderer with notes rows. `graph` always degrades to the `empty` terminal
 *  (AR-8 graph data-prep deferred, NOT-49) unless loading/error. `table`/`board`/`timeline` aren't offered for notes. */
export function renderNotesView(layout: ViewLayout, state: ViewState, rows: readonly NotesRow[], onOpen: (id: string) => void): ReactNode {
  switch (layout) {
    case 'gallery':
      return <GalleryView aria-label="Notes" items={rows} getKey={(r) => r.id} state={state} minTileWidth={220} renderItem={(r) => <NoteTile r={r} onOpen={onOpen} />} />
    case 'calendar':
      return <CalendarView aria-label="Notes by day" items={rows} getKey={(r) => r.id} getDate={(r) => r.date} state={state === 'empty' ? 'success' : state} renderItem={(r) => <Row><Icon icon={pageIconFor({ icon: r.icon ?? null, type: r.type })} size={12} /><Text fontSize="$small">{r.title}</Text></Row>} />
    case 'graph':
      return (
        <NeuralGraph aria-label="Notes graph" nodes={[]} edges={[]} height={380}
          state={state === 'loading' || state === 'error' ? state : 'empty'}
          empty={<EmptyState title="The graph is being prepared"><Text fontSize="$body" color="$colorTextMuted">Connections appear once link indexing is available.</Text></EmptyState>} />
      )
    case 'list':
    default:
      return <ListView aria-label="Notes" items={rows} getKey={(r) => r.id} state={state} dividers renderItem={(r) => <NoteRowCard r={r} onOpen={onOpen} />} />
  }
}
