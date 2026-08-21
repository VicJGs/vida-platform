// Notes collection route — MOD-notes ②b (LIF-131). Replaces the AR-4 stub. The
// `/notes` surface: `note`-type pages (NC-1) rendered through the shipped UI-2
// views, switched by the ephemeral `hasMultiModeTopView` selector (NC-2). Terminal
// state comes from the ②a data plane (`usePagesByType('note').state`, NC-3), never
// re-derived. Creation is the command-bar action (NC-9), not a header button.
// Neural degrades to empty (graph-prep deferred, NC-5). Token-only → dark-capable.
import { styled, Text, View } from '@tamagui/core'
import { ListView, GalleryView, NeuralGraph } from '@vida/ui'
import { usePagesByType } from './hooks'
import { useNotesUiStore } from '../../stores/notes-ui-store'
import { NotesViewSwitcher } from './view-switcher'
import { NoteCard } from './note-card'

// A real <h1> — a runtime `role`/`tag` on Text is NOT honoured; `render` emits the
// element (the onboarding.tsx / dialog.tsx precedent).
const PageHeading = styled(Text, { render: 'h1' })

export default function NotesRoute() {
  const activeView = useNotesUiStore((s) => s.activeNotesView)
  const { data, state } = usePagesByType('note')
  const notes = data ?? []

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
        <NotesViewSwitcher />
      </View>

      {activeView === 'list' && (
        <ListView
          items={notes}
          state={state}
          getKey={(p) => p.id}
          renderItem={(p) => <NoteCard page={p} />}
          empty={<EmptyNotes />}
          aria-label="Notes"
        />
      )}

      {activeView === 'gallery' && (
        <GalleryView
          items={notes}
          state={state}
          getKey={(p) => p.id}
          renderItem={(p) => <NoteCard page={p} />}
          empty={<EmptyNotes />}
          aria-label="Notes"
        />
      )}

      {activeView === 'neural' && <NeuralGraph nodes={[]} edges={[]} state="empty" />}
    </View>
  )
}

/** The empty-state copy (⌘K → "New note" to create the first). */
function EmptyNotes() {
  return (
    <View role="status" padding="$24" alignItems="center" gap="$4">
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
        No notes yet
      </Text>
      <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        Press ⌘K → “New note” to create one.
      </Text>
    </View>
  )
}
