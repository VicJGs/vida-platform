# Current Business Rules — notes (Notes & Pages)   (both planes · as-built)

> §XXIX living doc. Invariants the code upholds TODAY, cited to code. ① rules promoted from the S1–S4 PLANs
> (2026-09-19); ② rules from fe-notes #27 + notes-entity-usability (2026-10-20). Intent authority:
> `backend-intent/parts/notes-and-pages.md` (①) · `docs/specs/foundation/fe-notes-and-pages/` (②).
> Last refreshed: 2026-10-26 — notes-rescope (LIF-245) Step 0 baseline (citations re-anchored to current lines;
> `ensureJournal` + 2 undocumented ① behaviors + the ② surface rules added). Paths: `packages/core/src/` for ①,
> `apps/web/src/` for ②, unless prefixed.

## ① S1 — Pages core
- **BR-1 (NP-2, in-service):** one journal per calendar date. `createPage({type:'journal'})` pre-checks
  `getPageByJournalDate` (live rows only) → `JournalExistsError`; never a silent overwrite. The SQL partial-UNIQUE
  (`WHERE type='journal' AND deleted_at IS NULL`) is a backstop. A soft-deleted journal date is reusable.
  [FACT: services/notes/service.ts:98-103,108-113; migrations/033_notes.ts:71-73; NOT-09]
- **BR-1b (ensureJournal get-or-create):** `ensureJournal(date)` returns the live journal for `date`, else creates one
  through `createPage` (so BR-1 still guards the clash) with `title = date`. [FACT: services/notes/service.ts:190-194; types.ts:67]
- **BR-2 (validator refine):** `journal_date` required iff `type==='journal'`, else null. [FACT: validators/note.ts:42-45]
- **BR-3 (NP-6/SP2 registry):** a non-null `entity_type` (on create; on entity-links at S4) is validated via
  `registry.isRegistered` → `UnregisteredEntityTypeError`. [FACT: service.ts:92-96,114,271; NOT-20]
- **BR-4 (update immutability):** `updatePage` uses `updatePageSchema.strict()` — `type`/`journal_date`/`entity_*`/
  `deleted_at` and `content` are excluded; unknown keys rejected. [FACT: validators/note.ts:47-62; NOT-03]
- **BR-5 (async rejection):** validating methods are `async`; Zod/registry failure is a Promise rejection, never a sync
  throw. `writePageContent` performs no validation of `content`. [FACT: service.ts:107,131,197,138-139; NOT-42]
- **BR-6 (soft delete, NP-9):** `softDeletePage` → repo soft-delete (`deleted_at` + `operation:'update'` enqueue).
  Hard-delete cascade DEFERRED (Part 2). [FACT: service.ts:141-143; db/repository.ts:460-461; NOT-39]
- **BR-7 (findWhere soft-delete filter):** every custom-predicate read appends `isNull(deleted_at)` — `findWhere` runs the
  clause verbatim. Intended exception: the page-link business-key lookups include deleted rows (revive).
  [FACT: service.ts:98-103,147-162,212-213,252-260,293-303 · exception 227-229,245-247; db/repository.ts:379-382; NOT-17]
- **BR-7b (listPages default includes archived):** `listPages()` filters `is_favorite`/`is_archived` only when the flag is
  truthy; called with no filter it returns archived pages alongside live ones. [FACT: service.ts:155-162]
- **BR-7c (writes don't check deleted_at):** `updatePage`/`writePageContent` resolve the row by id with no `deleted_at`
  filter, so they succeed on a soft-deleted page; an unknown id throws a plain `Error('Row not found')`.
  [FACT: db/repository.ts:404-413] — recorded as-built, not an intended rule [INTERP].
- **BR-8 (word_count / has_pomodoro pass-through):** caller-supplied; never derived in ①. notNull-default columns
  (`word_count` 0, `is_favorite`/`is_archived`/`has_pomodoro` false) are backfilled on create so the returned `PageRow`
  is faithful. [FACT: service.ts:119-125; validators/note.ts:38-39,59-60; NOT-45/46]
- **BR-9 (summary_config storage-only):** opaque stringified-JSON `text()`; never parsed/aggregated (engine = journals).
  [FACT: schema/notes.ts:60-61; NOT-32]
- **BR-10 (factory shape):** object-literal service, no `this.`; intra-calls go through the hoisted `getPageByJournalDate`/
  `assertRegistered` closures or the `service` const (`service.createPage`, `service.getPagesForEntity`,
  `service.getPageLinksTo`) — both survive destructured consumption. [FACT: service.ts:72,92-103,172,177,193,289; NOT-43]
- **BR-11 (M1.0 encryption pass-through):** all repos register `encryptedFields:[]` though title/content/cover_image/
  summary_config are `[E]`-marked; `initVault()` still runs on the sync-hash path. [FACT: service.ts:75,77-89;
  db/repository.ts:252-254; schema/notes.ts:33-34; NOT-38]
- **BR-12 (parent_id orphan):** plain TEXT self-ref, no FK; orphan-on-delete DEFERRED. [FACT: schema/notes.ts:51; NOT-41]
- **BR-13 (NP-1 guard):** the polymorphic `pages` API is the only note home; no inline `notes` column.
  [FACT: migrations/033_notes.ts:39-65; NOT-40]

### Terminal states
create → `PageRow` | `JournalExistsError` | `UnregisteredEntityTypeError` | Zod rejection. Reads → row / `PageRow[]` /
`null` (never throw on absence). update on unknown id → `Error('Row not found')`.

## ① S2 — Entity notes + attachments
- **BR-S2-1 (NP-8 idempotent auto-exist):** `ensureEntityNote` returns the existing live `*_note` for
  `(pageType, entity_type, entity_id)`, else creates via `createPage`. [FACT: service.ts:165-183; NOT-11]
- **BR-S2-2 (seed determinism):** `content = seedContent(seed)` — leading title→type→status then sorted keys, nullish
  skipped, no Date/random. [FACT: service.ts:41-58; NOT-12]
- **BR-S2-3 (registry on create):** inherits BR-3. [FACT: service.ts:177→114] _(test file labels this "BR-S2-4",
  `__tests__/notes-service.test.ts:251` — id mismatch, rule identical.)_
- **BR-S2-4 (attachments):** add validates via `newAttachmentSchema` + camelCase→snake_case; get filters live; remove
  soft-deletes. [FACT: service.ts:196-217; schema/notes.ts:91-107; validators/note.ts:69-75; NOT-29/30/31]
- **BR-S2-5 (first blob consumer):** `Uint8Array` → Drizzle `Buffer` boundary cast; reconcile → DB-11/M3.
  [FACT: service.ts:202-207]

## ① S3 — Page-links + wiki resolution
- **BR-S3-1 (NP-5 idempotent + revive):** live → no-op · soft-deleted → revive · absent → create.
  [FACT: service.ts:220-242; migrations/033_notes.ts:91; NOT-14]
- **BR-S3-2 (resolve-then-soft-delete):** `removePageLink` soft-deletes the live row; no-op if absent. [FACT: service.ts:244-250; NOT-16]
- **BR-S3-3 (direction reads):** `getPageLinksFrom`/`getPageLinksTo` live-filtered. [FACT: service.ts:252-256; NOT-17]
- **BR-S3-4 (NP-7 resolve by id):** `resolveWikiLink` returns live title-LIKE candidates; the caller binds a concrete
  `target_page_id`. Plain LIKE, no escape, no limit. [FACT: service.ts:259-260; NOT-18/50]

## ① S4 — Delegation facade
- **BR-S4-1 (validate-then-delegate):** notes `assertRegistered` → notes error, THEN AR-6 `spaces.createLink`.
  [FACT: service.ts:265-273; foundation/spaces/types.ts:37]
- **BR-S4-2 (write delegation):** entity-link writes → AR-6, never re-implemented. [FACT: service.ts:272,276; NOT-22/23]
- **BR-S4-3 (read delegation):** `getEntityLinksFrom` → AR-8. [FACT: service.ts:279-280; NOT-25]
- **BR-S4-4 (getBacklinks both lists, unmerged):** [FACT: service.ts:284-290; NOT-24]
- **BR-S4-5 (entity_tags reads only):** tag writes are AR-6's. [FACT: service.ts:85-89,293-303; NOT-26/27/28]
- **BR-NEU-4 (content write ≠ LWW metadata patch, IR-7):** the body is written ONLY via `writePageContent`; `content` is
  absent from `updatePageSchema`. **M4 MUST** re-home `content` to the CRDT merge (exclude from LWW/`_sync_hash`).
  [FACT: service.ts:135-139; validators/note.ts:47-62; __tests__/notes-service.test.ts:176]

## ② Surface — what is LIVE (enforced today)
- **BR-NEU-1 (open-on-click):** a collection row/tile opens `/notes/$id`; keyboard-operable (Card `role=button`).
  [FACT: notes/notes-surface.tsx:29; notes/note-renderers.tsx:35-46]
- **BR-NEU-2 (create-opens, in place):** `createPage({type:'note', title:'New note'})` → invalidate `['notes','pages']` →
  navigate; no optimistic row; failure only `console.error`. [FACT: notes/use-create-note.ts:24-37]
- **BR-NEU-3 (content persists locally):** editor `onChange` → debounced 500 ms `writePageContent`, flush-on-unmount,
  invalidate `['pages',id]`; a failed write leaves the baseline so the next edit retries.
  [FACT: notes/use-note-content.ts:26,50-65,98-104]
- **BR-NEU-5 (honest save-state, no spurious write):** `saving | saved | error` only — no fake "synced". Unchanged
  serialized content is deduped against the loaded content; on a blank page the editor's first mount-echo is ADOPTED as
  the baseline, not written. [FACT: notes/use-note-content.ts:40,48,85-91; notes/note-editor-body.tsx:22-27]
- **BR-SUR-1 (list scope):** the collection lists every live page of every type, **including archived pages and
  journals** (`listPages()` with no filter, see BR-7b); no client sort. [FACT: notes/use-notes-rows.ts:56]
- **BR-SUR-2 (not-found):** `getPage` → `null` renders "Note not found". [FACT: notes/use-note-entity.ts:139; notes/note-entity.tsx:84-96]
- **BR-SUR-3 (title fallbacks):** rows `'(untitled)'`, entity page `''`; malformed/absent content parses to `null`.
  [FACT: notes/live-mappers.ts:30-37,42,55]
- **BR-SUR-4 (editor gate):** the Note/editor facet is offered iff `isEntityType(page.type) && hasPage`
  [FACT: entity/adapter.ts:33-35] — today true only for `note` and `journal` (see current-spec ② Editor gate).
- **BR-SUR-5 (mode default):** merged/tabbed defaults to `tabbed`, opens on the editor facet; remembered per `type:id`
  in memory only (lost on reload). [FACT: notes/note-entity.tsx:42,120; entity/adapter.ts:93-102]
- **BR-SUR-6 (row date):** `NotesRow.date = journal_date ?? ymd(updated_at)` where `ymd` slices `toISOString()` — a
  **UTC** calendar date, not the user's local day. [FACT: notes/live-mappers.ts:25-27,46] (census "TZ date bug")

## ② Surface — pure logic built + tested, on STUB data legs
- **BR-SUR-7 (backlinks merge):** one row per source, occurrence count, first non-empty snippet, unresolved sources
  omitted; groups A–Z by module, items newest-first with title tie-break. [FACT: notes/backlinks.ts:54-61,76-125]
- **BR-SUR-8 (wiki-link compose):** candidates drop null/blank titles; the Create row exists iff the trimmed query is
  non-blank; create-on-miss = `createPage` then `createPageLink`, a failed create never links.
  [FACT: notes/wikilink.ts:34-64]
- **BR-SUR-9 (search honesty):** with the stub provider the status is `search-unavailable` ("Search turns on once your
  notes are indexed.") — never a fake empty result. [FACT: notes/notes-search.tsx:30-68]
- Stubbed legs (no rule enforced against real data yet): metadata toggles, attachments, backlinks, `[[` picker, link
  preview, `/summary`, templates, view-config, mode persistence, rename/delete — see current-spec ② Hooks.

## Deferred (documented)
CRDT/Yjs multi-device merge of `content` (M4) · `[E]` content encryption (M3) · FTS5 of content (DB-8) · `word_count`
auto-derive · hard-delete cascade (Part 2) · blob-type reconcile (DB-11/M3).
