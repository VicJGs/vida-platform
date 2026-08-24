<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A3 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in docs/features/notes-and-pages/delivery/{slice-map,
     seam-contract,interpretation}.md + the aspect docs (business-rules NP-7, conventions:8,22) + real code cites.
     No-Guessing: every claim is [FACT: path:line]. -->
<!-- ground-truth docs referenced by bare filename below all live at docs/features/notes-and-pages/ (+ delivery/) -->

# A3 — resolveWikiLink  (MOD-notes ① · slice A3)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = the Entity Front Matter
(`delivery/{slice-map,seam-contract,interpretation}.md`) + the aspect docs (`business-rules.md` NP-7,
`conventions.md:8,22`) + the shipped A1/A2 `service.ts`. `current-*` remain residue of the removed ① — not
consulted; §XXIX regenerates them at the A-track close.

## 1. Context & scope
A3 adds **one read method** — the `[[`-picker's candidate source — to the SAME `services/notes/service.ts`:
`resolveWikiLink(text) → PageRow[]`, a title search (LIKE) over live `pages`. It is the smallest ① slice.

**In scope (the frozen seam row tagged A3 — `seam-contract.md:23`, `slice-map.md:18`):**
- `resolveWikiLink(text: string): Promise<PageRow[]>` — title candidates via `like(pages.title, %text%)`, live-only.

**Explicitly OUT (later slices / other planes — do NOT build):**
- **create-on-miss is NOT here** — `resolveWikiLink` does NOT create (**IR-4** `[FACT: interpretation.md:89]`). The
  "+ Create" affordance is a **caller compose** (B3: `createPage` stub `note` → `createPageLink`), never silent
  `[FACT: conventions.md:8; business-rules.md:31,39]`.
- **resolve-by-id / link binding** = B3 (the picker binds the selected id via A2 `createPageLink`) — not A3.
- **encrypted-title search** (when `title` becomes real `[E]` at M3) → **DB-8 FTS5 / blind-index**, deferred; M1.0
  is empty-`[E]` pass-through so `title` is plaintext and directly LIKE-able now `[FACT: business-rules.md:11 NP-3;
  schema/notes.ts:41-42 title [E]; BR-DB6-3 M1.0 pass-through]`.
- **result capping / pagination** — `findWhere(SQL)` has no LIMIT seam `[FACT: repository.ts:379]`; the picker (B3)
  caps its dropdown. A3 returns all live matches.

**Pattern to mirror (read before authoring):** the **match semantics = the E4 slash-menu filter** — B3 mirrors E4
(`slice-map.md:32`), so `resolveWikiLink`'s match mirrors `filterSlashItems` (case-insensitive substring, trim,
empty→all) `[FACT: packages/editor/src/slash-commands.ts:203-215]`. Same file: the A1 `live(pred)` closure (appends
`isNull(deleted_at)`) `[FACT: services/notes/service.ts:35]`; read getters return the repo promise directly
(`getPagesByType`) `[FACT: services/notes/service.ts:74-76]`.

## 2. Business rules (invariants A3 must hold)
- **BR-A3-1 · Title search, NOT title-resolution (NP-7).** A3 searches titles to produce **candidates** the user
  picks; it never resolves a stored link by title. NP-7's "never match by title at render" governs the *render*
  path, not the *picker search* — the picker explicitly queries titles `[FACT: conventions.md:8; business-rules.md:15
  NP-7; conventions.md:22]`. Return type is `PageRow[]` (candidates), never a single resolved page.
- **BR-A3-2 · Does NOT create (IR-4).** `resolveWikiLink` is pure-read; a no-match returns `[]`, never a stub page.
  Create-on-miss is B3's explicit compose `[FACT: interpretation.md:89 IR-4; business-rules.md:39]`.
- **BR-A3-3 · Live-only (N7/IR-6).** Reuse the A1 `live(pred)` closure so every result appends
  `isNull(pages.deleted_at)` — soft-deleted pages are never candidates `[FACT: services/notes/service.ts:35;
  repository.ts:379-382]`.
- **BR-A3-4 · Case-insensitive SUBSTRING match — doc-fixed by the E4 mirror (BR-E4-7).** B3 **mirrors the E4
  slash-menu** `[FACT: slice-map.md:32]`, whose filter is a **case-insensitive substring over the title**
  (`filterSlashItems`, BR-E4-7: `q = query.trim().toLowerCase()`; `title.toLowerCase().includes(q)`)
  `[FACT: packages/editor/src/slash-commands.ts:203-215]`. `resolveWikiLink` implements that SAME match at the query
  layer: `like(pages.title, '%'+q+'%')` with `q = text.trim()` — SQLite `LIKE` is ASCII-case-insensitive by default,
  the query-layer equivalent of E4's `.toLowerCase().includes()`. So `contains` (not `prefix`) is the DOCUMENTED
  behavior, not a choice. The value is drizzle-parameter-bound (no injection). No `ESCAPE` clause (M1.0): a literal
  `%`/`_` broadens the match — parameterized, acceptable; proper Unicode folding + ranking = FTS5/DB-8, deferred.
- **BR-A3-5 · Empty/whitespace query → ALL live pages (mirror E4 `if (!q) return items`).** `text.trim()` empty →
  return every live page (`pageRepo.findWhere(isNull(pages.deleted_at))`, the A1 `listPages({})` path), mirroring
  E4's empty-query branch `[FACT: slash-commands.ts:210-211]`. NOT `[]` — a bare `[[` browses pages exactly as a bare
  `/` browses blocks in E4; B3 caps/orders the dropdown (no LIMIT seam, §1 OUT). A **non-empty** query with no title
  hit still returns `[]` (E4's `.filter` with no match), distinct from the empty-query browse.
  **Cost note:** empty→all is O(all live pages) with full L2 decrypt (`findWhere`→`decryptAll`, `repository.ts:379-382`)
  — E4 mirrors a bounded ~26-item list onto an unbounded table, so this is the one place the mirror leaks. Acceptable
  at M1.0 volumes (single-user local SQLite, hundreds–low-thousands of pages); a query-level LIMIT seam + result
  ordering ride the FTS5/DB-8 work, deferred.
- **BR-A3-6 · Returns Drizzle `PageRow[]`.** Not `@vida/types` `Page` (DB-11 reconcile is not this entity's job —
  baseline C2). No new validator (input is a plain `string`), no new typed error.

## 3. Contract (the A3 surface ② will bind to)
```ts
export interface NotesService {                    // GROWS per slice; A3 appends ONE row
  // …A1 + A2 rows unchanged…
  resolveWikiLink(text: string): Promise<PageRow[]>   // title substring candidates (live-only); empty→all live pages, [] on no-match; never creates
}
```
- `②` consumer: **B3** (`[[` picker) `[FACT: seam-contract.md:39; slice-map.md:32]` — calls `resolveWikiLink` for
  the dropdown, then on select binds A2 `createPageLink` (create-on-miss = `createPage` stub → `createPageLink`).
- No `types.ts` import change (PageRow already imported at A2); `service.ts` adds `like` to the `drizzle-orm` import.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A3 — resolveWikiLink')` in the same test file (reuse A1 `setup()`):**
   - returns pages whose `title` **contains** the query (substring), case-insensitive (e.g. seed "Meeting Notes",
     query "meeting" → hit).
   - **mid-string** substring — pins the E4-mirror match (BR-A3-4): seed "Weekly Meeting Notes", query "meeting" →
     hit (a prefix-only `q%` match would MISS it, so this test locks the documented `contains`).
   - returns **multiple** candidates when titles collide (NP-7: seed two pages titled "Project" → both returned).
   - **excludes soft-deleted** (create → `softDeletePage` → the title no longer resolves) — BR-A3-3.
   - **empty / whitespace** query → **ALL live pages** (mirror E4 `if(!q) return items`): seed N pages,
     `resolveWikiLink('')` and `resolveWikiLink('   ')` → length N; soft-delete one → length N−1 — BR-A3-5.
   - **non-empty no-match** → `[]` (distinct from empty-browse): `resolveWikiLink('zzz-no-such-title')` → length 0.
   - **does NOT create (IR-4):** a no-match query mints nothing — `getPagesByType('note')` count is unchanged
     before/after `resolveWikiLink('zzz-no-such-title')` — BR-A3-2.
   - searches across page types (a `journal` + a `note` with a shared title token both surface).
2. **Live-DB smoke (REAL DB — N1):** the cases run after `initVault()` on real better-sqlite3; the create+resolve
   round-trip is itself the smoke (a real write ran `hashContent`).
3. **Green bars:** `pnpm --filter @vida/core test` all green (A1+A2 stay green — same file) · root `typecheck` 0 ·
   `eslint` 0.
4. **§XXIX currency:** deferred to the A-track close (current-* still describe the removed ①) — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `services/notes/types.ts` — append one interface row: `resolveWikiLink(text: string): Promise<PageRow[]>`.
2. `services/notes/service.ts` — add `like` to `import { and, eq, isNull, like, type SQL } from 'drizzle-orm'`; add
   the method (reusing the A1 `live` closure):
   ```ts
   async resolveWikiLink(text) {
     const q = text.trim()
     // BR-A3-5: mirror E4 `if (!q) return items` — empty query browses ALL live pages (B3 caps the dropdown).
     if (q.length === 0) return pageRepo.findWhere(isNull(pages.deleted_at))
     // BR-A3-4: E4-mirror case-insensitive SUBSTRING (filterSlashItems) at the query layer; live-only via `live`.
     return live(like(pages.title, `%${q}%`))
   }
   ```
3. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A3 — resolveWikiLink` cases.
4. Do NOT touch current-* (A-track close, §XXIX). Do NOT add create-on-miss (IR-4 — that's B3).

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to decide or escalate:
- title search returns candidates, never resolves-by-title → BR-A3-1 (`NP-7` · `conventions:8,22`).
- no create-on-miss → BR-A3-2 (`IR-4` · `business-rules:39`).
- **case-insensitive SUBSTRING match (`contains`, not `prefix`)** → BR-A3-4, doc-fixed by the **E4 mirror**:
  B3 mirrors the E4 slash-menu (`slice-map:32`) whose filter is BR-E4-7 substring (`slash-commands.ts:203-215`).
  *(This corrected a first-pass drift where I mis-read it as an unfixed choice; the "mirrors E4" pointer fixes it.)*
- **empty/whitespace → ALL live pages** (mirror E4 `if(!q) return items`, `slash-commands.ts:210-211`); non-empty
  no-match → `[]` → BR-A3-5.
- no cap, no encrypted-search → §1 OUT (`repository.ts:379` no LIMIT seam; encrypted-title = DB-8/M3, deferred).
- no new validator/error, returns `PageRow[]` → BR-A3-6 (baseline C2).
