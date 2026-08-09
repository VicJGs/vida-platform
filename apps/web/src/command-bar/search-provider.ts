// The DB-8 search seam. Until FTS5 tables + population land (DB-8, #60, M1.4), search is EXPLICITLY unavailable
// — a loud terminal state, never a silent blank. No FTS5 import; the real provider replaces this stub at DB-8.
import type { SearchProvider, SearchOutcome } from './types'

export const stubSearchProvider: SearchProvider = {
  search: async (_query: string): Promise<SearchOutcome> => ({
    status: 'search-unavailable',
    message: 'Search activates when the index is built (DB-8).',
  }),
}

/** Blank query → idle (nothing to search yet). */
export function emptyQueryOutcome(): SearchOutcome {
  return { status: 'idle' }
}
