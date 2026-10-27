// ============================================================================
// ⌘K command history — preferences-rescope R5 (LIF-247), PLAN-R5 R5-BR-6/7, IMPL-PLAN §B.
//
// The ONE write path for `command_bar_history` (the preferences writer covers the two singletons; this covers the
// palette's history). Both service ops read-then-write (`recordCommand` creates over a UNIQUE key; `pinCommand` updates
// or creates), so every op rides ONE promise chain: two quick first runs of a command can't collide, and a pin pressed
// before that command's first record settled runs after it. Recording is BEST-EFFORT — the command already ran; a
// failure is logged, never thrown or toasted. A pin resolves true/false so the palette can announce the outcome.
// After each op the history query is invalidated — fire-and-forget: `invalidateQueries` awaits the refetch
// (query-core 5.101.4 queryClient.js:148-179), and chaining on a read would stall every later write.
// One chain is enough: only one tab owns the DB (the OPFS access-handle pool is exclusive, R1-BR-8).
// ============================================================================

import type { QueryClient } from '@tanstack/react-query'
import type { PreferencesService } from '@vida/core'
import type { Command, CommandHistoryEntry } from '../command-bar/types'
import { queryClient as appQueryClient } from '../lib/query-client'
import { COMMANDS_KEY } from './preferences-keys'

/** What a history op needs from a command (the palette passes the live command — its label is the display label). */
export type HistoryCommand = Pick<Command, 'id' | 'label' | 'category'>

/** The `command_bar_history` fields the palette reads (the service returns the Drizzle row; its type isn't in the core
 *  barrel — DB-11 reconciles the `@vida/types` interface). */
interface HistoryRowLike {
  command_key: string
  command_label: string
  command_category: string | null
  use_count: number
  last_used_at: number | null
  is_pinned: boolean
}

/** The service row → the palette contract (`is_pinned` boolean → the v1 `0 | 1` `rankByFrecency` keys on). */
export function toHistoryEntry(row: HistoryRowLike): CommandHistoryEntry {
  return {
    command_key: row.command_key,
    command_label: row.command_label,
    command_category: row.command_category,
    use_count: row.use_count,
    last_used_at: row.last_used_at,
    is_pinned: row.is_pinned ? 1 : 0,
  }
}

export interface CommandHistoryOptions {
  getService: () => Promise<PreferencesService>
  queryClient: QueryClient
  log: (message: string, error: unknown) => void
}

export interface CommandHistory {
  /** Best-effort: never rejects, returns nothing. Call AFTER the command ran. */
  record: (command: HistoryCommand) => void
  /** Resolves `true` when the pin was written, `false` when it failed (already logged). Never rejects. */
  pin: (command: HistoryCommand, pinned: boolean) => Promise<boolean>
  /** Resolves when every op queued so far has settled (tests + the Visual Gate harness). */
  idle: () => Promise<void>
}

export function createCommandHistory({ getService, queryClient, log }: CommandHistoryOptions): CommandHistory {
  let tail: Promise<unknown> = Promise.resolve()

  function enqueue<R>(op: () => Promise<R>, fallback: R): Promise<R> {
    const run = tail.then(op).catch((error: unknown) => {
      log('command history write failed', error)
      return fallback
    })
    // NOT awaited (see the header): writes stay ordered, reads run free, each write is followed by its own invalidate.
    tail = run.then(() => {
      void queryClient.invalidateQueries({ queryKey: COMMANDS_KEY, exact: true })
    })
    return run
  }

  return {
    record(command) {
      void enqueue(async () => {
        await (await getService()).recordCommand(command.id, command.label, command.category)
      }, undefined)
    },
    pin(command, pinned) {
      return enqueue(async () => {
        await (await getService()).pinCommand(command.id, pinned, command.label, command.category)
        return true
      }, false)
    },
    idle: () => tail.then(() => undefined),
  }
}

/** The app's ONE history writer (the composition-root service over the app QueryClient). */
export let commandHistory: CommandHistory = makeAppCommandHistory()

function makeAppCommandHistory(): CommandHistory {
  return createCommandHistory({
    // Dynamic import: keeps this module free of the composition root at load (vi.mock still applies to it).
    getService: async () => (await (await import('../db/composition-root')).getServices()).preferences,
    queryClient: appQueryClient,
    log: (message, error) => console.warn(`[command-history] ${message}`, error),
  })
}

/** Tests only — a fresh chain (a rejected or hung op from one test can't leak into the next). */
export function resetCommandHistoryForTests(): void {
  commandHistory = makeAppCommandHistory()
}
