import { describe, it, expect, beforeEach } from 'vitest'
import { useAppShellUIStore } from './app-shell-ui-store'

describe('app-shell UI store (Zustand — UI state only, BR-RT-6)', () => {
  beforeEach(() => useAppShellUIStore.setState({ isSidebarOpen: true }))

  it('toggles the sidebar', () => {
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(true)
    useAppShellUIStore.getState().toggleSidebar()
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(false)
  })

  it('sets the sidebar explicitly', () => {
    useAppShellUIStore.getState().setSidebarOpen(false)
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(false)
  })
})
