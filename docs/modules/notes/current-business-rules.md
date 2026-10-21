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

## S3 — Page-links + wiki resolution (BUILT)
- **BR-S3-1 (NP-5 idempotent + revive):** `createPageLink(source, target, context?)` queries by the business key INCLUDING soft-deleted (full `UNIQUE(source,target)` → ≤1 row); live → no-op, soft-deleted → revive (`update {deleted_at:null, context}`), absent → create. Mirror AR-6 `createLink`. [FACT: service.ts; migrations/033_notes.ts:91; NOT-14]
- **BR-S3-2 (resolve-then-soft-delete):** `removePageLink` soft-deletes the live row; no-op if absent. [FACT: service.ts; NOT-16]
- **BR-S3-3 (direction reads, soft-delete filtered):** `getPageLinksFrom` (source) / `getPageLinksTo` (target) append `isNull(deleted_at)`. [FACT: service.ts; NOT-17]
- **BR-S3-4 (NP-7 resolve by id):** `resolveWikiLink(text)` returns non-deleted title-LIKE candidates; the caller binds a concrete `target_page_id` (id-based, rename-safe, collision-immune). Excludes null-title. M1.0 plain LIKE; wildcard-escape deferred (title→FTS5/DB-8 at M3). [FACT: service.ts; NOT-18/50]

## S4 — Delegation facade + registry (BUILT)
- **BR-S4-1 (validate-then-delegate):** `createEntityLink` runs the notes `assertRegistered` first → notes' `UnregisteredEntityTypeError` (NOT-20/21), THEN delegates the write to AR-6 `spaces.createLink`. A pure passthrough would surface spaces' `UnknownEntityType` (breaks the notes error contract). [FACT: service.ts; spaces/types.ts:37]
- **BR-S4-2 (write delegation, no re-impl):** `createEntityLink`/`removeEntityLink` → AR-6; notes never re-implements entity_links idempotence/UNIQUE. [FACT: service.ts; NOT-22/23]
- **BR-S4-3 (read delegation):** `getEntityLinksFrom` → AR-8 `getLinksFrom`. [FACT: service.ts; NOT-25]
- **BR-S4-4 (getBacklinks both lists):** returns `{entityLinks (AR-8 getBacklinksTo), pageLinks (local getPageLinksTo(entityId), unconditional → [] for non-page ids)}`, UNMERGED; grouped presentation → ② G6. [FACT: service.ts; NOT-24]
- **BR-S4-5 (entity_tags reads only):** `getTagsForEntity`/`getEntitiesByTag` via a read-only repo, `isNull(deleted_at)`; tag WRITES are AR-6's (② calls `spaces.tagEntity`). [FACT: service.ts; NOT-26/27/28]

## ① BACKEND COMPLETE (S1–S4, 2026-09-19)
All NOT-01…54 service-boundary rows built or homed. Deferred/seam (documented): eager-trigger wiring (owning modules) · `/summary` engine (journals) · wider menu (M1.4) · pomodoro lens (Sessions) · Views/neural (design-pass/AR-8) · FTS5 (DB-8) · templates apply (ADR-009) · `[E]` wiring (M3/DB-5) · hard-delete cascade (Part 2) · blob-type reconcile (DB-11/M3) · G6 merge (②). ② `fe-notes-and-pages` is a separate frontend issue.

## notes-entity-usability (BUILT 2026-10-20 — open + write + persist; unblocked by data-plane-wiring)
- **BR-NEU-1 (open-on-click):** a collection row/tile opens its entity page — `renderNotesView(…, onOpen)` → `useNavigate('/notes/$id')`. Keyboard-operable (Card `role=button`). [FACT: apps/web note-renderers.tsx / notes-surface.tsx; surface-map.md:43]
- **BR-NEU-2 (create-opens, in place):** `createPage` success navigates to the new note. Configurable/new-tab behavior split to task `note-open-behavior-preference` (net-new pref + IA tab decision). [FACT: use-create-note.ts]
- **BR-NEU-3 (content persists locally):** the editor `onChange` persists the body (debounced ~500ms, flush-on-unmount, invalidate `['pages',id]`); reload re-reads via `getPage`. Single-device/local. [FACT: use-note-content.ts; note-editor-body.tsx]
- **BR-NEU-4 (content write ≠ LWW metadata patch, IR-7):** the body is written ONLY via `NotesService.writePageContent(id, content)`; `content` is REMOVED from `updatePageSchema` (`.strict()` rejects it). M1 = a local write (serialized TipTap doc → `pages.content` text); **M4 MUST** re-home `content` to the CRDT merge (exclude from LWW/`_sync_hash`). [FACT: service.ts writePageContent; validators/note.ts; interpretation.md:159]
- **BR-NEU-5 (honest save-state):** the editor surfaces `saving | saved | error` only — no fake "synced". A write fires only when the serialized doc CHANGES (dedupe baseline = loaded content), so mere open never writes/bumps `updated_at`. [FACT: use-note-content.ts; §XXVIII dedupe deviation]
- Deferred (documented): CRDT/Yjs multi-device merge of `content` (M4, sync OFF→M4) · `[E]` content encryption (M3) · FTS5 of content (DB-8) · `word_count` auto-derive (later).
