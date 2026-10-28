import { describe, it, expect, beforeEach } from 'vitest'
import { useAppShellUIStore } from './app-shell-ui-store'

describe('app-shell UI store (Zustand — UI state only, BR-RT-6)', () => {
  beforeEach(() => useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false }))

  it('toggles the sidebar', () => {
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(true)
    useAppShellUIStore.getState().toggleSidebar()
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(false)
  })

  it('sets the sidebar explicitly', () => {
    useAppShellUIStore.getState().setSidebarOpen(false)
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(false)
  })

  // UI-4 · S1 — the mobile off-canvas dock drawer half of ShellUIStateContract.
  it('defaults the mobile nav closed', () => {
    expect(useAppShellUIStore.getState().isMobileNavOpen).toBe(false)
  })

  it('toggles the mobile nav', () => {
    useAppShellUIStore.getState().toggleMobileNav()
    expect(useAppShellUIStore.getState().isMobileNavOpen).toBe(true)
    useAppShellUIStore.getState().toggleMobileNav()
    expect(useAppShellUIStore.getState().isMobileNavOpen).toBe(false)
  })

  it('sets the mobile nav explicitly', () => {
    useAppShellUIStore.getState().setMobileNavOpen(true)
    expect(useAppShellUIStore.getState().isMobileNavOpen).toBe(true)
  })

  // The two flags are independent — sidebar (desktop) vs mobile drawer never alias.
  it('keeps sidebar and mobile-nav state independent', () => {
    useAppShellUIStore.getState().setMobileNavOpen(true)
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(true)
    useAppShellUIStore.getState().setSidebarOpen(false)
    expect(useAppShellUIStore.getState().isMobileNavOpen).toBe(true)
  })
})

// fe-shell (#14) — the dock⇄float panel arrangement half of the store (ephemeral UI; nav_preferences persistence deferred)
describe('app-shell UI store — panel placement (fe-shell #14)', () => {
  beforeEach(() =>
    useAppShellUIStore.setState({
      placement: {
        system: { mode: 'dock', edge: 'left', open: false },
        modules: { mode: 'dock', edge: 'left', open: false },
      },
    }),
  )

  it('defaults both panels closed, docked left', () => {
    expect(useAppShellUIStore.getState().placement.modules).toEqual({ mode: 'dock', edge: 'left', open: false })
  })

  it('toggles one panel open without touching the other', () => {
    useAppShellUIStore.getState().togglePanel('modules')
    expect(useAppShellUIStore.getState().placement.modules.open).toBe(true)
    expect(useAppShellUIStore.getState().placement.system.open).toBe(false)
  })

  it('sets a panel mode (dock⇄float) independently', () => {
    useAppShellUIStore.getState().setPanelMode('modules', 'float')
    expect(useAppShellUIStore.getState().placement.modules.mode).toBe('float')
    expect(useAppShellUIStore.getState().placement.system.mode).toBe('dock')
  })

  it('rearranges a panel to any edge (incl. bottom)', () => {
    useAppShellUIStore.getState().setPanelEdge('system', 'bottom')
    expect(useAppShellUIStore.getState().placement.system.edge).toBe('bottom')
  })

  it('hydrates the whole placement (the nav_preferences stub path)', () => {
    useAppShellUIStore.getState().setPlacement({
      system: { mode: 'float', edge: 'right', open: true },
      modules: { mode: 'dock', edge: 'top', open: false },
    })
    expect(useAppShellUIStore.getState().placement.system).toEqual({ mode: 'float', edge: 'right', open: true })
  })
})
