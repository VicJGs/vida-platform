// ============================================================================
// Notes view store — MOD-notes ② · B1 (LIF-131). Ephemeral "open view" UI state
// (BR-B1-3): which of the 4 hard-coded renderers is active. Zustand holds ONLY
// ephemeral UI state (BR-RT-6 / engineering §XVII) — never entity data (that is
// React Query, `use-notes-list.ts`) and never a persisted view (saved-view
// SELECTION is the deferred ADR-007 MOD-spaces system). Mirrors the reference
// store `stores/app-shell-ui-store.ts`. Zustand v5 curried form for TS inference.
// ============================================================================

import { create } from 'zustand'

export type NotesView = 'list' | 'gallery' | 'calendar' | 'neural'

interface NotesViewState {
  view: NotesView
  setView: (view: NotesView) => void
}

export const useNotesViewStore = create<NotesViewState>()((set) => ({
  view: 'list',
  setView: (view) => set({ view }),
}))
