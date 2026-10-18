// ============================================================================
// usePageMetadata — the note-page metadata DATA seam (fe-notes #27, S6). Reflects the
// page's {favorite, archived, icon, cover} synchronously (no async read); the mutations
// patch via `updatePage` (stubbed M1 — no live composition root; the S4 pick/create
// precedent). Favorite/archived feed `listPages` filters live (NOT-47).
//
// Live swap (zero signature change):
//   toggleFavorite → notes.updatePage(page.id, { is_favorite: !page.favorite })
//   toggleArchive  → notes.updatePage(page.id, { is_archived: !page.archived })
//   changeIcon/changeCover → notes.updatePage(page.id, { icon } / { cover_image }) [picker/library M1.1+, D-S6-6]
//   each invalidates ['pages', page.id].
// ============================================================================
import type { NoteEntityData } from './use-note-entity'

export interface PageMetadata {
  favorite: boolean
  archived: boolean
  icon: string | null
  cover: string | null
  toggleFavorite: () => Promise<void>
  toggleArchive: () => Promise<void>
  changeIcon: () => Promise<void>
  changeCover: () => Promise<void>
}

/** Reflects `page` metadata + stubbed `updatePage` mutations (no-op M1; live persists — see the header recipe). */
export function usePageMetadata(page: NoteEntityData): PageMetadata {
  const noop = async (): Promise<void> => {}
  return {
    favorite: page.favorite,
    archived: page.archived,
    icon: page.icon,
    cover: page.cover,
    toggleFavorite: noop,
    toggleArchive: noop,
    changeIcon: noop,
    changeCover: noop,
  }
}
