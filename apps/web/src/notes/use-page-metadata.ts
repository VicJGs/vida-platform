// ============================================================================
// usePageMetadata — the note page's metadata + rename WRITES (notes-rescope R3, PLAN-R3 G1–G3/G12 · IMPL R-10).
// One `useMutation` over `notes.updatePage(id, patch)` — favorite · archive · icon · cover · title. No optimistic patch:
// on success invalidate, then the re-read shows the state (NP-11 / BR-RT-2). Archiving keeps the open page (IR-R7).
// Keys (G2): every write → ['pages', id] + ['notes','pages'] (+ ['journal', date] for a journal page); a rename also →
// the forward keys ['pages','resolve'] + ['links','backlinks'] (title search / backlink rows, live at R7).
// A failure → one toast naming the action (BR-R1-7). While a write is in flight further writes are ignored (R-10 — the
// re-read hasn't landed, so a quick double toggle would write the same value twice); the controls stay focusable.
// Rename (NoteEntityView) and the controls (MetadataControls) are separate instances — R-10 holds per instance; the
// two write different fields, so neither needs to wait for the other.
// ============================================================================
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { notifyError } from '../lib/notify-error'
import type { NoteEntityData } from './use-note-entity'

export interface PageMetadata {
  favorite: boolean
  archived: boolean
  icon: string | null
  cover: string | null
  toggleFavorite: () => void
  toggleArchive: () => void
  setIcon: (name: string | null) => void
  setCover: (ref: string | null) => void
  /** Rename; an empty (trimmed) title stores null — the page shows its label fallback (G12). */
  rename: (next: string) => void
  isPending: boolean
}

type Patch = { is_favorite?: boolean; is_archived?: boolean; icon?: string | null; cover_image?: string | null; title?: string | null }
interface Write {
  patch: Patch
  /** The verb phrase for the failure toast ("Couldn’t …"). */
  action: string
  rename?: boolean
  /** A toggle — dropped while a write is pending (R-10). Picker/rename writes are never dropped. */
  toggle?: boolean
}

export function usePageMetadata(page: NoteEntityData): PageMetadata {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: async ({ patch }: Write) => (await getServices()).notes.updatePage(page.id, patch),
    onSuccess: (_row, { rename }) => {
      void qc.invalidateQueries({ queryKey: ['pages', page.id] })
      void qc.invalidateQueries({ queryKey: ['notes', 'pages'] })
      if (page.journalDate) void qc.invalidateQueries({ queryKey: ['journal', page.journalDate] })
      if (rename) {
        void qc.invalidateQueries({ queryKey: ['pages', 'resolve'] })
        void qc.invalidateQueries({ queryKey: ['links', 'backlinks'] })
      }
    },
    onError: (e, { action }) => notifyError(action, e),
  })
  const write = (w: Write) => {
    if (w.toggle && m.isPending) return // R-10: only a toggle is guarded (its re-read hasn't landed)
    m.mutate(w)
  }
  return {
    favorite: page.favorite,
    archived: page.archived,
    icon: page.icon,
    cover: page.cover,
    toggleFavorite: () => write({ patch: { is_favorite: !page.favorite }, action: 'favorite the page', toggle: true }),
    toggleArchive: () => write({ patch: { is_archived: !page.archived }, action: 'archive the page', toggle: true }),
    setIcon: (name) => write({ patch: { icon: name }, action: 'change the icon' }),
    setCover: (ref) => write({ patch: { cover_image: ref }, action: 'change the cover' }),
    rename: (next) => {
      const title = next.trim()
      write({ patch: { title: title === '' ? null : title }, action: 'rename the page', rename: true })
    },
    isPending: m.isPending,
  }
}
