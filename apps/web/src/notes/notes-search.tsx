// ============================================================================
// NotesSearch — the notes-scoped search box (fe-notes #27, S7; NOT-50 / EC-12). Split
// (the BacklinksView/AttachmentsView precedent): NotesSearchView is pure presentational
// (state-as-prop); NotesSearch is the hook shell over useNotesSearch.
//
// M1 is HONEST-degraded: the FTS5 engine is DB-8 (deferred) → a non-blank query renders a
// calm `search-unavailable` status line (VOICE copy, NO internal ids — B2; never
// `$colorSignalDanger`). Every `SearchStatus` is rendered fail-loud (§VIII) via an exhaustive
// switch; only `idle`/`search-unavailable` are reachable in M1, the rest are authored for the
// live DB-8 swap (+ the injected-provider test).
// ============================================================================
import type { KeyboardEvent, ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { Input } from '@vida/ui'
import { Search } from 'lucide-react'
import type { SearchOutcome, SearchResultGroup } from '../command-bar/types'
import { Icon } from './note-chrome'
import { useNotesSearch } from './use-notes-search'

/** Local muted line (the attachments-list idiom; not shared via note-chrome — per-file house idiom). */
function Muted({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

/** The `results` branch — trivial inline list (M1-unreachable; authored for the live swap + the injected test). */
function ResultList({ groups }: { groups: readonly SearchResultGroup[] }) {
  return (
    <View role="list" gap="$4">
      {groups.flatMap((g) =>
        g.results.map((r) => (
          <Text key={r.id} role="listitem" fontSize="$body" color="$colorTextPrimary">
            {r.title}
          </Text>
        )),
      )}
    </View>
  )
}

/** Render the outcome below the box. Exhaustive `switch` (never default) → fail-loud over the full SearchStatus union. */
function renderStatus(outcome: SearchOutcome): ReactNode {
  switch (outcome.status) {
    case 'idle':
      return null // resting box — nothing requested yet
    case 'typing':
    case 'loading':
      return <Muted busy>Searching…</Muted>
    case 'search-unavailable':
      // VOICE copy — NOT the stub's "(DB-8)" dev string (B2); calm muted, never danger-coloured.
      return <Muted role="status">Search turns on once your notes are indexed.</Muted>
    case 'empty':
      return <Muted role="status">No matching notes.</Muted>
    case 'results':
      return <ResultList groups={outcome.groups ?? []} />
    case 'error':
      return <Muted role="status">Search failed. Try again.</Muted>
    default: {
      const _exhaustive: never = outcome.status
      return _exhaustive
    }
  }
}

/** Pure presentational — the box + the per-status region, all as props (no hook, no env). */
export function NotesSearchView({
  query,
  onQueryChange,
  outcome,
}: {
  query: string
  onQueryChange: (q: string) => void
  outcome: SearchOutcome
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onQueryChange('') // Esc clears → idle (D-S7-9)
    }
  }
  return (
    <View role="search" aria-label="Search notes" gap="$8">
      <Input
        leading={<Icon icon={Search} />}
        aria-label="Search notes"
        placeholder="Search notes…"
        value={query}
        onChangeText={onQueryChange}
        onKeyDown={onKeyDown}
      />
      {renderStatus(outcome)}
    </View>
  )
}

/** The hook-wired shell: reads the data seam, delegates to the pure view. */
export function NotesSearch() {
  const { query, setQuery, outcome } = useNotesSearch()
  return <NotesSearchView query={query} onQueryChange={setQuery} outcome={outcome} />
}
