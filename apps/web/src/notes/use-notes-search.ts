// ============================================================================
// useNotesSearch — the notes-scoped search DATA seam (fe-notes #27, S7; NOT-50/EC-12).
// REUSES the shipped DB-8 search seam end-to-end (B1): the `SearchProvider` contract +
// `stubSearchProvider` (command-bar) AND the race-guarded `useCommandSearch` hook (shell)
// — so the ⌘K launcher and the notes search box share ONE async-search mechanism, and the
// real DB-8 provider drops in by flipping ONE default binding (C1).
//
// M1: the FTS5 ranked-search ENGINE is DB-8 (deferred) → every non-blank query resolves to
// `search-unavailable`; a blank query is `idle`. The `?sample` DEV param seeds a term so the
// degraded state renders on load for the blocking Visual Gate (the S3–S6 `?sample` discipline).
//
// Live swap: flip the default `provider` to the real DB-8 `SearchProvider` at the composition
// root (view/shell/call-site unchanged) → `useCommandSearch` resolves `results`/`empty`.
// ============================================================================
import { useState } from 'react'
import type { SearchOutcome, SearchProvider } from '../command-bar/types'
import { stubSearchProvider } from '../command-bar/search-provider'
import { useCommandSearch } from '../shell/use-command-search'

export interface NotesSearchResult {
  query: string
  setQuery: (q: string) => void
  outcome: SearchOutcome
}

// `?sample` (DEV only) → a non-blank seed term so the stub yields `search-unavailable` on load. Mirrors the
// `use-attachments.ts` dev-gate guard (per-seam house idiom). Any non-blank term works; 'project' is illustrative.
function sampleSeed(): string {
  const active =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  return active ? 'project' : ''
}

export function useNotesSearch(provider: SearchProvider = stubSearchProvider): NotesSearchResult {
  const [query, setQuery] = useState<string>(sampleSeed) // lazy init (reads the URL once)
  const outcome = useCommandSearch(query, provider) // REUSE: race-guard + blank→idle + live-swap (B1)
  return { query, setQuery, outcome }
}
