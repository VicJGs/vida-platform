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
