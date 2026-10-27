# Current Business Rules — notes (Notes & Pages)   (both planes · as-built)

> §XXIX living doc. Invariants the code upholds TODAY, cited to code. ① rules promoted from the S1–S4 PLANs
> (2026-09-19); ② rules from fe-notes #27 + notes-entity-usability (2026-10-20). Intent authority:
> `backend-intent/parts/notes-and-pages.md` (①) · `docs/specs/foundation/fe-notes-and-pages/` (②).
> Last refreshed: 2026-10-26 — notes-rescope (LIF-245) Step 0 baseline (citations re-anchored to current lines;
> `ensureJournal` + 2 undocumented ① behaviors + the ② surface rules added); same day — **notes-rescope R0 data safety**
> (BR-R0-1…9; BR-7c superseded; BR-S2-2 · BR-S3-1 · BR-NEU-3 · BR-SUR-3 amended). Paths: `packages/core/src/` for ①,
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
- ~~**BR-7c (writes don't check deleted_at)**~~ — **superseded by BR-R0-5/6** (notes-rescope R0, 2026-10-26). The
  repository's `update` still ignores `deleted_at` [FACT: db/repository.ts:404-413]; the notes service now guards
  above it.
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
  skipped, no Date/random. **Editor-valid (BR-R0-4b):** an empty title emits no heading; an otherwise-empty seed emits
  one empty paragraph. [FACT: service.ts:46-65; NOT-12]
- **BR-S2-3 (registry on create):** inherits BR-3. [FACT: service.ts:177→114] _(test file labels this "BR-S2-4",
  `__tests__/notes-service.test.ts:251` — id mismatch, rule identical.)_
- **BR-S2-4 (attachments):** add validates via `newAttachmentSchema` + camelCase→snake_case; get filters live; remove
  soft-deletes. [FACT: service.ts:196-217; schema/notes.ts:91-107; validators/note.ts:69-75; NOT-29/30/31]
- **BR-S2-5 (first blob consumer):** `Uint8Array` → Drizzle `Buffer` boundary cast; reconcile → DB-11/M3.
  [FACT: service.ts:202-207]

## ① S3 — Page-links + wiki resolution
- **BR-S3-1 (NP-5 idempotent + revive):** live → no-op · soft-deleted → revive · absent → create — and both pages
  must be live (BR-R0-5), a revive included. [FACT: service.ts:243-268; migrations/033_notes.ts:91; NOT-14]
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
  navigate; no optimistic row; a failure raises one danger toast "Couldn’t create the note" (`notifyError`, BR-R1-7).
  [FACT: notes/use-create-note.ts:24-34; lib/notify-error.ts]
- **BR-NEU-3 (content persists locally):** editor `onChange` → debounced 500 ms `writePageContent` (a direct promise,
  not a React Query mutation: it never pauses under v5's `networkMode:'online'`, which fits a local-first write).
  Flushes on unmount, `visibilitychange:hidden` and `pagehide`. A failed write re-queues unless it's terminal
  (`PageNotFoundError` / `InvalidPageContentError`, matched by `.name`) or a newer edit replaced it. A failure no chip
  observes (the user left the page) raises the shared error toast naming the page (BR-R1-7); its edit stays in the
  overlay, so a reopen re-seeds + re-saves it. Write-through + barrier + invalidation per BR-R0-8.
  [FACT: notes/use-note-content.ts:42,74-111,113-139,141-153]
- **BR-NEU-5 (honest save status, no spurious write):** the visible state is the per-page store's `saved | error | locked`
  (BR-R1-5) — no "Saving…", no fake "synced". A save is
  deduped against `expected` — what the DB will hold once queued writes settle (initially the loaded body, or the
  inherited overlay body; see BR-R0-7) — so a mere open of a clean page never writes; on a blank page the editor's first
  mount-echo is ADOPTED as the baseline, not written. The one deliberate exception is the ownership re-save of an
  inherited unsaved edit (BR-R0-8a). [FACT: notes/use-note-content.ts; notes/save-status.ts]
- **BR-SUR-1 (list scope):** the collection lists every live page of every type, **including archived pages and
  journals** (`listPages()` with no filter, see BR-7b); no client sort. [FACT: notes/use-notes-rows.ts:56]
- **BR-SUR-2 (not-found):** `getPage` → `null` renders "Note not found". [FACT: notes/use-note-entity.ts:139; notes/note-entity.tsx:84-96]
- **BR-SUR-3 (page names):** one projection, `pageLabel` (note-chrome): a non-empty title; else an untitled `*_note` →
  "<Type> note" (e.g. "Task note" — the seed H1 carries the parent title; R7 feeds a parent name); else "Untitled note".
  Used by the H1, the editor accname, collection rows (`labelFromType` marks a type-derived name) and card names.
  `NoteEntityData.title` stays the raw stored value. Content parses to a tagged result (BR-R0-4); `NoteEntityData.content`
  is the doc only for `ok`; `contentStatus` + `rawContent` carry the rest.
  [FACT: notes/note-chrome.tsx (pageLabel); notes/live-mappers.ts (toNotesRow, toNoteEntity)]
- **BR-SUR-4 (editor gate):** the note PAGE surface gates on page type — `offersPageEditor` (every `PAGE_TYPE` member),
  selected by `EntitySource.gate:'page'`; module-entity surfaces keep `offersEditor` (`isEntityType && hasPage`).
  [FACT: entity/adapter.ts (offersPageEditor, toEntityProps); notes/note-entity.tsx]
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

## notes-rescope R0 — data safety (both planes · 2026-10-26)
Approved PLAN: `docs/features/notes-and-pages/delivery/sessions/PLAN-R0-data-safety.md` (rev 3) + IMPLEMENTATION-PLAN.
- **BR-R0-1 · An unreadable body is never written.** Malformed bytes → no editor mounts and the write seam starts
  locked. A doc the editor's schema rejects → `onInvalidContent` locks the seam in the same callback. A page whose
  CURRENT bytes are malformed stays locked even if a latest-body overlay exists (the overlay is kept, never written over
  the protected bytes). [FACT: notes/note-editor-body.tsx:93,116-119; notes/use-note-content.ts:73-79]
- **BR-R0-2 · Stored bytes stay intact.** Nothing is migrated on read. The only form change is lossless: after a real
  edit, the written doc is the BR-R0-4-normalized one (no empty text nodes).
- **BR-R0-3 · The editor content check is always on** (`@vida/editor` BR-E1-7). [FACT: packages/editor/src/editor.tsx:183-205]
- **BR-R0-4 · One parser.** `parseContentResult` → `absent | ok | malformed`, with two lossless normalizations (an empty
  doc → absent; empty text nodes dropped; an empty `content` key on a non-doc node dropped) — the normalized doc equals
  ProseMirror's own `toJSON`, so a mere open dedupes. `parseContent` is its null-contract wrapper (fe-calendar).
  [FACT: notes/live-mappers.ts:29-70]
- **BR-R0-4b · Seeds are editor-valid** (see BR-S2-2).
- **BR-R0-5 · Writes need a live page.** `updatePage` · `writePageContent` · `addAttachment` · `createPageLink` (both
  ends) · `createEntityLink` (after `assertRegistered`) reject a deleted or unknown id with `PageNotFoundError`
  (`.name`, `.pageId`). Notes-scoped (R5's restore writes deleted rows). Check-then-write isn't one transaction,
  which is accepted for single-user-local. [FACT: service.ts:109-113,149,157-161,220,248-249,297; types.ts:124-138]
- **BR-R0-6 · Body shape guard.** `writePageContent` → `InvalidPageContentError` before any read; `createPage.content`
  must be a serialized EditorDocument. [FACT: service.ts:158; validators/editor.ts:27-43; validators/note.ts:31-38]
- **BR-R0-7 · The write seam settles on demand and on hide:** `flush` · `cancel` · `lock` (+ hide/pagehide/unmount
  flush, retryable re-queue). **Dedupe target = what the DB WILL hold once queued writes settle** (`expected`; DEV-R0-2):
  an undo back to that body drops a DIFFERENT pending edit (within the debounce) and an undo made while a write is in
  flight is still written. A mount that inherited an overlay never dedupes until its own write succeeds (sticky
  `inheritsHandover`), so the ownership re-save survives a type-then-undo. Stated limit: a failed write's `expected`
  fallback assumes no earlier write is still in flight (the one worker runs writes in order).
  [FACT: notes/use-note-content.ts:84,101-145,147-190]
- **BR-R0-8a · Seed-point handover (DEV-R0-1).** `save()` records every real edit in the latest-body overlay
  (`body-writes.ts`, one entry per page id, `{doc, serialized, gen, owner}`) synchronously. A mounting body seeds once
  from `latestBody(id) ?? page.content` (the incoming body renders before the outgoing unmount flush: route swaps both
  ways — proven live, warm + cold — merged ⇄ tabbed, tab switches). The dedupe baseline stays the STORED body, so an overlay-seeded mount re-saves it
  once (ownership: retries an outgoing write that may fail after unmount). Cleared by a successful write of gen ≥ the
  entry's, the owner's `cancel`/`lock`, `PageNotFoundError` (all) or `InvalidPageContentError` (by gen). Forward
  obligation: every non-editor body writer (R9 templates, import, M4 sync) clears the entry first; R5 delete calls
  `cancel()`. [FACT: notes/body-writes.ts (overlay); notes/use-note-content.ts (seed, save, flush settle, cancel)]
- **BR-R0-8 · Write-through, then invalidate.** At flush, synchronously: `setQueryData` the doc into a WARM
  `['pages',id]` / `['journal',date]` (never creates an entry). On success: invalidate `['pages',id]` ·
  `['notes','pages']` · journal → `['journal',date]` + `['calendar','journal']`.
  [FACT: notes/use-note-content.ts:108-129]
- **BR-R0-8b · Read-after-write barrier.** Each write registers under `page:<id>` (+ `journal:<date>`) in the same tick
  it starts. `useNoteEntity` / `useJournalEntry` read via `readAfterWrites`: generations snapshotted before the wait,
  re-read on change. Per-key chains; rejections never fail a read; a hung write holds its readers (stated limit).
  [FACT: notes/body-writes.ts:26-50; notes/use-note-entity.ts (queryFn); home/use-journal-entry.ts (queryFn)]
- **BR-R0-9 · EC-33 notice.** `EmptyState` (heading level 2); the SENTENCE is the polite live region (`role="status"`
  on the body text only — a live region holds no controls). "Export a copy" = the raw
  bytes as `.json`, always. "Export as Markdown" (`toMarkdown`, `integration_block_handling:'comment'`) only when the
  bytes parse to a doc and the conversion doesn't throw. [FACT: notes/note-editor-body.tsx:36-86; notes/export-copy.ts]
- Known limit: undeclared node ATTRIBUTES are silently dropped by ProseMirror and not detected (PLAN-R0 G15; M4).

## notes-rescope R1 — page frame (surface plane · 2026-10-27)
Approved PLAN: `docs/features/notes-and-pages/delivery/sessions/PLAN-R1-page-frame.md` (rev 3) + IMPLEMENTATION-PLAN (rev 3,
R-1…R-6, DEV-R1-1).
- **BR-R1-1 · Page surfaces gate on page type** (BR-SUR-4). EC-15: all 6 types open with the editor, the Note tab leads.
- **BR-R1-2 · No empty page name** (BR-SUR-3, `pageLabel`).
- **BR-R1-3 · Overviews are components.** `OverviewRenderer = ComponentType<OverviewContext>`, mounted `<Overview/>`.
  [FACT: notes/overview-registry.ts; notes/note-entity.tsx]
- **BR-R1-4 · Notes registers only the `note` Overview** (also the fallback for unregistered types). The journal
  Overview is journals-rescope's (EC-18a); `*_note` Overviews ride in from fe-tasks/fe-projects. `SummaryBlock` has no
  notes consumer (R8's `/summary` body). [FACT: notes/overview-registry.ts; notes/note-overview.tsx]
- **BR-R1-5 · One save announcement per host.** `save-status.ts`: a per-page store (`SaveStatus = LocalSyncState |
  'locked'`, default `saved`, `locked` sticky, `error` → `saved` only on the next successful write), read by
  `useSaveStatus` (memoized subscribe). Hosts render `PageSaveStatus` (`@vida/ui` SyncStatus, "Saved on this device"):
  the note page's title row (`PageActions`) and Home's journal frame (right-aligned). Hidden while locked (malformed at
  load via the host prop; `onInvalidContent` → `lock()` → `locked`). `NoteEditorBody` renders no status of its own.
  [FACT: notes/save-status.ts; notes/page-actions.tsx; notes/use-note-content.ts; home/journal-page-region.tsx]
- **BR-R1-6 · No dead ⋯.** `PageActions` renders the ⋯ `Menu` only with ≥1 item; R1 passes none (R3 Rename · R5 Move
  to Trash · R9 Save as template add them). [FACT: notes/page-actions.tsx; notes/note-entity.tsx (NO_ACTIONS)]
- **BR-R1-7 · Failures are never silent.** `notifyError(action, e)` = console + one danger toast "Couldn’t <action>" (no
  raw error text). Callers: create; a body-write failure with no chip observing (`observed(id)` = live subscriptions).
  [FACT: lib/notify-error.ts; notes/use-note-content.ts]
- **BR-R1-8 · Read errors are recoverable in place.** `useNoteEntity` / `useNotesRows` / `useJournalEntry` expose
  `retry` + `retrying`; `retryState` keeps the error branch up while a retry runs (`isFetching && data===undefined &&
  errorUpdateCount>0` — v5 resets a no-data query to pending). `ReadErrorMessage` = polite message + Retry (`Button
  loading`) outside the live region. DEV `?readerror` (NODE_ENV-gated, absent from prod) forces the error until the first
  Retry. [FACT: notes/read-error.ts; notes/read-error-message.tsx; the three hooks]
- **BR-R1-9 · One type-label set** — `note-chrome` `typeIcon`/`typeLabel`; card names = title · type · edited · favorite.
  [FACT: notes/note-renderers.tsx]
- **`@vida/ui` EntityView (DEV-R1-1):** the title row wraps (`flexBasis:240` title group) and the title applies
  `lineHeight="$display"`. [FACT: packages/ui/src/components/entity-view.tsx:71-83,159]
- Forward obligations: R7 feeds `pageLabel`'s `parentName` (A-33); R3/R5/R9 add the ⋯ items and call `notifyError`
  from their mutations; R3 moves focus to the surface heading after a successful Retry; R10 re-checks `SummaryBlock`;
  `locked` is sticky for the session — when a content-repair path or M4 sync can change a page's bytes, the store needs
  a `clear(id)`.

## Deferred (documented)
CRDT/Yjs multi-device merge of `content` (M4) · `[E]` content encryption (M3) · FTS5 of content (DB-8) · `word_count`
auto-derive · hard-delete cascade (Part 2) · blob-type reconcile (DB-11/M3).
