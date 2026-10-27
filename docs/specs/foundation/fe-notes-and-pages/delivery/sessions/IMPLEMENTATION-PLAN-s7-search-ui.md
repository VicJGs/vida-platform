# IMPLEMENTATION-PLAN — S7 · Search UI (search-unavailable)

> fe-notes-and-pages (② unit #27) · slice S7 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3; divergence → §XXVIII. Every contract line
> FACT-grounded. Pairs with `PLAN-s7-search-ui.md`.

## 1. Grounding ledger

| Claim                                                                                                                                                     | Source                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `SearchProvider = { search(query): Promise<SearchOutcome> }` · `SearchOutcome = { status: SearchStatus, groups?, message? }`                              | command-bar/types.ts:72-81             |
| `SearchStatus = 'idle'\|'typing'\|'loading'\|'results'\|'empty'\|'search-unavailable'\|'error'`                                                           | command-bar/types.ts:63-70             |
| `SearchResultGroup = { entityType, results: SearchResult[] }` · `SearchResult = { id, entityType, title, routePath }`                                     | command-bar/types.ts:49-60             |
| `stubSearchProvider.search(q) → { status:'search-unavailable', message:'…(DB-8).' }` (every non-blank query)                                              | command-bar/search-provider.ts:5-10    |
| `emptyQueryOutcome() → { status:'idle' }`                                                                                                                 | command-bar/search-provider.ts:13-15   |
| `useCommandSearch(query, provider): SearchOutcome` — race-guarded (last-wins), empty→idle, non-empty→loading→resolve, provider-agnostic                   | shell/use-command-search.ts:10-34      |
| `Input` forwards `{...rest}` BEFORE computed props → `onKeyDown`/`role`/`aria-*` pass through to the native input (command-bar uses `onKeyDown` on Input) | input.tsx:192-194; command-bar.tsx:135 |
| `Input` props: `value` · `onChangeText(v)` · `leading?: ReactNode` · `placeholder` · `aria-label` (unlabeled dev-warn)                                    | input.tsx:114-139                      |
| `note-chrome`: `Icon({icon,size?,tone?})` (aria-hidden glyph) · `Row` (styled row)                                                                        | note-chrome.tsx:13-27                  |
| M1 no live composition root → honest default + `?sample` DEV gate (the S3–S6 discipline, incl. the `devSampleActive()` guard)                             | use-attachments.ts:28-34               |
| `NotesSurface` currently returns `<CollectionView {...}/>` directly; wrapping it in a column is additive                                                  | notes-surface.tsx:19-38                |

## 2. Contracts (exact signatures)

### 2a. `apps/web/src/notes/use-notes-search.ts` (NET-NEW — data seam; reuses `useCommandSearch`, B1)

```ts
import { useState } from 'react'
import type { SearchOutcome, SearchProvider } from '../command-bar/types'
import { stubSearchProvider } from '../command-bar/search-provider'
import { useCommandSearch } from '../shell/use-command-search'

export interface NotesSearchResult {
  query: string
  setQuery: (q: string) => void
  outcome: SearchOutcome
}

// M1: honest default (query ''=idle). `?sample` (DEV) seeds a term so the search-unavailable state renders for the gate.
export function useNotesSearch(provider: SearchProvider = stubSearchProvider): NotesSearchResult {
  const [query, setQuery] = useState<string>(sampleSeed) // lazy init
  const outcome = useCommandSearch(query, provider) // REUSE: race-guard + blank→idle + live-swap (B1)
  return { query, setQuery, outcome }
}
```

- `sampleSeed()` = `devSampleActive() ? 'project' : ''` (the `use-attachments.ts:28-34` `devSampleActive` guard, replicated
  per house idiom — each seam owns its own). `'project'` is a non-blank term → the stub yields `search-unavailable`.
- No RQ, no bespoke `useEffect` here — the async outcome is entirely `useCommandSearch`'s (one mechanism for ⌘K + notes).
- **Live swap:** the hook _signature_ already carries `provider` (default `stubSearchProvider`). When DB-8 lands, flip the
  default binding to the real `SearchProvider` at the composition root (a one-line default change — NOT a view/shell/call-site
  change; `NotesSurface` still mounts `<NotesSearch/>` with no arg). `useCommandSearch` then resolves `results`/`empty` and
  the view already renders them (C1 — honest: the signature is stable, one binding flips).

### 2b. `apps/web/src/notes/notes-search.tsx` (NET-NEW — presentational split + hook shell)

```ts
export function NotesSearchView(props: {
  query: string
  onQueryChange: (q: string) => void
  outcome: SearchOutcome
}): JSX.Element
export function NotesSearch(): JSX.Element // useNotesSearch shell
```

`NotesSearch` = `const s = useNotesSearch(); return <NotesSearchView query={s.query} onQueryChange={s.setQuery} outcome={s.outcome} />`.

`NotesSearchView` body:

```
<View role="search" aria-label="Search notes" gap="$8">
  <Input
    leading={<Icon icon={Search} />}             // lucide-react Search (EC-22; Icon = aria-hidden)
    aria-label="Search notes"
    placeholder="Search notes…"                   // distinguishes from the collection Filter (D-S7-10)
    value={query}
    onChangeText={onQueryChange}
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onQueryChange('') } }}  // Esc-clear (D-S7-9)
  />
  {renderStatus(outcome)}
</View>
```

`renderStatus(outcome)` — **exhaustive `switch` on `outcome.status`** (fail-loud §VIII; `never` default guards the union):
| status | render |
|--------|--------|
| `idle` | `null` (resting box — `renderKindFor('idle')='input'`) |
| `typing` \| `loading` | `<Muted busy>Searching…</Muted>` (`aria-busy`) |
| `search-unavailable` | `<Muted role="status">Search turns on once your notes are indexed.</Muted>` (VOICE copy, NO `(DB-8)` — B2; calm muted, never `$colorSignalDanger`) |
| `empty` | `<Muted role="status">No matching notes.</Muted>` |
| `results` | a **local inline** `role="list"` of `result.title` rows per `group` (no separate export — trivial + M1-unreachable; authored for the live swap + the injected-provider test) |
| `error` | `<Muted role="status">Search failed. Try again.</Muted>` |

`Muted` = a **local** muted `Text` helper in `notes-search.tsx` (`$small`, `$colorTextMuted`, optional `role='status'`/
`aria-busy`) — replicated from `attachments-list.tsx:20-26` (confirmed NOT shared via `note-chrome` → the house per-file
idiom; extracting to a shared atom is a rule-of-three refactor out of S7 scope). Direct semantic tokens; Lucide via
`note-chrome` `Icon` (EC-22).

### 2c. `apps/web/src/notes/notes-surface.tsx` (edit — additive mount, N3)

Wrap the return in a column; search on top, collection below filling:

```tsx
return (
  <View flex={1} minHeight={0} gap="$12">
    <NotesSearch />
    <View flex={1} minHeight={0}>
      <CollectionView title="Notes" aria-label="Notes collection" {...} />   // UNCHANGED props
    </View>
  </View>
)
```

`CollectionView` keeps `flex:1`/`minHeight:0` via its wrapper (the RNW flex-collapse guard,
[[flex1-child-collapses-to-height-0-in-column-under-rnw]]). No other S1 change.

## 3. Build steps (strict order; TDD per unit)

- [ ] **B1** — `use-notes-search.ts` (§2a) + `notes-search.test.tsx` HOOK cases: blank→`idle`; non-blank via default
      `stubSearchProvider`→`search-unavailable` (await the race-guarded resolve, the command-bar test idiom); `setQuery`
      updates `query`; an injected fake provider returning `results`/`empty` flows through (zero-sig live-swap proof).
- [ ] **B2** — `notes-search.tsx` (§2b) + `notes-search.test.tsx` VIEW cases: `idle`→input only, no status; each status
      renders its honest form; `search-unavailable` copy has NO `(DB-8)` and is NOT `$colorSignalDanger`; typing→`aria-busy`;
      `onChangeText` fires `onQueryChange`; Esc clears (fires `onQueryChange('')`); a11y (`role="search"` named · `Input`
      `aria-label` · degrade `role="status"`); EC-22 the leading Lucide svg present.
- [ ] **B3** — edit `notes-surface.tsx` (§2c); extend `notes-surface.test.tsx`. _(Verified: the existing S1 tests assert
      the "Notes" title + `role=region "Notes collection"` + the switcher + the empty state — NOT the root element — so the
      wrapping `<View>` is safe; `role="search"` is a distinct landmark, so `getByRole('region', {name:'Notes collection'})`
      still resolves uniquely.)_ Add an assertion that the `role="search"` region renders alongside the collection.
- [ ] **B4** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green (re-verify no S1 `notes-surface` regression).
- [ ] **B5** — blocking **Visual Gate** (PLAN §7): Brave real app → onboarding → `/notes` (idle box) + `/notes?sample`
      (search-unavailable); 3 presets × L/D × {375,768,1440}; EC-12 (box renders; degrade line renders with VOICE copy, no
      `(DB-8)`; collection still renders below), EC-22, AA full-matrix incl. warm-dark (status line MUTED not danger), axe 0,
      no overflow, MEASURED_OK + composite opacity, exclude WCAG-disabled controls. Harness `/tmp/vg/s7-gate.mjs` (S3–S6 pattern).

## 4. Acceptance (DoD — §XXII)

- [ ] the search box renders on `/notes` (resting `idle`) — EC-12.
- [ ] a non-blank query (incl. `?sample`) shows the honest **`search-unavailable`** calm `role="status"` line with
      VOICE copy (no `(DB-8)`, not danger-coloured) — EC-12 / B2.
- [ ] every applicable `SearchStatus` is rendered (fail-loud §VIII) via an exhaustive switch; `idle`/`search-unavailable`
      are the only M1-reachable states; `results`/`empty`/`error`/`typing` authored for the live swap.
- [ ] the async outcome is owned by the reused `useCommandSearch` (one mechanism; B1); live DB-8 provider drops in zero-sig.
- [ ] Esc clears the query (D-S7-9); the box reads as text-search, distinct from the collection Filter (D-S7-10).
- [ ] a11y: `role="search"` landmark named; `Input` `aria-label`; degrade `role="status"` polite; leading glyph aria-hidden.
- [ ] TS strict (0 any/non-null/suppression); the additive mount preserves S1 (`CollectionView` flex:1, no regression).
- [ ] tsc 0 · eslint 0 · full suite green · Visual Gate PASS.
- [ ] §XXIX currency: task slice-log + build-step + TASKS.md. **No F-finding** (fully fe-notes-owned; only defer = DB-8 engine).

## 5. Out of scope (no pull-forward — §XXVIII)

The FTS5 ranked-search ENGINE (index rebuild-on-unlock + ranked query) → DB-8/#60/M1.4 · notes-scope query param (DB-8's
design) · results grouping/routing chrome beyond the minimal `results` branch · a dedicated search route · any
`@vida/ui` `CollectionView` change (fe-codec-collection) · query debounce (belongs in `useCommandSearch`, inherited by both consumers).
