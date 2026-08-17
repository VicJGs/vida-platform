// UI-4 · S3 (LIF-89) — the search-as-you-type hook (S3-BR-d). Empty query → `idle` (command mode; no call). A
// non-empty query → a RACE-GUARDED call to the `SearchProvider`: only the LAST query's result is applied (a stale
// resolve for a superseded query is discarded — the effect-cleanup flips a `current` latch). In M1.0 the provider is
// `stubSearchProvider` → always `search-unavailable`; the hook is provider-agnostic so DB-8's real provider drops in
// unchanged. (§XVI: the one legitimate `useEffect` — synchronizing with an external async system.)
import { useEffect, useState } from 'react'
import type { SearchOutcome, SearchProvider } from '../command-bar/types'
import { emptyQueryOutcome } from '../command-bar/search-provider'

export function useCommandSearch(query: string, provider: SearchProvider): SearchOutcome {
  const [outcome, setOutcome] = useState<SearchOutcome>(emptyQueryOutcome)

  useEffect(() => {
    if (query.length === 0) {
      setOutcome(emptyQueryOutcome())
      return
    }
    let current = true
    setOutcome({ status: 'loading' })
    provider
      .search(query)
      .then((result) => {
        if (current) setOutcome(result)
      })
      .catch(() => {
        if (current) setOutcome({ status: 'error', message: 'Search failed.' })
      })
    return () => {
      current = false // supersede: a later query mounted a new effect; discard this one's pending resolve
    }
  }, [query, provider])

  return outcome
}
