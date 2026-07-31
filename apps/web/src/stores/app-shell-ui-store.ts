// App-shell UI store — AR-4 (LIF-75). The reference Zustand store + the pattern
// each feature follows (`stores/<feature>-ui-store.ts`, engineering §XVII).
//
// Zustand holds ONLY ephemeral UI state (BR-RT-6): sidebar/panel state, nav
// selection, view mode, filters, selections. It must NEVER hold entity data or
// persisted preferences — those are React Query over local SQLite (BR-RT-1/7).
import { create } from 'zustand'

interface AppShellUIState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

// zustand v5 curried form (`create<T>()(...)`) for correct TS inference.
export const useAppShellUIStore = create<AppShellUIState>()((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}))
