<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A2. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a2-page-links.md (§2 rules, §4 acceptance). Extends the A1 files in place. -->

# IMPLEMENTATION-PLAN — A2 page_links (write + read)

**Home:** `packages/core/src/services/notes/` (exists — A1). A2 **edits** `types.ts` + `service.ts` and **appends**
to `__tests__/notes-service.test.ts`. No new file, no barrel change (already exports `*`).
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified import surface (all confirmed on disk)
- `pageLinks`, `type PageLinkRow` — `../../db/schema/notes` `[FACT: schema/notes.ts:70,106]` (alongside the A1
  `pages`/`PageRow` import already present at service.ts:19).
- `and`, `eq`, `isNull`, `type SQL` — `drizzle-orm` (already imported in service.ts:16 — no import change needed).
- `createRepository`, `type DrizzleDb` — already imported (A1).
- No new validator, no `@vida/types` change, no new error class.

## Build step 1 — `services/notes/types.ts` (edit)
1. Extend the schema import to carry the link row type:
   ```ts
   import type { PageRow, PageLinkRow } from '../../db/schema/notes'   // was: PageRow only (line 16)
   ```
2. Append the 4 A2 rows to the `NotesService` interface (after the A1 `listPages` row, keep the `// --- pages (A1)`
   comment block; add a `// --- page_links (A2)` block):
   ```ts
     // --- page_links (A2) -------------------------------------------------------
     createPageLink(source: string, target: string, context?: string | null): Promise<PageLinkRow>
     removePageLink(source: string, target: string): Promise<void>
     getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>
     getPageLinksTo(pageId: string): Promise<PageLinkRow[]>
   ```
   No new error class (§2 BR-A2-1: the UNIQUE clash is absorbed by revive, never surfaced).

## Build step 2 — `services/notes/service.ts` (edit inside `createNotesService`)
1. Extend the schema import: `import { pages, pageLinks, type PageRow, type PageLinkRow } from '../../db/schema/notes'`.
2. After `pageRepo` (line 32) add the link repo — same M1.0 empty-`[E]` soft-delete config (BR-A2-6):
   ```ts
   const pageLinkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })
   ```
3. After the A1 `live` closure (line 35) add the twin for links (BR-A2-3) — **distinct name**, `live` is the pages one:
   ```ts
   // N7/IR-6: verbatim findWhere → append isNull(deleted_at). Twin of `live` for the page_links table.
   const livePageLinks = (pred: SQL): Promise<PageLinkRow[]> =>
     pageLinkRepo.findWhere(and(pred, isNull(pageLinks.deleted_at))!)
   ```
4. Append the 4 methods to the returned object literal (after `listPages`), mirroring `createLink`/`removeLink`:
   ```ts
   // --- page_links (A2) --------------------------------------------------------
   async createPageLink(source, target, context) {
     // BR-A2-1/IR-11: revive-or-noop. findWhere the business key INCLUDING soft-deleted (the one read that
     // does NOT filter deleted) — the FULL UNIQUE(source,target) means a soft-deleted row still holds the key.
     const existing = await pageLinkRepo.findWhere(
       and(eq(pageLinks.source_page_id, source), eq(pageLinks.target_page_id, target))!,
     )
     if (existing.length > 0) {
       const row = existing[0]
       if (row.deleted_at != null) {
         // BR-A2-2: revive — stable id, context re-supplied by this call (mirror createLink).
         return pageLinkRepo.update(row.id, { deleted_at: null, context: context ?? null })
       }
       return row // idempotent no-op — context left untouched (BR-A2-2)
     }
     return pageLinkRepo.create({ source_page_id: source, target_page_id: target, context: context ?? null })
   },

   async removePageLink(source, target) {
     // BR-A2-4: resolve-then-soft-delete by business key. `liveRow` (NOT `live` — that shadows the A1 pages closure).
     const existing = await pageLinkRepo.findWhere(
       and(eq(pageLinks.source_page_id, source), eq(pageLinks.target_page_id, target))!,
     )
     const liveRow = existing.find((r) => r.deleted_at == null)
     if (liveRow) await pageLinkRepo.delete(liveRow.id) // soft-delete → enqueue operation:'update'
   },

   getPageLinksFrom(pageId) {
     return livePageLinks(eq(pageLinks.source_page_id, pageId))
   },

   getPageLinksTo(pageId) {
     return livePageLinks(eq(pageLinks.target_page_id, pageId)) // reverse read — idx_page_links_target
   },
   ```
Notes:
- `const row = existing[0]` (not `existing[0]!`) — `noUncheckedIndexedAccess` is **off** in `@vida/core`
  (tsconfig.base has `strict:true` only) so `row` is `PageLinkRow`; this is the exact `createLink` precedent
  `[FACT: foundation/spaces/service.ts:167-168]`. (When the parked `tsconfig-strict-index-access` lands, AR-6 + A2 flip together.)
- `context` is optional in the signature; the object-literal method's inferred param types come from the
  `NotesService` interface, so `context` is `string | null | undefined` → `context ?? null` normalizes it.
- The `existing.find(...)` local is named `liveRow` precisely to avoid shadowing the module-scope `live` closure
  (BR-A2-4 / spec §5). (eslint has no `no-shadow` rule here — the rename is for correctness/clarity, not to satisfy
  a lint; a shadow would compile but confuse.) The **code comment must not claim eslint flags it.**

## Build step 3 — barrel
No change. `services/notes/index.ts` already `export * from './service'` + `./types`; the new interface rows and
methods ride the existing `*` export.

## Build step 4 — `services/notes/__tests__/notes-service.test.ts` (append)
Add a new `describe('A2 — page_links', () => { … })` block; reuse the existing `setup()` (async, returns `{svc, db}`).
Cases (spec §4):
1. **create fresh:** `createPageLink('a','b','ctx')` → row with `source_page_id==='a'`, `target_page_id==='b'`,
   `context==='ctx'`, `id` + `_sync_hash` truthy (**live-DB smoke, N1** — a real write ran `hashContent`).
2. **idempotent no-op:** call `createPageLink('a','b')` twice → same `id`; `getPageLinksFrom('a')` has length 1.
3. **revive-or-noop (IR-11):** `createPageLink('a','b','ctx1')` → `removePageLink('a','b')` →
   `createPageLink('a','b','ctx2')` → returns the **SAME id**, `deleted_at == null`, `context === 'ctx2'`.
4. **live no-op preserves context (BR-A2-2 asymmetry):** `createPageLink('a','b','ctx1')` then
   `createPageLink('a','b','other')` (no remove between) → returned row `context === 'ctx1'` (live path untouched),
   still one row.
5. **removePageLink excludes from reads (N7) + double-unlink no-op:** after `removePageLink('a','b')`,
   `getPageLinksFrom('a')` is empty and `getPageLinksTo('b')` is empty; a 2nd `removePageLink('a','b')` does not throw.
6. **directional reads:** with links a→b and a→c and d→b: `getPageLinksFrom('a')` = 2 (b,c);
   `getPageLinksTo('b')` = 2 (a,d) — the reverse read (`idx_page_links_target`) exercised.

## Build step 5 — currency
Do NOT touch `current-*` (they describe the removed ①). §XXIX regenerates them at the A-track close.

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1's 13 stay green — same file) · root `pnpm typecheck` 0 · `pnpm lint` 0.
Then A2's ░Verification Gate░ (post-impl critique) before A3.

## Deviation note
Any change to a landed seam signature → §XXVIII. If `existing[0]` typechecking surprises (it should not — AR-6
precedent), that is a codebase-wide tsconfig fact, not an A2 divergence; record in the task Route History.
