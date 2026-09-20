# Notes & Pages — current-business-rules (as-built)

> §XXIX living doc. Invariants the `@vida/core` Notes & Pages service upholds, cited to code. Promoted from
> `PLAN-s1-pages-core.md` §2 on S1 ship (2026-09-19). Intent authority: `backend-intent/parts/notes-and-pages.md`.

## S1 — Pages core (BUILT)
- **BR-1 (NP-2, in-service):** one journal per calendar date. `createPage({type:'journal'})` pre-checks
  `getPageByJournalDate` (live rows only) → `JournalExistsError` on clash; never a silent overwrite. The SQL
  partial-UNIQUE (`WHERE type='journal' AND deleted_at IS NULL`) is a backstop, not the enforcement path.
  A **soft-deleted** journal date is reusable. [FACT: service.ts:58-66; schema/notes.ts:71; NOT-09]
- **BR-2 (validator refine):** `journal_date` required iff `type==='journal'`, else null. [FACT: validators/note.ts:42-45]
- **BR-3 (NP-6/SP2 registry):** a non-null `entity_type` (on create; on entity-links at S4) is validated via
  `registry.isRegistered` → `UnregisteredEntityTypeError`. [FACT: service.ts:45-49; NOT-20]
- **BR-4 (update immutability):** `updatePage` uses `updatePageSchema.strict()` — `type`/`journal_date`/`entity_*`/
  `deleted_at` are excluded (journal identity immutable via update); unknown keys rejected. [FACT: validators/note.ts:48-61; NOT-03]
- **BR-5 (async rejection):** validating methods are `async`; Zod/registry failure is a Promise rejection, never a sync throw. [FACT: service.ts:53,78; NOT-42]
- **BR-6 (soft delete, NP-9):** `softDeletePage` → repo soft-delete (`deleted_at` + `operation:'update'` enqueue). Hard-delete cascade DEFERRED (Part 2). [FACT: service.ts:83-85; NOT-39]
- **BR-7 (findWhere soft-delete filter):** every custom-predicate read appends `isNull(pages.deleted_at)` — `findWhere` runs the clause verbatim (unlike findById/findAll). [FACT: service.ts:46-52,88-107; repository.ts:377; NOT-17]
- **BR-8 (word_count / has_pomodoro pass-through):** caller-supplied optionals; never derived in ①. notNull-default
  columns (`word_count` 0, `is_favorite`/`is_archived`/`has_pomodoro` false) are backfilled on create so the returned
  `PageRow` is faithful (create() returns the input-derived row, not a re-read). [FACT: service.ts:67-73; validators/note.ts:38-39,58-59; NOT-45/46]
- **BR-9 (summary_config storage-only):** opaque stringified-JSON `text()` column, read/written via create/update; never parsed/aggregated (engine is journals). [FACT: schema/notes.ts:60-61; NOT-32]
- **BR-10 (factory shape):** object-literal service; intra-calls via hoisted closures, no `this.` (survives destructured consumption). [FACT: service.ts:35-38; NOT-43]
- **BR-11 (M1.0 encryption pass-through):** `pageRepo` registers `encryptedFields:[]` though title/content/cover_image/summary_config are `[E]`-marked; vault key fetched only if the set is non-empty; `initVault()` still runs on the sync-hash path. [FACT: service.ts:41-42; repository.ts:252-254; schema/notes.ts:33-34; NOT-38]
- **BR-12 (parent_id orphan):** plain TEXT self-ref, no FK; orphan-on-delete is app-layer, DEFERRED with hard-delete. [FACT: schema/notes.ts:51; NOT-41]
- **BR-13 (NP-1 guard):** the polymorphic `pages` API is the only note home; no inline `notes` column — architectural invariant by construction. [FACT: NOT-40]

## Terminal states
create → `PageRow` | `JournalExistsError` | `UnregisteredEntityTypeError` | Zod rejection. Reads → row/`PageRow[]`/`null`
(never throw on absence). Fail loud on invalid input.

## S2 — Entity notes + attachments (BUILT)
- **BR-S2-1 (NP-8 idempotent auto-exist):** `ensureEntityNote(pageType, entityType, entityId, seed)` returns the existing non-deleted `*_note` for `(pageType, entity_type, entity_id)` (via `getPagesForEntity` + `type` filter), else creates via S1 `createPage`. Second call → same row. [FACT: service.ts ensureEntityNote; NOT-11]
- **BR-S2-2 (seed determinism — content only, ZK-1):** `content` = a PURE `seedContent(seed)` → minimal `EditorDocument` JSON; leading fields (title→type→status) then `Object.keys(seed).sort()` (NOT insertion order), nullish skipped, no `Date.now()`/random. Same seed → byte-identical `content`. Row `id`/timestamps are repo-generated (non-deterministic by design). [FACT: service.ts seedContent; NOT-12]
- **BR-S2-3 (registry on create):** inherits BR-3 — an unregistered `entity_type` → `UnregisteredEntityTypeError`. [FACT: reuse S1]
- **BR-S2-4 (attachments):** `addAttachment` inserts `note_attachments` (validated by `newAttachmentSchema`, camelCase→snake_case map); `getAttachments` filters `isNull(deleted_at)`; `removeAttachment` soft-deletes. `[E]` blobs pass-through in M1.0. [FACT: service.ts; schema/notes.ts:91-107; NOT-29/30/31]
- **BR-S2-5 (first blob consumer):** `encrypted_blob` bridged from `Uint8Array` (public API) to Drizzle's `Buffer` type via a documented boundary cast — both SQLite drivers accept `Uint8Array` at runtime; reconcile → DB-11/M3.

## Pending (S3–S4) — invariants to add on build
NP-5 page-link/entity-link idempotence · NP-7 wiki-link resolve-by-id · entity-link facade delegation (AR-6/AR-8) · entity-tag reads.
