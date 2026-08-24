<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A3. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a3-resolve-wiki-link.md (§2 rules, §4 acceptance). Extends the A1/A2 files in place. -->

# IMPLEMENTATION-PLAN — A3 resolveWikiLink

**Home:** `packages/core/src/services/notes/` (exists — A1/A2). A3 **edits** `types.ts` (one interface row) +
`service.ts` (one `like` import + one method) and **appends** to `__tests__/notes-service.test.ts`. No new file.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified import surface (all confirmed on disk)
- `like` — add to the existing `import { and, eq, isNull, type SQL } from 'drizzle-orm'` at `service.ts:16`
  `[FACT: drizzle-orm 0.45.1 exports like(column: Column|SQL.Aliased|SQL, value: string|SQLWrapper): SQL —
  conditions.d.ts:325]`. `pages`, `PageRow`, `pageRepo`, the `live` closure — all already present (A1/A2).
- No `types.ts` import change (`PageRow` already imported at A2). No new validator, no `@vida/types` change, no error.

## The match semantics — mirror E4 `filterSlashItems` (the doc source, BR-E4-7)
`[FACT: packages/editor/src/slash-commands.ts:210-215]` — `q = query.trim().toLowerCase()`; `if (!q) return items`;
`items.filter(it => it.title.toLowerCase().includes(q))`. A3 = the SAME at the query layer:
- `q = text.trim()` (SQLite LIKE folds ASCII case → no JS `.toLowerCase()` needed).
- empty `q` → ALL live pages (`pageRepo.findWhere(isNull(pages.deleted_at))`).
- non-empty `q` → `live(like(pages.title, '%'+q+'%'))` (substring; live-only via the A1 closure).

## Build step 1 — `services/notes/types.ts` (edit)
Append ONE row to the `NotesService` interface (after the A2 `getPageLinksTo` row; new `// --- wiki (A3)` block):
```ts
  // --- wiki (A3) -------------------------------------------------------------
  // Title candidates for the [[ picker (B3). Match mirrors the E4 slash-menu filter
  // (case-insensitive substring, empty→all live pages). Never creates (IR-4).
  resolveWikiLink(text: string): Promise<PageRow[]>
```

## Build step 2 — `services/notes/service.ts` (edit)
1. Import: `import { and, eq, isNull, like, type SQL } from 'drizzle-orm'` (add `like`).
2. Append the method to the returned object literal (after `getPageLinksTo`):
```ts
    // --- wiki (A3) -----------------------------------------------------------
    async resolveWikiLink(text) {
      const q = text.trim()
      // BR-A3-5: mirror E4 `if (!q) return items` — a bare [[ browses ALL live pages (B3 caps the dropdown).
      if (q.length === 0) return pageRepo.findWhere(isNull(pages.deleted_at))
      // BR-A3-4: E4-mirror case-insensitive SUBSTRING (filterSlashItems); live-only via the A1 `live` closure.
      return live(like(pages.title, `%${q}%`))
    },
```
Notes:
- `async` so the empty branch can `return pageRepo.findWhere(...)` and the match branch `return live(...)` uniformly
  (both `Promise<PageRow[]>`; the async wrapper resolves them).
- No `.toLowerCase()` on `q` — SQLite `LIKE` is ASCII-case-insensitive by default; adding it would LOSE-case the
  bound value and still match (harmless) but is redundant. Leave it off (the query does the folding).
- `%${q}%` — template literal; `q` is drizzle-parameter-bound (no injection). No `ESCAPE` clause (M1.0).

## Build step 3 — barrel
No change (the `*` export already carries the new interface row + method).

## Build step 4 — `services/notes/__tests__/notes-service.test.ts` (append)
Add a new `describe('A3 — resolveWikiLink', () => { … })`; reuse the existing `setup()`. Cases (spec §4):
1. **substring hit, case-insensitive:** seed page titled "Meeting Notes"; `resolveWikiLink('meeting')` → 1 hit.
2. **mid-string substring (locks contains, not prefix):** seed "Weekly Meeting Notes"; `resolveWikiLink('meeting')`
   → hit (id matches). A prefix `q%` would miss → this pins the E4-mirror behavior.
3. **multiple candidates (NP-7):** seed two pages both titled "Project"; `resolveWikiLink('project')` → length 2.
4. **excludes soft-deleted (BR-A3-3):** seed "Gone"; `resolveWikiLink('gone')` → 1; `softDeletePage(id)`;
   `resolveWikiLink('gone')` → 0.
5. **empty/whitespace → ALL live pages (BR-A3-5):** seed N pages (mix of types); `resolveWikiLink('')` → N;
   `resolveWikiLink('   ')` → N; soft-delete one → `resolveWikiLink('')` → N−1.
6. **non-empty no-match → [] (distinct from empty-browse):** `resolveWikiLink('zzz-nope')` → 0.
7. **does NOT create (IR-4, BR-A3-2):** capture `getPagesByType('note')` length; `resolveWikiLink('zzz-nope')`;
   re-capture → unchanged (no stub minted).
8. **searches across page types:** seed a `journal` titled "Trip Log" + a `note` titled "Trip Ideas";
   `resolveWikiLink('trip')` → 2 (title search is type-agnostic).
Live-DB smoke (N1): the whole block runs after `initVault()` on real better-sqlite3 (via `setup()`); the `createPage`
seeds exercise `hashContent` (the write path), and `resolveWikiLink` (pure-read) round-trips the persisted rows back.

## Build step 5 — currency
Do NOT touch `current-*` (they describe the removed ①). §XXIX regenerates them at the A-track close.

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1's 13 + A2's 6 stay green — same file) · root `pnpm typecheck` 0 ·
`eslint` 0 on the notes dir. Then A3's ░Verification Gate░ (post-impl critique) before A4.

## Deviation note
Any change to a landed seam signature → §XXVIII. The match semantics are frozen to the E4 mirror; a divergence
(prefix, keyword-arm, LIMIT) would be a new decision requiring the deviation loop — record in Route History.
