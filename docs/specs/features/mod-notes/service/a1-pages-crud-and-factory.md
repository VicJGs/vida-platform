<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A1 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in delivery/{slice-map,seam-contract,interpretation,baseline}.md
     + the real code cites below. No-Guessing: every claim is [FACT: path:line] or a flagged DECISION. -->

# A1 — pages CRUD + service factory  (MOD-notes ① · slice A1)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface (no frontend-source-of-truth gate). Ground truth = the
Entity Front Matter (`delivery/intake·baseline·interpretation·envision·slice-map·seam-contract`) + the shipped
schema/code. The context's `current-spec.md`/`current-business-rules.md` are **residue of the removed ①**
(task Goal) — NOT consulted; §XXIX regenerates them after the A-track lands.

## 1. Context & scope
A1 stands up the Notes service **factory** and the `pages` table CRUD — the foundation every later ① slice
(A2-A8) extends in the same `service.ts`. It is the first code of the ground-zero rebuild.

**In scope (the frozen seam rows tagged A1):**
- Factory `createNotesService(db, deviceId, _deps: NotesServiceDeps): NotesService` `[FACT: seam-contract.md:8]`.
- `createPage(input)` → `PageRow` · **`JournalExistsError`** (NP-2) · Zod async-reject.
- `getPage(id)` · `updatePage(id, patch)` (`.strict()`, IR-9) · `softDeletePage(id)`.
- `getPageByJournalDate(date)` · `getPagesByType(type)` · `getPagesForEntity(entityType, entityId)`.
- `listPages({favorite?, archived?, tag?})` — favorite/archived branches (see D-2 for the `tag` branch).

**Explicitly OUT (later slices — do NOT build):** page_links (A2), resolveWikiLink (A3), ensureEntityNote (A4),
tag reads + link/tag facade (A5), attachments (A6), summary (A7), cascade cleanup (A8). The `_deps`
(`{spaces, backlinks, registry}`) are accepted to freeze the signature but **unused until A5** — hence the `_`
prefix (`[FACT: eslint.config.js:12 argsIgnorePattern:'^_']`).

**Pattern to mirror (same layer — read before authoring):** `foundation/spaces/service.ts` (factory = object
literal, no `this`, intra-calls via closures, empty-`[E]` `cfg`, `findWhere(and(...)!)`)
`[FACT: spaces/service.ts:63-74,128-143]`; `db/repository.ts` (create/update/delete/findWhere)
`[FACT: repository.ts:236-497]`. Factory-service memory [[factory-service-no-this-for-intra-calls]].

## 2. Business rules (invariants A1 must hold)
- **BR-A1-1 · NP-2 one journal per date.** `createPage({type:'journal'})` must reject a duplicate live journal on
  the same `journal_date` with **`JournalExistsError(journalDate)`**. The partial-UNIQUE index
  `idx_pages_journal_unique` is SQL-migration-only `[FACT: schema/notes.ts:65]` → the service pre-checks via
  `findWhere(and(eq type 'journal', eq journal_date, isNull deleted_at)!)`; the DB index is the backstop.
- **BR-A1-2 · IR-9 immutable journal identity.** `updatePage` uses `updatePageSchema.strict()` which omits
  `type` + `journal_date` `[FACT: validators/note.ts:49-62]` → a note can't become a journal and a journal's
  date can't move. `.strict()` rejects unknown keys (incl. an attempt to pass `type`).
- **BR-A1-3 · N7/IR-6 soft-delete predicate discipline.** `findWhere` runs the predicate **verbatim** (no
  auto-notDeleted) `[FACT: repository.ts:379-382]` → **every A1 read appends `isNull(pages.deleted_at)`**; drizzle
  `and()` is `SQL|undefined` → the `!` suffix (mirrors spaces). `softDeletePage` = `repo.delete(id)` (soft, sets
  `deleted_at`, enqueues `operation:'update'`) `[FACT: repository.ts:457-465]`.
- **BR-A1-4 · N1/IR-3 libsodium is a HARD boot dep even at empty-`[E]`.** Every `create`/`update` computes
  `_sync_hash` via `hashContent` (libsodium `crypto_generichash`) `[FACT: repository.ts:169,340,432]` →
  `initVault()` (`sodium.ready`) MUST run before the first write or it throws `"Vault not initialized"`
  `[FACT: encryption/vault.ts:23-33]`. A1 does not call `initVault` (boot's job) but its **Verification Gate
  live-DB smoke exercises a real `createPage` to catch a regression** (§4).
- **BR-A1-7 · `listPages({tag})` fails loud until A5 (gate-1 override of D-2).** The `tag` branch needs the
  `entity_tags` read that is **A5** (`getEntitiesByTag`, seam-contract.md:25) — A1 must NOT duplicate it, and
  must NOT silently ignore the filter (a silently-unfiltered result is wrong-but-plausible). So A1's `listPages`,
  when `filter.tag !== undefined`, **throws fail-loud** (`Error('listPages({tag}) is available from slice A5')`)
  — matching the codebase's fail-loud convention (`UnknownEntityType`). Favorite/archived work now; the `tag`
  code path is replaced with the real A5 read at A5. (Plain `Error`, not a bespoke type: it is removed at A5 and
  no shipped ② ever binds to it — B6 lands after A5.)
- **BR-A1-5 · N2 deviceId + N9 empty-`[E]` pass-through.** `pageRepo = createRepository(db, pages, {deviceId,
  encryptedFields: [], softDelete: true})` `[FACT: mirrors spaces/service.ts:69]`. Empty `[E]` → `key()` returns
  `null`, `getVaultKey()` is never called (would throw pre-unlock) `[FACT: repository.ts:249-254]`.
- **BR-A1-6 · Validate → repository → return Row.** Each mutating method `await`s the Zod parse inside an `async`
  method so a validation failure is a **Promise rejection, not a sync throw** `[FACT: seam-contract.md:9,34]`;
  reuses `createPageSchema`/`updatePageSchema` (kept from the removed ①, DB-9) `[FACT: validators/note.ts:25-62]`.
  Returns the Drizzle `PageRow` (`pages.$inferSelect`) `[FACT: schema/notes.ts:104]`, NOT `@vida/types` `Page`
  (DB-11 reconcile is not this entity's job — baseline C2).

## 3. Contract (the A1 surface ② will bind to)
```ts
export interface NotesServiceDeps { spaces: SpacesService; backlinks: BacklinkResolver; registry: TaggableTypeRegistry }

export interface NotesService {                              // GROWS per slice; A1 declares only its rows
  createPage(input: CreatePageInput): Promise<PageRow>       // throws JournalExistsError; Zod async-reject
  getPage(id: string): Promise<PageRow | null>
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow>   // .strict(); rejects `Row not found: <id>` if absent (repository.ts:413)
  softDeletePage(id: string): Promise<void>
  getPageByJournalDate(date: string): Promise<PageRow | null>
  getPagesByType(type: PageType): Promise<PageRow[]>
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]>
  listPages(filter: { favorite?: boolean; archived?: boolean; tag?: string }): Promise<PageRow[]>
}
export function createNotesService(db: DrizzleDb, deviceId: string, _deps: NotesServiceDeps): NotesService

// types.ts
export type CreatePageInput = z.infer<typeof createPageSchema>   // input type ≡ validator (post-impl lesson)
export type UpdatePageInput = z.infer<typeof updatePageSchema>
export class JournalExistsError extends Error { constructor(public journalDate: string) { super(...) } }
```
- `getPage` returns `repo.findById(id)` (already notDeleted-filtered `[FACT: repository.ts:356-365]`).
- `getPageByJournalDate` → `findWhere(...)[0] ?? null`; the others → `findWhere(...)` arrays, all with
  `isNull(deleted_at)` appended.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest (logic + failure):** createPage all 6 types; NP-2 duplicate-journal → `JournalExistsError` (rejection);
   updatePage `.strict()` rejects `type`/`journal_date`/unknown keys; updatePage on missing id → rejects
   `toThrow(/Row not found/)` (templated `Row not found: <id>`, NOT a literal-equality assert); softDeletePage →
   row absent from every read; getPageByJournalDate/getPagesByType/getPagesForEntity exclude soft-deleted;
   listPages favorite/archived filter correct; **listPages({tag}) rejects `/A5/` (BR-A1-7 fail-loud)**.
2. **Typed-error assertion:** `JournalExistsError` is `instanceof Error` and carries `journalDate`.
3. **Live-DB smoke (REAL DB, not a mock — catches N1):** after `initVault()`, a real `createPage` persists +
   round-trips (probe read); a create WITHOUT `initVault()` throws `"Vault not initialized"` (guards BR-A1-4).
4. **Green bars:** `pnpm --filter @vida/core test` all green · root `typecheck` 0 · `eslint` 0.
5. **§XXIX currency:** deferred to the A-track close (current-* still describe the removed ①; regenerated then) —
   noted, not silently skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `services/notes/types.ts` — `NotesService` (A1 rows) + `NotesServiceDeps` + `CreatePageInput`/`UpdatePageInput`
   (`z.infer`) + `JournalExistsError`.
2. `services/notes/service.ts` — `createNotesService(db, deviceId, _deps)`: build `pageRepo` (empty-`[E]`,
   softDelete); object-literal return (no `this`); a `livePages(pred)` closure that appends `isNull(deleted_at)`;
   `createPage` (async, parse → journal pre-check → `pageRepo.create`); `updatePage` (async, `.strict` parse →
   `pageRepo.update`); the getters + `listPages`.
3. `services/notes/index.ts` barrel + `export * from './services/notes'` in `core/src/index.ts`
   `[FACT: core/src/index.ts:117,133 pattern]`.
4. `services/notes/__tests__/notes-service.test.ts` — the §4 cases + the live-DB smoke.
5. Do NOT touch current-* (A-track close, §XXIX).

## 6. Decisions — RESOLVED at the Doc Gate (independent critic, 2026-08-24)
- **D-1 · Journal revive-or-fresh on a soft-deleted date → RESOLVED (a) create-fresh.** DB-consistent, not a
  judgment call: `idx_pages_journal_unique` is `WHERE type='journal' AND deleted_at IS NULL` (`012_notes.ts`), so
  a soft-deleted journal is outside the uniqueness set + the pre-check filters `isNull(deleted_at)`. IR-11 revive
  is an AR-6 **junction** semantic; `pages` is not a junction, and reviving would violate IR-9 (resurrect a dead
  row's identity). Create-fresh is the only DB-consistent answer.
- **D-2 · `listPages({tag})` interim → RESOLVED fail-loud (critic OVERRODE the no-op lean).** Defer the `tag`
  branch to A5 (its `entity_tags` read) — confirmed; but a silent no-op returns a wrong-but-plausible unfiltered
  set. A1 **throws** on `{tag}` until A5 (BR-A1-7). Fail-loud > silently-wrong. See BR-A1-7.
- **D-3 · Factory `_deps` freeze → RESOLVED freeze at A1.** The seam (line 8) already publishes the full 3-dep
  signature as ②'s binding point; growing it at A5 would trip §XXVIII. `_deps` + `^_` lint-ignore is correct.

*(Non-blocking, applied: `vault.ts` cite tightened 22-31 → 23-33.)*
