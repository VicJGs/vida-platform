// App-shell UI store — AR-4 (LIF-75). The reference Zustand store + the pattern
// each feature follows (`stores/<feature>-ui-store.ts`, engineering §XVII).
//
// Zustand holds ONLY ephemeral UI state (BR-RT-6): sidebar/panel state, nav
// selection, view mode, filters, selections. It must NEVER hold entity data or
// persisted preferences — those are React Query over local SQLite (BR-RT-1/7).
import { create } from 'zustand'
import { DEFAULT_PLACEMENT, type PanelEdge, type PanelId, type PanelMode, type ShellPlacement } from '../shell/regions'

// The full ShellUIStateContract (shell/regions.ts) UI-4 implements: `isSidebarOpen` (desktop sidebar
// expanded/collapsed) + `isMobileNavOpen` (the mobile off-canvas dock drawer). Ephemeral UI state only —
// never entity data or persisted prefs. The current breakpoint is read via Tamagui `useMedia()`, NOT stored.
//
// fe-shell (#14) extends this with the dock⇄float `placement` — the session ARRANGEMENT of the two nav panels. Panel
// arrangement is ephemeral UI (BR-RT-6 explicitly permits "sidebar/panel state"); the DURABLE part (persisting it to
// `nav_preferences`) is a deferred `ProviderRead` seam (`shell/shell-prefs.ts`) hydrated via `setPlacement` — M1 stubs
// to DEFAULT, so the store never itself touches a persisted-pref table (BR-RT-7 honoured). The old sidebar/mobile-nav
// fields remain until S2 reshapes `app-shell.tsx` onto `placement`.
interface AppShellUIState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  isMobileNavOpen: boolean
  toggleMobileNav: () => void
  setMobileNavOpen: (open: boolean) => void
  // fe-shell (#14) — dock⇄float panel arrangement
  placement: ShellPlacement
  togglePanel: (id: PanelId) => void
  setPanelMode: (id: PanelId, mode: PanelMode) => void
  setPanelEdge: (id: PanelId, edge: PanelEdge) => void
  setPlacement: (placement: ShellPlacement) => void
}

// zustand v5 curried form (`create<T>()(...)`) for correct TS inference.
export const useAppShellUIStore = create<AppShellUIState>()((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  isMobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ isMobileNavOpen: !s.isMobileNavOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  placement: DEFAULT_PLACEMENT,
  togglePanel: (id) => set((s) => ({ placement: { ...s.placement, [id]: { ...s.placement[id], open: !s.placement[id].open } } })),
  setPanelMode: (id, mode) => set((s) => ({ placement: { ...s.placement, [id]: { ...s.placement[id], mode } } })),
  setPanelEdge: (id, edge) => set((s) => ({ placement: { ...s.placement, [id]: { ...s.placement[id], edge } } })),
  setPlacement: (placement) => set({ placement }),
}))
