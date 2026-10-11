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
import { CollectionView } from '@vida/ui'
import { useCollection } from '../collection/use-collection'
import { renderNotesView } from './note-renderers'
import { useNotesRows } from './use-notes-rows'

const NOTES_LAYOUTS: readonly ViewLayout[] = ['list', 'gallery', 'calendar', 'graph']

export function NotesSurface() {
  const col = useCollection('notes-default', NOTES_LAYOUTS)
  const { rows, state } = useNotesRows()
  // M1: the surface owns the data leg (default empty / dev sample). Live: `resolved` comes from
  // useQuery(['views','resolve','notes-default']) → ViewEngine.resolve — drop-in, no render change.
  const resolved: ResolvedView = { rows: rows as unknown[], groups: [], state, degraded: [] }

  return (
    <CollectionView
      title="Notes"
      aria-label="Notes collection"
      {...col.chromeFor(resolved)}
      onLayoutChange={col.onLayoutChange}
      onFilter={col.onFilter}
      onSort={col.onSort}
      onNewView={col.onNewView}
      renderView={(layout, viewState) => renderNotesView(layout, viewState, rows)}
    />
  )
}

export default NotesSurface
