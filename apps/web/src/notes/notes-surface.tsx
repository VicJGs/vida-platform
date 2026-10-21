// ============================================================================
// NotesSurface — the `/notes` Top view (fe-notes-and-pages #27, S1). COMPOSES @vida/ui
// `CollectionView` + the generic `useCollection` view-config hook + `renderNotesView` +
// the `useNotesRows` data seam. First CollectionView consumer in apps/web.
//
// Layouts offered (surface-map:48 — Notes top): List · Gallery · Calendar · Neural.
// Data is M1-default empty (live swap drop-in — useNotesRows / useCollection); the
// `?sample` DEV param drives populated layouts for the blocking Visual Gate.
// ============================================================================
import type { ResolvedView } from '@vida/core'
import type { ViewLayout } from '@vida/types'
import { useNavigate } from '@tanstack/react-router'
import { View } from '@tamagui/core'
import { Button, CollectionView } from '@vida/ui'
import { useCollection } from '../collection/use-collection'
import { NotesSearch } from './notes-search'
import { renderNotesView } from './note-renderers'
import { useNotesRows } from './use-notes-rows'
import { useCreateNote } from './use-create-note'

const NOTES_LAYOUTS: readonly ViewLayout[] = ['list', 'gallery', 'calendar', 'graph']

export function NotesSurface() {
  const col = useCollection('notes-default', NOTES_LAYOUTS)
  const { rows, state } = useNotesRows()
  const { createNote, isPending } = useCreateNote()
  const navigate = useNavigate()
  // BR-NEU-1: a collection row/tile opens its entity page.
  const onOpen = (id: string) => navigate({ to: '/notes/$id', params: { id } })
  // M1: the surface owns the data leg (default empty / dev sample). Live: `resolved` comes from
  // useQuery(['views','resolve','notes-default']) → ViewEngine.resolve — drop-in, no render change.
  const resolved: ResolvedView = { rows: rows as unknown[], groups: [], state, degraded: [] }

  // S7: the notes search box rides ABOVE the collection in a column; the collection keeps flex:1/minHeight:0 so it
  // still fills (the RNW flex-collapse guard — a flex:1 child collapses to 0 height in a column parent).
  return (
    <View flex={1} minHeight={0} gap="$12">
      <View flexDirection="row" justifyContent="flex-end">
        <Button intent="primary" size="small" onPress={() => createNote()} disabled={isPending}>
          New note
        </Button>
      </View>
      <NotesSearch />
      <View flex={1} minHeight={0}>
        <CollectionView
          title="Notes"
          aria-label="Notes collection"
          {...col.chromeFor(resolved)}
          onLayoutChange={col.onLayoutChange}
          onFilter={col.onFilter}
          onSort={col.onSort}
          onNewView={col.onNewView}
          renderView={(layout, viewState) => renderNotesView(layout, viewState, rows, onOpen)}
        />
      </View>
    </View>
  )
}

export default NotesSurface
