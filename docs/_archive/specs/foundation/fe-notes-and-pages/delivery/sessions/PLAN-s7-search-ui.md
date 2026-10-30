# PLAN — S7 · Search UI (search-unavailable)

> fe-notes-and-pages (② unit #27) · slice S7 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ → Approval-2 → blocking Visual Gate). Grounded in
> `delivery/{slice-map,seam-contract,envision,interpretation}.md` + the aspect `notes-and-pages.md` (NOT-50) +
> the already-built DB-8 search seam (`apps/web/src/command-bar/{types,search-provider}.ts`) + the fe-codec-patterns
> 8-state convention (`apps/web/src/state-conventions/interaction-state.ts`).

## 1. What S7 is (scope line)

The **notes-scoped search UI** on the `/notes` Top view: a search box that, in M1, renders + shows the **honest
`search-unavailable`** terminal state (the FTS5 ranked-search ENGINE is **DB-8**, deferred) — NOT-50 / EC-12. A
CONSUMER slice: it reuses the already-built shared **DB-8 search seam** (`SearchProvider`/`SearchOutcome`/`SearchStatus`

- `stubSearchProvider`, `apps/web/src/command-bar/`) rather than inventing a second search vocabulary. Fully
  fe-notes-owned UI (like S6) — the only defer is the universal one (the FTS5 engine → DB-8/#60/M1.4).

**Boundary — distinct from the ⌘K launcher.** The GLOBAL ⌘K command-bar search (BSE-14/15/16, shipped UX-2/UI-4) is
SHARED chrome `[FACT: interpretation.md:127]`. fe-notes OWNS a SEPARATE **notes search UI (→ `search-unavailable`)**
`[FACT: interpretation.md:122; slice-map.md:30; seam-contract.md:20]` — the notes-collection "find a note" box. S7
reuses the ⌘K's DB-8 _seam_ (same engine, one substrate — `corpus.md:255` "FTS5 … shared by every searchable module")
but ships its own notes-scoped box; it does not re-use the ⌘K Dialog chrome.

**In scope (S7 — apps/web/src/notes/):**

- `use-notes-search()` — the DATA seam: holds `query` state + the `?sample` seed, and **delegates the async outcome to
  the shipped `useCommandSearch(query, provider)`** (`apps/web/src/shell/use-command-search.ts` — the race-guarded,
  provider-agnostic, live-swap-ready search hook; §XVI's legitimate `useEffect`), default provider `stubSearchProvider`.
  Returns `{ query, setQuery, outcome: SearchOutcome }`. Honest default + `?sample` DEV gate (seeds a query so the
  `search-unavailable` state renders on load for the gate — the S3–S6 `?sample` precedent). (B1 — reuse, not reinvent.)
- `notes-search.tsx` — `NotesSearchView` (state-as-prop, the BacklinksView/AttachmentsView split precedent) + the
  `NotesSearch` hook shell. The search box (`@vida/ui` `Input`, leading Lucide `Search` icon) inside a `role="search"`
  region, + the per-`SearchStatus` render (every applicable §VIII state, honest) with **VOICE-compliant copy** (B2).
- Mount `<NotesSearch/>` ABOVE the `CollectionView` in `notes-surface.tsx` (additive — the notes Top view gains a
  search affordance; the collection below is untouched; the wrapper is a column + `CollectionView` keeps `flex:1`/`minHeight:0`, N3).

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII):**

- The **FTS5 ranked-search ENGINE** (index rebuild-on-unlock + ranked query) → **DB-8/#60/M1.4**
  `[FACT: parts/notes-and-pages.md:64; seam-contract.md:29]`. M1 the box is present + honestly `search-unavailable`
  — never a disabled stub, never a crash (IR-2 degrade) `[FACT: interpretation.md:143-144]`.
- The **results / results-grouping UI** (`SearchResultGroup`→routed rows) → ships zero-signature when DB-8 lands; the
  `results`/`empty` branches are authored (fail-loud §VIII) but unreachable in M1 (the stub never returns them). (D-S7-4)
- **Scoped-to-notes query param** at the DB-8 layer (entity-type filter) → DB-8's design; at M1 scope is moot (the stub
  returns `search-unavailable` for every query). (D-S7-2)
- A search **RESULTS route** / a dedicated search page → out of scope; the box is inline on `/notes` (D-S7-5). No new route.
- Modifying `@vida/ui` `CollectionView` to add a search slot → that is fe-codec-collection's territory, not fe-notes
  (the search box is fe-notes-owned chrome mounted beside the shell). (D-S7-6)

## 2. Composition shape

```
notes-surface.tsx (/notes Top view — edited: wrap in a column, add the search box above)
└─ <View> (column)
   ├─ <NotesSearch />                              apps/web/src/notes/notes-search.tsx       [NET-NEW]
   │    ├─ use-notes-search()                      apps/web/src/notes/use-notes-search.ts    [NET-NEW]
   │    │     → { query, setQuery, outcome }   holds query + ?sample seed; outcome via useCommandSearch(query, provider) [REUSE, B1]
   │    │                                       default stubSearchProvider; ?sample seeds query → search-unavailable
   │    └─ NotesSearchView({ query, onQueryChange, outcome })   (state-as-prop; the BacklinksView precedent)
   │          ├─ role="search" region, aria-label "Search notes"
   │          ├─ <Input leading={<Icon Search/>} aria-label="Search notes" value onChangeText onKeyDown(Esc→clear, N1)/>
   │          └─ per SearchStatus:  idle → nothing (resting box) · search-unavailable → calm role="status" VOICE copy [B2]
   │                                 (defensive: typing → busy · results → list · empty → "No matching notes" · error → status)
   └─ <CollectionView … flex={1} minHeight={0} />   (S1 — UNCHANGED; flex:1 preserved under the column wrapper, N3)
```

`NotesSearchView` is presentational (all state as props). Reuses `note-chrome` atoms (`Icon`, `Row`, `Muted` idiom)

- the shared `SearchStatus` union (EC-22 Lucide). **No new `@vida/ui` primitive.**

## 3. Net-new units (files)

| File                                          | Purpose                                                                                            | Notes                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/notes/use-notes-search.ts`      | DATA seam — `{query, setQuery, outcome}`; outcome delegated to `useCommandSearch(query, provider)` | default `stubSearchProvider`; `?sample` seeds query; **reuses the shipped race-guarded hook** (B1) — one search mechanism for ⌘K + notes |
| `apps/web/src/notes/notes-search.tsx`         | `NotesSearchView` (state-as-prop) + `NotesSearch` (hook shell)                                     | `role="search"`; `Input` + leading `Search` icon; per-`SearchStatus` render; VOICE copy (B2); Esc-clear (N1)                             |
| `apps/web/src/notes/notes-surface.tsx` (edit) | mount `<NotesSearch/>` above `<CollectionView/>`                                                   | wrap in a `<View>` column; `CollectionView` keeps `flex:1`/`minHeight:0` (N3); collection otherwise untouched                            |
| `apps/web/src/notes/notes-search.test.tsx`    | view + hook tests                                                                                  | states render; input drives `setQuery`; Esc clears; a11y (`role=search`/`status`); EC-22 svg                                             |

Reuses shipped: `command-bar/types.ts` (`SearchProvider`/`SearchOutcome`/`SearchStatus`) · `command-bar/search-provider.ts`
(`stubSearchProvider`/`emptyQueryOutcome`) · **`shell/use-command-search.ts` (`useCommandSearch` — the race-guarded async hook, B1)**
· `@vida/ui` `Input` · `note-chrome` · Lucide · Tamagui. **No pure `.ts` file** — S7 has no real transformation (contrast
`backlinks.ts`/`attachments.ts`); manufacturing an empty pure module would be over-engineering. The hook + view are each unit-tested.

## 4. Decisions — all DOC-RESOLVED / grounded

- **D-S7-1 — reuse the shared DB-8 search seam AND its race-guarded hook, don't reinvent.** `command-bar/types.ts`
  already defines `SearchProvider`, `SearchOutcome`, `SearchStatus` (incl. `'search-unavailable'`), `search-provider.ts`
  ships `stubSearchProvider` ("The DB-8 search seam … search is EXPLICITLY unavailable" until FTS5 lands) +
  `emptyQueryOutcome` (blank query → `idle`) `[FACT: command-bar/search-provider.ts:1-13]`, and
  `shell/use-command-search.ts` ships **`useCommandSearch(query, provider): SearchOutcome`** — "RACE-GUARDED … only the
  LAST query's result is applied … provider-agnostic so DB-8's real provider drops in unchanged" `[FACT:
use-command-search.ts:1-34]`. The DB-8 FTS5 engine is ONE cross-cutting substrate shared by every searchable module
  `[FACT: corpus.md:255]`. Reuse (components.md §VI) → `use-notes-search` CONSUMES all three: it holds `query` + the
  `?sample` seed and **delegates the async outcome to `useCommandSearch(query, provider)`** (default `stubSearchProvider`),
  so the DB-8 live provider drops in with zero signature change and ⌘K + notes share ONE async-search mechanism (no
  parallel useEffect, no bespoke RQ). _(Nit: `useCommandSearch` is search infra currently homed in `shell/`; the
  `notes→shell` import is accepted app-internal reuse — relocating it to `command-bar/` is out of S7 scope.)_
- **D-S7-2 — notes-scope is a future DB-8 param; moot at M1.** The live DB-8 provider will scope to pages
  (`entity_type='page'`); the `stubSearchProvider` returns `search-unavailable` for every query, so M1 renders the same
  state regardless of scope. No scope param is wired now (No-Guessing — don't invent DB-8's query shape).
- **D-S7-3 — `search-unavailable` renders CALM (`role="status"` muted) with USER-FACING copy — NOT a danger error, NOT
  the dev stub string (B2).** The command-bar renders `search-unavailable` as "ONE loud `role="status"` message" `[FACT:
command-bar.tsx:166-167]`; the canvas-reader `unavailable` is a "DISTINCT calm status, NOT empty … never
  `$colorSignalDanger`" (the house precedent). So S7 shows a quiet muted line, never a red/alert treatment. **The copy is
  VOICE-compliant and authored by the VIEW — NOT the stub's `outcome.message`** (`"Search activates when the index is
built (DB-8)."` leaks the internal `(DB-8)` identifier, a `lintCopy`/VOICE violation; the command-bar itself maps
  status→its own copy at `command-bar.tsx:50` → `'Search is unavailable.'`, deliberately NOT the stub message). S7 copy:
  e.g. **"Search turns on once your notes are indexed."** (no issue ids). The stub `message` stays a seam/logging field.
  The 8-state machine maps `search-unavailable`→`unavailable`→`renderKindFor='error-card'` `[FACT: interaction-state.ts:139]`,
  but `error-card` is a render-KIND hint, not a visual mandate — the honest calm status governs (command-bar + canvas-reader precedents).
- **D-S7-4 — render EVERY applicable `SearchStatus` (fail-loud §VIII), even M1-unreachable ones.** The stub only ever
  yields `idle` (blank) + `search-unavailable` (non-blank). But `NotesSearchView` authors the full ladder — `idle`
  (resting box, no overlay) · `typing` (`aria-busy`) · `results` (grouped list) · `empty` ("No matching notes") ·
  `search-unavailable` (calm status) · `error` (calm status) — so the live DB-8 swap needs no view change and no state
  is a silent blank (§VIII "the complete list of states"; the command-bar fail-loud posture).
- **D-S7-5 — the box is INLINE on `/notes`, not a results route.** EC-12 = "the search box renders"; the greybox homed a
  `light-search` composition, not a route. Inline-above-collection is the lean M1 home (Notion/Obsidian idiom). No new
  route (contrast S1/S2 routes).
- **D-S7-6 — fe-notes owns the box; no `@vida/ui` `CollectionView` change.** `CollectionView` has no search slot
  `[FACT: collection-view.tsx chrome = onFilter/onSort/onNewView only]`; adding one is fe-codec-collection's concern.
  S7 mounts its own `NotesSearch` beside the shell (the search box is fe-notes chrome), keeping the package boundary clean.
- **D-S7-7 — `?sample` seeds a query (deterministic gate).** `?sample` → `use-notes-search` initializes `query` to a
  sample term → `outcome.status === 'search-unavailable'` renders on load, so the blocking Visual Gate captures the
  degraded state without driver typing (the S3–S6 `?sample` precedent). No sample → `idle` resting box.
- **D-S7-8 — a11y.** The region is a `role="search"` landmark (no existing one `[FACT: grep 0 in apps/web/src]`) named
  `aria-label="Search notes"`; the `Input` carries `aria-label="Search notes"` (the UI-1 unlabeled-input dev-warn is
  satisfied); the degraded line is `role="status"` (polite — a statically-rendered state, not a live insertion, the
  list-view/Toast contrast). The leading `Search` glyph is decorative (EC-22 Lucide, aria-hidden via `note-chrome` `Icon`).
- **D-S7-9 — keyboard (N1).** Search is reactive-on-type (no submit button; the outcome tracks `query`). **Esc clears the
  query** (`onKeyDown` → `setQuery('')` → `idle`) — a cheap, expected search affordance. No Enter handler (nothing to
  submit in M1; the live DB-8 path stays reactive). Focus ring is the `Input`'s own (§VIII).
- **D-S7-10 — search ≠ the collection Filter (N2).** The `/notes` collection already offers a `Filter` control (structured
  predicate, onFilter) `[FACT: collection-view.tsx]`. The S7 box is **text search** ("find a note by content/title"), a
  distinct affordance — the leading `Search` icon + `aria-label="Search notes"` + placeholder "Search notes…" keep the two
  visually/semantically distinct (no redundancy).

## 5. Envision coverage — S7's EC Visual-Gate MUSTs

| EC              | Requirement                                                                              | S7 assertion                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **EC-12**       | the search box **renders** + shows the honest **`search-unavailable`** state (FTS5→DB-8) | Visual Gate: the box renders (resting `idle`); with `?sample` the calm `search-unavailable` status line renders |
| **EC-22**       | Lucide icons token-tinted                                                                | the leading `Search` glyph is a Lucide svg, theme-token tinted                                                  |
| EC-16/17 (feel) | editorial calm; the degrade reads honest, not broken                                     | live per-slice Visual Gate (full-matrix AA; calm muted status, no danger colour)                                |

## 6. Test plan

- `notes-search.test.tsx` (view): `idle` → the input renders, no status overlay; `search-unavailable` → a `role="status"`
  muted line with **VOICE copy (no `(DB-8)`)**, NOT `$colorSignalDanger`; `results`/`empty`/`error`/`typing` branches
  render their honest form (fail-loud); typing drives `onQueryChange`; **Esc clears the query** (D-S7-9); a11y
  (`role="search"` named · `Input` `aria-label` · `role=status`); EC-22 the leading Lucide svg present.
- `notes-search.test.tsx` (hook, `NotesSearch`/`use-notes-search`): blank query → `idle`; non-blank via the default
  `stubSearchProvider` (through `useCommandSearch`) → `search-unavailable`; `setQuery` updates `query`; an injected fake
  provider returning `results`/`empty` flows through (proves the zero-sig live swap + the reused race-guard applies).
- Full `@vida/web` suite green (incl. the edited `notes-surface` — re-verify no S1 regression).

## 7. Blocking Visual Gate (real browser, after g2)

Brave real app → onboarding → `/notes` (idle) and `/notes?sample` (search-unavailable). 3 presets × light/dark ×
375/768/1440:

- **EC-12:** the search box renders on `/notes` (resting); on `/notes?sample` the **calm `search-unavailable` status
  line** renders (box + muted VOICE copy, NO `(DB-8)` string), AND the CollectionView below still renders (no S1 regression).
- **EC-22:** the leading `Search` Lucide svg present + theme-tinted.
- Full-matrix **AA** on the input placeholder + status line incl. warm-dark (the status line is MUTED, not danger —
  verify it is NOT `$colorSignalDanger`); `axe` 0; 0 overflow; MEASURED_OK + composite-ancestor opacity; exclude
  WCAG-disabled controls (`/tmp/vg/s7-gate.mjs`, the S3–S6 harness).

## 8. Risks / findings

- **NO F-S7 cross-unit finding** — unlike S4/S5 (ui-3 `@vida/editor` surfaces), S7 is fully fe-notes-owned UI. The only
  defer is the universal backend one (the FTS5 ENGINE → DB-8/#60/M1.4), degraded honestly in-place per IR-2. The DB-8
  seam reused here is already shipped (command-bar); no new seam is introduced.
- **R1 — don't over-build the results UI.** M1 never reaches `results`; author the branch minimally (fail-loud §VIII)
  but do not build grouping/routing chrome the stub can't exercise (that's the DB-8-landing follow-up). (D-S7-4)
- **R2 — notes↔command-bar import direction.** `use-notes-search` imports `SearchProvider`/`stubSearchProvider` from
  `../command-bar/` (both app-internal logic, "data/logic not chrome"). This is reuse, not a layering violation (notes is
  a feature surface; command-bar is the shared search-contract layer). Flag if a cleaner shared home emerges (M1.1+).
- **R3 — additive mount must not regress S1.** `notes-surface.tsx` gains a wrapping `<View>` + the box above the
  collection; re-run S1's `notes-surface` tests + the full suite, and the Visual Gate re-asserts the collection renders.

## 9. Performance budget (§XXII)

The hook holds one `query` string; the async outcome is owned by the reused `useCommandSearch` (one race-guarded
`useEffect` per query, last-wins — `[FACT: use-command-search.ts:13-31]`); no list work in M1 (the stub resolves
immediately to `search-unavailable`). A future DB-8 refinement (query debounce ≈200ms) belongs in `useCommandSearch` so
both consumers inherit it — not re-solved here. N/A-trivial for the stub; stated per §XXII.
