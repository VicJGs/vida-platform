// ============================================================================
// Notes view store — MOD-notes ② · B1 + B6 (LIF-131). Ephemeral "open view" UI
// state (BR-B1-3/BR-B6-2): which of the 4 hard-coded renderers is active + the
// collection filter. Zustand holds ONLY ephemeral UI state (BR-RT-6 / engineering
// §XVII) — never entity data (that is React Query, `use-notes-list.ts`) and never
// a persisted view (saved-view SELECTION is the deferred ADR-007 MOD-spaces
// system). Mirrors `stores/app-shell-ui-store.ts`. Zustand v5 curried form.
//
// B6 · the filter maps 1:1 to the ① `listPages({favorite,archived,tag})` params
// (BR-B6-2) — three explicit "show only" toggles, default `{}` (B1's unfiltered
// set, byte-for-byte; no invented default-hide-archived).
// ============================================================================

import { create } from 'zustand'

export type NotesView = 'list' | 'gallery' | 'calendar' | 'neural'

/** The collection filter — the exact ① `listPages` filter shape (BR-B6-2). */
export interface NotesFilter {
  favorite?: boolean
  archived?: boolean
  tag?: string
}

interface NotesViewState {
  view: NotesView
  setView: (view: NotesView) => void
  filter: NotesFilter
  setFilter: (filter: NotesFilter) => void
}

export const useNotesViewStore = create<NotesViewState>()((set) => ({
  view: 'list',
  setView: (view) => set({ view }),
  filter: {},
  setFilter: (filter) => set({ filter }),
}))
