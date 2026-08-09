// Command-bar UI store — UX-2 (LIF-91). Ephemeral UI state ONLY (BR-RT-6): open flag, query, mode. Never entity
// data, never persisted (the AR-4 `app-shell-ui-store` pattern). Mode auto-switches to 'search' while the query
// is non-empty, back to 'command' when cleared (the two-mode transition, PLAN §2a). Focus-restore-to-trigger on
// close is a documented contract UI-4 honors; the store only signals closed.
import { create } from 'zustand'

export type CommandBarMode = 'command' | 'search'

interface CommandBarUIState {
  isOpen: boolean
  query: string
  mode: CommandBarMode
  open: () => void
  close: () => void
  setQuery: (query: string) => void
}

export const useCommandBarUIStore = create<CommandBarUIState>()((set) => ({
  isOpen: false,
  query: '',
  mode: 'command',
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '', mode: 'command' }),
  setQuery: (query) => set({ query, mode: query.length > 0 ? 'search' : 'command' }),
}))
