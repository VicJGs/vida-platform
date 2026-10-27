// ============================================================================
// Command-bar contract — UX-2 (LIF-91). The typed interaction model the UI-4 host renders against.
// Data/logic only — NO chrome. Designed AGAINST three unbuilt systems via typed seams: `command_bar_history`
// (MOD-prefs/M1.1), FTS5 search (DB-8/M1.4), the render host (UI-4). Nothing here imports an unbuilt module.
//
// Run-dispatch rule (IMPL-PLAN §4a-F2): NAVIGATION commands act via the injected `CommandRunContext.navigate`
// (the router is UI-4-injected, unavailable at registry-build time); ACTION commands call the already-global
// Zustand store directly. The asymmetry is intentional — router = host-injected, store = global singleton.
// See docs/core/architecture/command-bar-and-search.md.
// ============================================================================

export type CommandCategory = 'navigation' | 'action' | 'search'

/** The only host capability a command may use now. UI-4 injects the real `navigate` (from routes.tsx). */
export interface CommandRunContext {
  navigate: (path: string) => void
}

export interface Command {
  id: string
  label: string
  category: CommandCategory
  keywords?: string[]
  run: (ctx: CommandRunContext) => void
  /** conditional-visibility feature flag (e.g. 'feature_gamification'); the host filters by it. */
  visibleWhen?: string
}

/** The seam modules implement at M1.1+ to contribute action commands. */
export interface CommandProvider {
  id: string
  getCommands: () => Command[]
}

/**
 * The v2 target shape for the launcher's recency store — mirrors the v1 `command_bar_history` columns EXACTLY
 * (packages/core/src/db/_legacy/schema.v1.ts:1291). Typed here as the MOD-prefs contract assertion; NOT read
 * from a table (unbuilt). The frecency fixture is this shape, so the tests double as that contract check.
 */
export interface CommandHistoryEntry {
  command_key: string
  command_label: string
  command_category: string | null
  use_count: number
  last_used_at: number | null
  is_pinned: 0 | 1
}

/** Display-only view data (already client-decrypted — the ZK-safe surface, PLAN §2d). No plaintext seam here. */
export interface SearchResult {
  id: string
  entityType: string
  title: string
  routePath: string
}

export interface SearchResultGroup {
  entityType: string
  results: SearchResult[]
}

/** All terminal states — fail loud (standards/components.md §VIII). `search-unavailable` = DB-8 not yet built. */
export type SearchStatus = 'idle' | 'typing' | 'loading' | 'results' | 'empty' | 'search-unavailable' | 'error'

export interface SearchOutcome {
  status: SearchStatus
  groups?: SearchResultGroup[]
  message?: string
}

/** The DB-8 seam. The stub (search-provider.ts) satisfies this until FTS5 lands. */
export interface SearchProvider {
  search: (query: string) => Promise<SearchOutcome>
}

/** Keybind as DATA (D5) — registered here, not hardcoded in UI-4. */
export interface CommandKeybind {
  key: 'k'
  mod: 'meta' | 'ctrl'
  preventDefault: true
}

export type Platform = 'mac' | 'other'

/** `⌘K` on mac, `Ctrl+K` elsewhere; always preventDefault to avoid browser-native collisions (D5). */
export function resolveKeybind(platform: Platform): CommandKeybind {
  return { key: 'k', mod: platform === 'mac' ? 'meta' : 'ctrl', preventDefault: true }
}
