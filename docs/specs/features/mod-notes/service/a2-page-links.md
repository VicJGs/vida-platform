<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A2 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in delivery/{slice-map,seam-contract,interpretation,baseline}.md
     + the real code cites below. No-Guessing: every claim is [FACT: path:line] or a flagged DECISION. -->

# A2 — page_links (write + read)  (MOD-notes ① · slice A2)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface (no frontend-source-of-truth gate). Ground truth = the
Entity Front Matter (`docs/features/notes-and-pages/delivery/{slice-map,seam-contract,interpretation,baseline}.md`) + the shipped schema/code
(the A1 `service.ts`/`types.ts` this slice extends). The context's `current-*` docs remain **residue of the
removed ①** (task Goal) — NOT consulted; §XXIX regenerates them after the A-track lands.

## 1. Context & scope
A2 adds the **wiki-style page↔page link** surface to the SAME `services/notes/service.ts` A1 stood up — the
first *relational* write in the Notes service, and the substrate the `[[`-picker (B3) and Neural note-graph (B5)
consume. It is a junction table, so it inherits the AR-6 **idempotent revive-or-noop** discipline verbatim.

<!-- ground-truth docs referenced by bare filename below all live at docs/features/notes-and-pages/delivery/ -->

**In scope (the frozen seam rows tagged A2 — `seam-contract.md:21-22`):**
- `createPageLink(source, target, context?)` → `PageLinkRow` — **idempotent, revive-or-noop** (NP-5 / IR-11).
- `removePageLink(source, target)` → `void` — resolve-then-soft-delete by business key.
- `getPageLinksFrom(pageId)` → `PageLinkRow[]` — forward read (`source_page_id = pageId`).
- `getPageLinksTo(pageId)` → `PageLinkRow[]` — the **reverse read deferred from AR-8 → M1.1** (`idx_page_links_target`).

**Explicitly OUT (later slices — do NOT build):** `resolveWikiLink` (A3 — title search + create-on-miss compose),
`ensureEntityNote` (A4), tag reads + link/tag facade + `getBacklinks` merge (A5), attachments (A6), summary (A7),
cascade cleanup (A8). A2 does **not** cascade on `softDeletePage` — that is A8 (N8/IR-13). A2 does **not** touch the
`_deps` (`{spaces, backlinks, registry}`) — page_links is page↔page, has no `entity_type`, so no registry check.

**Pattern to mirror (same layer — read before authoring):** `foundation/spaces/service.ts` — `createLink`
(idempotent revive-or-noop) `[FACT: spaces/service.ts:158-180]`, `removeLink` (resolve-then-soft-delete)
`[FACT: spaces/service.ts:182-192]`, `tagEntity` (the junction template) `[FACT: spaces/service.ts:128-143]`.
The A1 factory shape (`live` closure, empty-`[E]` `cfg`, object-literal-no-`this`) `[FACT: services/notes/service.ts:24-92]`.
Repository CRUD `[FACT: db/repository.ts:236-497]`. Memory [[factory-service-no-this-for-intra-calls]].

## 2. Business rules (invariants A2 must hold)
- **BR-A2-1 · NP-5 idempotent link = revive-or-noop (IR-11) — MANDATORY, not optional.** `createPageLink`
  `findWhere`s the business key `(source_page_id, target_page_id)` **including soft-deleted rows** →
  **live row → idempotent no-op** (return it unchanged) · **soft-deleted row → revive**
  (`update(id, {deleted_at:null, context})`, reusing the SAME id) · **absent → create**. This is forced by the DDL:
  `UNIQUE(source_page_id, target_page_id)` is a **FULL** unique index (no `WHERE deleted_at IS NULL`)
  `[FACT: migrations/012_notes.ts:78]`, so a soft-deleted row still occupies the key — a plain re-insert after an
  unlink→relink would hit the raw SQLite UNIQUE collision. Revive avoids it.
  `[FACT: interpretation.md IR-11; business-rules.md:13 NP-5; seam-contract.md:21; spaces/service.ts:158-180]`.
  (The DDL makes this the inverse of `pages`: journal uniqueness is a *partial* index → soft-deleted rows fall out
  → A1 create-fresh; `page_links` is a junction with a FULL unique → IR-11 revive. Both doc-fixed, opposite answers.)
- **BR-A2-2 · `context` on the three paths (doc-fixed by IR-11's cited mechanism).** create → store `context ?? null`;
  **revive → set** `context` to the reviving call's value (`?? null`); **live no-op → leave `context` untouched**
  (return the row as-is). IR-11 fixes this to the `createLink` mechanism it cites — the revived row's `id` is stable,
  its `context` is re-supplied by the reviving call `[FACT: interpretation.md IR-11 → spaces/service.ts:167-179]`.
- **BR-A2-3 · N7/IR-6 soft-delete predicate discipline.** `findWhere` runs the predicate **verbatim** (no
  auto-notDeleted) `[FACT: repository.ts:379-382]` → **every A2 read appends `isNull(pageLinks.deleted_at)`**;
  drizzle `and()` is `SQL|undefined` → the `!` suffix. The idempotency `findWhere` (BR-A2-1) is the ONE read that
  deliberately does **not** filter deleted (it must see the soft-deleted row to revive it) — matching AR-6.
- **BR-A2-4 · removePageLink = resolve-then-soft-delete.** `findWhere` the business key, pick the **live** row
  (`deleted_at == null`), `repo.delete(liveRow.id)` (soft, sets `deleted_at`, enqueues `operation:'update'`)
  `[FACT: repository.ts:457-465; spaces/service.ts:182-192]`. No live row → **no-op** (idempotent unlink).
- **BR-A2-5 · N1/IR-3 libsodium is a HARD boot dep even at empty-`[E]`.** `create`/`update`/`delete` all stamp
  `_sync_hash` via `hashContent` `[FACT: repository.ts:169,340,432]` → `initVault()` must precede the first write.
  A2's Verification Gate live-DB smoke exercises a real `createPageLink` to catch a regression (§4).
- **BR-A2-6 · N2 deviceId + N9 empty-`[E]` pass-through.** `pageLinkRepo = createRepository(db, pageLinks,
  {deviceId, encryptedFields: [], softDelete: true})` `[FACT: mirrors spaces/service.ts:69]`. `context` is `[E]`-marked
  in schema `[FACT: schema/notes.ts:76-77]` but M1.0 registers an EMPTY `[E]` set → pass-through (the M3 target).
- **BR-A2-7 · Validate-shape + return Row.** No new Zod validator (page_links carries no user-authored enum;
  `source`/`target`/`context` are ids/text) — inputs are `string`/`string | null`. Returns the Drizzle `PageLinkRow`
  (`pageLinks.$inferSelect`) `[FACT: schema/notes.ts:106]`, NOT `@vida/types` `PageLink` (DB-11 reconcile is not
  this entity's job — baseline C2). `create`/`update` remain async (repository is async); reads return the
  repository promise directly (mirror A1 `getPagesByType`).
- **BR-A2-8 · IR-12 sync-queue coalescing (inherited, not A2 code).** Each mutation co-enqueues a `sync_queue` row
  UPSERT-coalesced by `(table_name, row_id, operation)` `[FACT: repository.ts:261-289]` — repeated pre-flush writes
  of the same link+op collapse; a revive (`update`) and a prior `create` stay distinct ops. A2 relies on this; it
  asserts nothing new about it.
- **BR-A2-9 · No reference validation, no self-link guard (doc-fixed by IR-1 + IR-4).** A2 does **not** verify that
  `source`/`target` reference live `pages` — there is no FK and cascade/existence is service-authored elsewhere
  `[FACT: interpretation.md IR-1; notes.ts:74-75 plain TEXT no-FK]`; create-on-miss is A3's caller compose, never
  inside the link write `[FACT: interpretation.md IR-4]`. A self-link (`source === target`) is not rejected — no
  business rule or envision EC defines such a guard, and AR-6 `createLink` guards no analogous case. The absence of a
  documented guard is the rule.

## 3. Contract (the A2 surface ② will bind to)
```ts
export interface NotesService {                              // GROWS per slice; A2 appends these 4 rows
  // …A1 rows unchanged…
  createPageLink(source: string, target: string, context?: string | null): Promise<PageLinkRow> // idempotent, revive-or-noop
  removePageLink(source: string, target: string): Promise<void>                                  // resolve-then-soft-delete; no-op if none live
  getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>                                        // source_page_id = pageId, live only
  getPageLinksTo(pageId: string): Promise<PageLinkRow[]>                                          // target_page_id = pageId, live only (idx_page_links_target)
}
// types.ts — add the PageLinkRow import; NO new typed error (the UNIQUE clash is absorbed by revive, not surfaced)
import type { PageRow, PageLinkRow } from '../../db/schema/notes'
```
- `②` consumers of these rows: **B3** (`createPageLink` on `[[` select) · **B4** (`getPageLinksTo` in the Backlinks
  panel) · **B5** (`getPageLinksFrom` for graph edges) `[FACT: seam-contract.md:39-41]`.
- Returned arrays are always `isNull(deleted_at)`-filtered; `createPageLink` always returns a **live** row (created
  or revived).

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest (logic + failure) — new `describe('A2 — page_links')` in the same test file:**
   - `createPageLink` creates a fresh link (`source`/`target`/`context` persisted; `id`/`_sync_hash` truthy).
   - **idempotent no-op:** two identical `createPageLink(a,b)` → same `id`; `getPageLinksFrom(a)` has length 1.
   - **revive-or-noop (IR-11):** `create(a,b)` → `removePageLink(a,b)` → `create(a,b,'ctx2')` returns the **SAME id**,
     `deleted_at == null`, `context === 'ctx2'` (revive refreshes context, BR-A2-2).
   - **context asymmetry:** a live no-op re-`create(a,b,'other')` returns the row with the **original** context
     (live path does not touch it, BR-A2-2).
   - `removePageLink` soft-deletes → `getPageLinksFrom`/`getPageLinksTo` exclude it (N7); a second `removePageLink`
     on an already-unlinked pair is a **no-op** (no throw).
   - `getPageLinksFrom(a)` returns only links whose source is `a`; `getPageLinksTo(b)` returns only links whose
     target is `b` (reverse read exercised).
2. **Live-DB smoke (REAL DB, not a mock — catches N1):** after `initVault()`, a real `createPageLink` persists +
   round-trips (`_sync_hash` stamped, re-read via `getPageLinksFrom`).
3. **Green bars:** `pnpm --filter @vida/core test` all green (A1's 13 stay green — same file) · root `typecheck` 0 ·
   `eslint` 0.
4. **§XXIX currency:** deferred to the A-track close (current-* still describe the removed ①) — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `services/notes/types.ts` — extend the `NotesService` interface with the 4 A2 rows; add `PageLinkRow` to the
   `schema/notes` type import. No new error class.
2. `services/notes/service.ts` — inside `createNotesService`:
   - add `const pageLinkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })`
     and import `pageLinks, type PageLinkRow` from `../../db/schema/notes`;
   - add a `livePageLinks(pred: SQL)` closure appending `isNull(pageLinks.deleted_at)` (twin of A1 `live`);
   - `createPageLink` (async): `findWhere(and(eq source, eq target)!)` **without** the deleted filter → no-op /
     revive / create (mirror `createLink`);
   - `removePageLink` (async): `findWhere(...)` → `existing.find(r => r.deleted_at == null)` as **`liveRow`**
     (NOT `live` — that name is the A1 pages closure; avoid the shadow) → `delete(liveRow.id)` if present;
   - `getPageLinksFrom`/`getPageLinksTo` → `livePageLinks(eq(...))` (non-async, return the promise).
3. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A2 — page_links` cases (reuse the A1 `setup()`).
4. Do NOT touch current-* (A-track close, §XXIX). Do NOT add cascade (A8).

## 6. No open decisions
Every behavior A2 must exhibit is doc-fixed — there is nothing to decide, only to implement per the cited sources:
- revive-or-noop (not create-fresh, not `DuplicateLinkError`) → BR-A2-1 (`IR-11` · `NP-5` · `seam-contract:21`; the
  aspect contract's tentative "no-op **or** `DuplicateLinkError`" was already resolved to idempotent no-op by the
  interpretation layer + seam).
- `context` re-supplied on revive, untouched on live no-op → BR-A2-2 (`IR-11` → `createLink`).
- no reference/self-link validation → BR-A2-9 (`IR-1` no-FK · `IR-4` create-on-miss is A3).
- no new typed error → the seam lists none for `createPageLink` (`seam-contract:21`), unlike `createPage`'s
  `JournalExistsError` (NP-2 is a uniqueness *error*; NP-5 is idempotent).
