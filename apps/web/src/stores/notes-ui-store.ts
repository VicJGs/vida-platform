// Notes UI store — MOD-notes ②b (LIF-131). Ephemeral client UI state for the
// notes collection surface (BR-RT-6): the active view mode of the multi-mode top
// view. NEVER entity data or persisted prefs — the saved (persistent) views-row
// is deferred (ADR-007); this is the ephemeral "open view" (structure-data.md:36).
import { create } from 'zustand'

export type NotesView = 'list' | 'gallery' | 'neural'

interface NotesUIState {
  activeNotesView: NotesView
  setActiveNotesView: (view: NotesView) => void
}

// zustand v5 curried form (`create<T>()(...)`) for correct TS inference.
export const useNotesUiStore = create<NotesUIState>()((set) => ({
  activeNotesView: 'list', // default (NC-2)
  setActiveNotesView: (view) => set({ activeNotesView: view }),
}))
