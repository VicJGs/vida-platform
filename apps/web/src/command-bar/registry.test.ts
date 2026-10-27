import { describe, it, expect } from 'vitest'
import { createCommandRegistry, createNavProvider, navProvider, shellActionsProvider } from './registry'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import type { CommandProvider } from './types'

describe('createCommandRegistry', () => {
  it('merges commands from multiple providers (21 nav + 1 shell action)', () => {
    const registry = createCommandRegistry()
    registry.register(navProvider)
    registry.register(shellActionsProvider)
    const commands = registry.collect()
    expect(commands).toHaveLength(22)
    expect(commands.some((c) => c.id === 'action:toggle-sidebar')).toBe(true)
  })

  it('applies frecency ranking so a pinned command leads', () => {
    const registry = createCommandRegistry()
    const provider: CommandProvider = {
      id: 'test',
      getCommands: () => [
        { id: 'a', label: 'A', category: 'action', run: () => {} },
        { id: 'b', label: 'B', category: 'action', run: () => {} },
      ],
    }
    registry.register(provider)
    const ranked = registry.collect(
      [{ command_key: 'b', command_label: 'B', command_category: null, use_count: 1, last_used_at: 0, is_pinned: 1 }],
      1000,
    )
    expect(ranked[0]?.id).toBe('b')
  })

  it('seeds only "Toggle sidebar" — no theme toggle (D4 guard)', () => {
    const ids = shellActionsProvider.getCommands().map((c) => c.id)
    expect(ids).toEqual(['action:toggle-sidebar'])
  })

  it('the shell action toggles the already-built sidebar state', () => {
    const before = useAppShellUIStore.getState().isSidebarOpen
    shellActionsProvider.getCommands()[0]?.run({ navigate: () => {} })
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(!before)
  })

  it('createNavProvider(prefs) feeds the registry the filtered nav commands (R5)', () => {
    const registry = createCommandRegistry()
    registry.register(createNavProvider({ visibility: { tasks: false }, names: { notes: 'Pages' } }))
    const commands = registry.collect()
    expect(commands.some((c) => c.id === 'nav:/tasks')).toBe(false)
    expect(commands.find((c) => c.id === 'nav:/notes')?.label).toBe('Pages')
  })
})
