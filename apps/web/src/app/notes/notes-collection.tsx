// ============================================================================
// Notes collection — MOD-notes ② · B1 (LIF-131). The `/notes` surface: the four
// hard-coded baseline renderers (List/Gallery/Calendar/Neural, @vida/ui) behind
// an ephemeral Tabs view-switch, over one unfiltered live-notes read, with the
// four terminal states derived app-side (BR-B1-1) and a New Note create-CTA
// (EC-4/EC-5). Composes UI-1/UI-2 primitives — builds no @vida/ui, no new token.
//
// Deferred to later slices (per the envision EC map): real editor + rail + delete
// (B2), `[[` (B3), panels (B4), graph EDGES + node fan-out (B5 — B1 is nodes-only,
// BR-B1-9), create-with-tags + filters (B6), journal summary (B7), saved-view
// selection (MOD-spaces). Row open + New Note navigate to `/note/$id` (the B1
// enabling stub).
// ============================================================================

import { useMemo, type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Card,
  Tabs,
  ListView,
  GalleryView,
  CalendarView,
  NeuralGraph,
} from '@vida/ui'
import type { PageRow } from '@vida/core'
import { deriveTerminalState } from '../../state-conventions/terminal-state'
import { useNotesList, useCreateNote, useNotesGraphEdges } from './use-notes-list'
import { useNotesViewStore, type NotesView } from '../../stores/notes-view-store'

const VIEW_ITEMS: ReadonlyArray<{ value: NotesView; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'neural', label: 'Neural' },
]

// Column shell — token spacing only (4pt grid via the $space scale; design §IV).
const Root = styled(View, { flexDirection: 'column', gap: '$16', padding: '$16' })
const HeaderBar = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$12',
})
// Real heading element (§XIV: focus-to-main-heading on page nav). `render:'h2'` emits an <h2> — a runtime `tag`
// prop is NOT honoured (the dialog.tsx DialogTitle + onboarding Heading precedent). Matches the in-shell page
// convention (the index route + the AR-4 Notes stub both used <h2>).
const Title = styled(Text, { render: 'h2', fontFamily: '$heading', fontSize: '$heading', color: '$colorTextPrimary' })
const EmptyStack = styled(View, { flexDirection: 'column', alignItems: 'center', gap: '$12', paddingVertical: '$24' })
const EmptyText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted' })

const pageTitle = (p: PageRow): string => p.title ?? '(untitled)'
const getKey = (p: PageRow): string => p.id

export function NotesCollection(): ReactNode {
  const query = useNotesList()
  const create = useCreateNote()
  const navigate = useNavigate()
  const view = useNotesViewStore((s) => s.view)
  const setView = useNotesViewStore((s) => s.setView)

  // App derives the terminal state (isPending-first) + passes it to each view (BR-B1-1/2).
  const state = deriveTerminalState(query, (rows) => rows.length === 0)
  const items = query.data ?? []

  // B5 — Neural page-link edges: a getPageLinksFrom fan-out over the node set, lazily fetched only for the Neural
  // view (BR-B5-3). `edges` is additive — the graph's `state` stays node-driven; an edge error degrades to nodes-only
  // (`?? []`), never blanking the graph (BR-B5-4).
  const nodeIds = useMemo(() => items.map((p) => p.id), [items])
  const edgesQuery = useNotesGraphEdges(nodeIds, view === 'neural')

  const openRow = (id: string): void => {
    void navigate({ to: '/note/$id', params: { id } })
  }
  const handleCreate = (): void => {
    create.mutate()
  }

  // One clickable row (LV-5: the consumer composes the interactive Card; @vida/ui owns the listitem wrapper).
  const renderRow = (item: PageRow): ReactNode => (
    <Card interactive onPress={() => openRow(item.id)}>
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
        {pageTitle(item)}
      </Text>
    </Card>
  )

  // EC-5: the empty state carries a create-CTA (list/gallery; Calendar/Neural fold empty into their own render).
  const emptyCTA: ReactNode = (
    <EmptyStack>
      <EmptyText>No notes yet.</EmptyText>
      <Button onPress={handleCreate} loading={create.isPending}>
        Create your first note
      </Button>
    </EmptyStack>
  )

  return (
    <Root>
      <HeaderBar>
        <Title>Notes</Title>
        <Button onPress={handleCreate} loading={create.isPending}>
          New Note
        </Button>
      </HeaderBar>

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as NotesView)}
        items={VIEW_ITEMS}
        aria-label="Notes views"
      >
        <Tabs.Panel value="list">
          <ListView
            items={items}
            renderItem={renderRow}
            getKey={getKey}
            state={state}
            empty={emptyCTA}
            aria-label="Notes, list view"
          />
        </Tabs.Panel>

        <Tabs.Panel value="gallery">
          <GalleryView
            items={items}
            renderItem={renderRow}
            getKey={getKey}
            state={state}
            empty={emptyCTA}
            aria-label="Notes, gallery view"
          />
        </Tabs.Panel>

        <Tabs.Panel value="calendar">
          <CalendarView
            items={items}
            renderItem={renderRow}
            getKey={getKey}
            getDate={(p) => new Date(p.created_at)}
            state={state}
            aria-label="Notes, calendar view"
          />
        </Tabs.Panel>

        <Tabs.Panel value="neural">
          <NeuralGraph
            nodes={items.map((p) => ({ id: p.id, label: pageTitle(p) }))}
            edges={edgesQuery.data ?? []}
            state={state}
            onNodeClick={openRow}
            aria-label="Notes, neural view"
          />
        </Tabs.Panel>
      </Tabs>
    </Root>
  )
}

export default NotesCollection
