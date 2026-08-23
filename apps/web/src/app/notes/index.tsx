// Notes collection route — MOD-notes ②b (LIF-131). Replaces the AR-4 stub. The
// `/notes` surface: `note`-type pages (NC-1) rendered through the shipped UI-2
// views, switched by the ephemeral `hasMultiModeTopView` selector (NC-2). Terminal
// state comes from the ②a data plane (`usePagesByType('note').state`, NC-3), never
// re-derived. Creation is the command-bar action (NC-9), not a header button.
// Neural degrades to empty (graph-prep deferred, NC-5). Token-only → dark-capable.
import { useState } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button, CalendarView, ListView, GalleryView, NeuralGraph, toast } from '@vida/ui'
import { useNavigate } from '@tanstack/react-router'
import { usePagesByType, useCreatePage } from './hooks'
import { useNotesUiStore } from '../../stores/notes-ui-store'
import { NotesViewSwitcher } from './view-switcher'
import { NoteCard } from './note-card'

// A real <h1> — a runtime `role`/`tag` on Text is NOT honoured; `render` emits the
// element (the onboarding.tsx / dialog.tsx precedent).
const PageHeading = styled(Text, { render: 'h1' })

/** Create a `note` page and open it (shared by the header button + the empty-state button). */
function useCreateNote() {
  const navigate = useNavigate()
  const createPage = useCreatePage()
  const create = () =>
    createPage.mutate(
      { type: 'note' },
      {
        onSuccess: (page) => navigate({ to: '/note/$id', params: { id: page.id } }),
        onError: () => toast({ title: 'Could not create note', intent: 'danger' }),
      },
    )
  return { create, pending: createPage.isPending }
}

export default function NotesRoute() {
  const activeView = useNotesUiStore((s) => s.activeNotesView)
  const { data, state } = usePagesByType('note')
  const notes = data ?? []
  const { create, pending } = useCreateNote()
  const navigate = useNavigate()
  const [calMonth, setCalMonth] = useState<Date | undefined>(undefined)

  return (
    <View padding="$16" gap="$16">
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="$12"
        flexWrap="wrap"
      >
        <PageHeading fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
          Notes
        </PageHeading>
        <View flexDirection="row" alignItems="center" gap="$8">
          <NotesViewSwitcher />
          <Button size="sm" onPress={create} loading={pending}>
            New note
          </Button>
        </View>
      </View>

      {activeView === 'list' && (
        <ListView
          items={notes}
          state={state}
          getKey={(p) => p.id}
          renderItem={(p) => <NoteCard page={p} />}
          empty={<EmptyNotes onCreate={create} pending={pending} />}
          aria-label="Notes"
        />
      )}

      {activeView === 'gallery' && (
        <GalleryView
          items={notes}
          state={state}
          getKey={(p) => p.id}
          renderItem={(p) => <NoteCard page={p} />}
          empty={<EmptyNotes onCreate={create} pending={pending} />}
          aria-label="Notes"
        />
      )}

      {activeView === 'calendar' && (
        <CalendarView
          items={notes}
          state={state}
          getKey={(p) => p.id}
          getDate={(p) => new Date(p.created_at)}
          month={calMonth}
          onMonthChange={setCalMonth}
          renderItem={(p) => (
            <Text
              fontFamily="$body"
              fontSize="$caption"
              color="$colorTextPrimary"
              numberOfLines={1}
              cursor="pointer"
              onPress={() => navigate({ to: '/note/$id', params: { id: p.id } })}
            >
              {p.title != null && p.title !== '' ? p.title : 'Untitled'}
            </Text>
          )}
          aria-label="Notes calendar"
        />
      )}

      {activeView === 'neural' && <NeuralGraph nodes={[]} edges={[]} state="empty" />}
    </View>
  )
}

/** The empty state — a "New note" button (F2) + the ⌘K hint. */
function EmptyNotes({ onCreate, pending }: { onCreate: () => void; pending: boolean }) {
  return (
    <View role="status" padding="$24" alignItems="center" gap="$12">
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
        No notes yet
      </Text>
      <Button onPress={onCreate} loading={pending}>
        New note
      </Button>
      <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        or press ⌘K → “New note”.
      </Text>
    </View>
  )
}
