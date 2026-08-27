// ============================================================================
// Notes collection — MOD-notes ② · B1 + B5 + B6 (LIF-131). The `/notes` surface:
// the four hard-coded baseline renderers (List/Gallery/Calendar/Neural, @vida/ui)
// behind an ephemeral Tabs view-switch, over a FILTERED live-notes read, with the
// four terminal states derived app-side (BR-B1-1), a New Note create-with-tags
// flow (EC-8), and the favorite/archived/tag filter bar (EC-9). Composes UI-1/UI-2
// primitives — builds no @vida/ui, no new token.
//
// B6 adds: the filter bar (3 explicit "show only" toggles → ① listPages) + the
// create-with-tags Dialog (title + TagPicker → createPage then tagEntity, BR-B6-4).
// The nestable color/icon tags-BROWSER + saved views stay MOD-spaces ②.
// ============================================================================

import { useMemo, useState, type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Card,
  Dialog,
  Input,
  Menu,
  Tabs,
  ListView,
  GalleryView,
  CalendarView,
  NeuralGraph,
  type MenuItem,
} from '@vida/ui'
import type { PageRow } from '@vida/core'
import { deriveTerminalState } from '../../state-conventions/terminal-state'
import { useNotesList, useCreateNoteWithTags, useNotesGraphEdges } from './use-notes-list'
import { useTags } from './use-tags'
import { TagPicker } from './tag-picker'
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
const FilterBar = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8', flexWrap: 'wrap' })
const Title = styled(Text, { render: 'h2', fontFamily: '$heading', fontSize: '$heading', color: '$colorTextPrimary' })
const EmptyStack = styled(View, { flexDirection: 'column', alignItems: 'center', gap: '$12', paddingVertical: '$24' })
const EmptyText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted' })
const DialogField = styled(View, { flexDirection: 'column', gap: '$8', paddingVertical: '$8' })

const pageTitle = (p: PageRow): string => p.title ?? '(untitled)'
const getKey = (p: PageRow): string => p.id

export function NotesCollection(): ReactNode {
  const view = useNotesViewStore((s) => s.view)
  const setView = useNotesViewStore((s) => s.setView)
  const filter = useNotesViewStore((s) => s.filter)
  const setFilter = useNotesViewStore((s) => s.setFilter)

  const query = useNotesList(filter)
  const create = useCreateNoteWithTags()
  const tagsQuery = useTags()
  const navigate = useNavigate()

  // App derives the terminal state (isPending-first) + passes it to each view (BR-B1-1/2).
  const state = deriveTerminalState(query, (rows) => rows.length === 0)
  const items = query.data ?? []

  // B5 — Neural page-link edges over the (now FILTERED) node set, lazily fetched only for the Neural view.
  const nodeIds = useMemo(() => items.map((p) => p.id), [items])
  const edgesQuery = useNotesGraphEdges(nodeIds, view === 'neural')

  // ── create-with-tags Dialog state (EC-8) ────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTagIds, setNewTagIds] = useState<string[]>([])

  const openCreate = (): void => {
    setNewTitle('')
    setNewTagIds([])
    setCreateOpen(true)
  }

  const confirmCreate = (): void => {
    // BR-B6-4: the hook creates THEN tags (per-tag failure toasts, note survives); on resolve we close + navigate.
    create.mutate(
      { title: newTitle.trim() || null, tagIds: newTagIds },
      {
        onSuccess: (page) => {
          setCreateOpen(false)
          void navigate({ to: '/note/$id', params: { id: page.id } })
        },
      },
    )
  }

  const openRow = (id: string): void => {
    void navigate({ to: '/note/$id', params: { id } })
  }

  // One clickable row (LV-5: the consumer composes the interactive Card; @vida/ui owns the listitem wrapper).
  const renderRow = (item: PageRow): ReactNode => (
    <Card interactive onPress={() => openRow(item.id)}>
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
        {item.icon ? `${item.icon} ` : ''}
        {pageTitle(item)}
      </Text>
    </Card>
  )

  // EC-5: the empty state carries a create-CTA (list/gallery; Calendar/Neural fold empty into their own render).
  const emptyCTA: ReactNode = (
    <EmptyStack>
      <EmptyText>No notes yet.</EmptyText>
      <Button onPress={openCreate}>Create your first note</Button>
    </EmptyStack>
  )

  // ── the filter bar (EC-9): 3 explicit "show only" controls → ① listPages params (BR-B6-2) ─────────────
  const tags = tagsQuery.data ?? []
  const activeTag = filter.tag != null ? tags.find((t) => t.id === filter.tag) : undefined
  const tagFilterItems: MenuItem[] = [
    { id: '__all', label: 'All tags', onSelect: () => setFilter({ ...filter, tag: undefined }) },
    ...tags.map((t) => ({ id: t.id, label: t.name, onSelect: () => setFilter({ ...filter, tag: t.id }) })),
  ]

  return (
    <Root>
      <HeaderBar>
        <Title>Notes</Title>
        <Button onPress={openCreate}>New Note</Button>
      </HeaderBar>

      <FilterBar role="group" aria-label="Filter notes">
        <Button
          intent={filter.favorite ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={filter.favorite === true}
          onPress={() => setFilter({ ...filter, favorite: filter.favorite ? undefined : true })}
        >
          ★ Favorites
        </Button>
        <Button
          intent={filter.archived ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={filter.archived === true}
          onPress={() => setFilter({ ...filter, archived: filter.archived ? undefined : true })}
        >
          Archived
        </Button>
        <Menu
          trigger={
            <Button intent={activeTag ? 'secondary' : 'ghost'} size="sm" aria-label="Filter by tag">
              {activeTag ? `Tag: ${activeTag.name}` : 'Tag'}
            </Button>
          }
          items={tagFilterItems}
          aria-label="Filter by tag"
        />
      </FilterBar>

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

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New note"
        description="Give it a title and tags, or just create a blank note."
        footer={
          <>
            <Button intent="secondary" onPress={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onPress={confirmCreate}>
              Create
            </Button>
          </>
        }
      >
        <DialogField>
          <Input value={newTitle} onChangeText={setNewTitle} placeholder="Untitled" aria-label="New note title" />
          {/* inline (no portalled Popover) — a Popover here would portal to <body> and its pointerdown would dismiss
              this modal Dialog (Visual-Gate catch). */}
          <TagPicker value={newTagIds} onChange={setNewTagIds} inline />
        </DialogField>
      </Dialog>
    </Root>
  )
}

export default NotesCollection
