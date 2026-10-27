// Command registry — collects commands from registered providers and ranks them by frecency. Built-in providers:
// `createNavProvider(prefs?)` (module-map through the user's nav prefs, preferences-rescope R5; `navProvider` = no prefs)
// + `shellActionsProvider` seed = "Toggle sidebar" ONLY (already-built shell state, D4 — NO theme toggle: no theme store
// existed when it was seeded). Modules contribute more action providers at M1.1+.
// Imports `stores/app-shell-ui-store` (both built, same app — a legitimate intra-app dependency, IMPL-PLAN §4a-F3).
import type { Command, CommandProvider, CommandHistoryEntry } from './types'
import { deriveNavCommands } from './nav-commands'
import type { NavPrefs } from '../nav/nav-prefs'
import { rankByFrecency } from './frecency'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'

export interface CommandRegistry {
  register: (provider: CommandProvider) => void
  collect: (history?: CommandHistoryEntry[], now?: number) => Command[]
}

export function createCommandRegistry(): CommandRegistry {
  const providers: CommandProvider[] = []
  return {
    register: (provider) => {
      providers.push(provider)
    },
    collect: (history = [], now = 0) => {
      const commands = providers.flatMap((p) => p.getCommands())
      return rankByFrecency(commands, history, now)
    },
  }
}

/** The nav provider over the user's module prefs (preferences-rescope R5) — the ⌘K host builds one per prefs change. */
export function createNavProvider(prefs?: NavPrefs): CommandProvider {
  return { id: 'nav', getCommands: () => deriveNavCommands(undefined, undefined, prefs) }
}

export const navProvider: CommandProvider = createNavProvider()

export const shellActionsProvider: CommandProvider = {
  id: 'shell-actions',
  getCommands: () => [
    {
      id: 'action:toggle-sidebar',
      label: 'Toggle sidebar',
      category: 'action',
      run: () => useAppShellUIStore.getState().toggleSidebar(),
    },
  ],
}
