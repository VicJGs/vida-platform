<!-- CURRENT-BUSINESS-RULES · module: books · living invariants (§XXIX) · never lags the code -->

# Books — CURRENT BUSINESS RULES  (`@vida/core` `services/books`)

> The invariants the code enforces, promoted per slice from the slice PLANs. Inherits the CORE constitution
> (ZK-1/2/3, LF-1/2/3). Born at S1 (LIF-117). Source rules: `docs/features/books/business-rules.md` (BK-1..18)
> + `docs/specs/foundation/db-4-books/_index.md` (BR-BK-1..7).

## Shipped invariants (as of S1)

- **BR-BK-S1-1 (reframe / BR-BK-2)** — `books.progress` is a nullable DERIVED override. It is NEVER settable:
  absent from `CreateBookSchema`/`UpdateBookSchema`, hardcoded `null` on create, absent from the update patch.
  Derivation lands at S8. `[code: service.ts createBook progress:null; validators/books.ts]`
- **BR-BK-S1-2 (retired columns)** — `format` / `current_page` / `genre` / `tags` do not exist on the table,
  the `Book` interface, or the input schemas (DB-4 reframe: → `book_assets` / per-asset `native_position` /
  `entity_tags`). `[code: schema/books.ts; types/learning.ts Book]`
- **BR-BK-S1-3 (validation)** — `status` ∈ {want_to_read,reading,completed,dropped}; `rating` ∈ [1,5];
  `title` non-empty. Enforced in Zod (typed async rejection) above the DB CHECK floor. `[code: validators/books.ts]`
- **BR-BK-S1-4 (default)** — `status` defaults to `want_to_read` when omitted (backfilled on the create-echo for
  a faithful returned row). `[code: service.ts createBook]`
- **BR-BK-S1-5 (no-FK integrity)** — `updateBook`/`softDeleteBook`/`getCapabilities` guard-exists →
  `BookNotFoundError`; `getBook` returns `null` (nullable read). Soft-deleted rows are not resurrectable
  (`findById` excludes them). `[code: service.ts; BR-BK-6]`
- **BR-BK-S1-6 (TOC-only first-class / BK-17)** — a book needs no asset and no page count to exist; `plannable`
  is true on a page basis — a `total_pages` **OR** a TOC (≥1 chapter, resolved at S2/N3). *(S2 carry-forward
  CLOSED — see BR-BK-S2-6.)* `[code: service.ts getCapabilities; business-rules.md:85-87]`
- **BR-BK-S1-7 (soft-delete list exclusion)** — `listBooks` excludes soft-deleted rows via an explicit
  `isNull(deleted_at)` (`findWhere` skips the soft-delete filter). `[code: service.ts listBooks]`
- **BR-BK-S1-8 (M1.0 [E] seam)** — [E] fields (title/author/isbn/review/cover_url) use `encryptedFields:[]`
  pass-through; real field encryption is M3/DB-5. `[code: service.ts booksRepo; BK-1]`

## Shipped invariants (as of S2 — Chapters/TOC + ISBN lookup, BOO-05/06/07/08)

- **BR-BK-S2-1 (declarative TOC upsert / BK-9)** — `setChapters` sets the whole flat TOC, UPSERTING by
  `chapter_number` (the UNIQUE identity): structural fields (`title`/`start_page`/`end_page`/
  `estimated_reading_minutes`/`sort_order`) overwrite; numbers absent from the new list are **hard-deleted**
  (`book_chapters` has no `deleted_at`). Returns the TOC ordered by `chapter_number`. `[code: service.ts setChapters]`
- **BR-BK-S2-2 (anti-lost / BK-17)** — a re-`setChapters` **preserves tracking** (`is_completed` / `completed_at` /
  `actual_reading_minutes`) for every surviving `chapter_number` — a TOC edit never resets reading progress. Tracking
  is set only via `markChapterComplete` / reading sessions, never seeded (`ChapterSeed` carries structural fields
  only). `[code: service.ts setChapters upsert branch; business-rules.md:85-87]`
- **BR-BK-S2-3 (UNIQUE pre-check)** — a duplicate `chapter_number` WITHIN a `setChapters` input is rejected with
  `ChapterUniqueViolation` before any write; the DB `UNIQUE(book_id,chapter_number)` is the backstop (the no-FK
  app-layer integrity pattern). `[code: service.ts setChapters; migration 023_books.ts:85]`
- **BR-BK-S2-4 (chapter completion / BOO-06)** — `markChapterComplete(id, done)` sets `is_completed` +
  `completed_at` (done=false clears both); guards exists → `ChapterNotFoundError`. `[code: service.ts markChapterComplete]`
- **BR-BK-S2-5 (deny-safe ISBN lookup / BK-14)** — `lookupBook` is a device-mediated **public-reference** fetch
  (`sensitiveModules:[]` ⇒ never an egress act; never server-plaintext). No `ingestion` dep OR any refused/failed
  fetch ⇒ `{status:'lookup-unavailable'}` (fail-closed); the manual fallback (`setChapters`/`createBook`) is
  callable regardless. At M1 the substrate has no mediator ⇒ always unavailable; the `FetchResult`→`BookMetadata`
  normalization (Books' XCU-14 contract, `IsbnLookupPayload`) lands at M2 (zero-signature swap). `[code: service.ts
  lookupBook; foundation/ingestion; parts/books.md:138]`
- **BR-BK-S2-6 (plannable honors a TOC / BK-17 — closes the S1-6 carry-forward)** — `getCapabilities.plannable` is
  true when a work-level `total_pages` OR a TOC (≥1 chapter) exists; a TOC-only book with no `total_pages` is
  plannable. `[code: service.ts getCapabilities chapterCount]`
- **BR-BK-S2-7 (X9 revoke / BOO-08)** — `revokeLookupGrant` halts future ISBN lookups (delegates to
  `ingestion.revokeIntegration(BOOKS_ISBN_INTEGRATION_ID)`); already-imported metadata is untouched (revoke reaches
  only the grant). No `ingestion` dep ⇒ no-op (nothing granted at M1). `BOOKS_ISBN_INTEGRATION_ID` is Books-owned
  identity (the `entity_type`/sub-type precedent), inert at M1. `[code: service.ts revokeLookupGrant; ADR-014:70]`

## Shipped invariants (as of S3 — Assets + positions + mapping, BOO-09/10/11/12/44)

- **BR-BK-S3-1 (asset = per-format copy / BK-2/BOO-09)** — `addAsset(bookId, {format, native_position?, file?})`
  (the raw `file` bundled in `input` per the frozen seam-contract; split off before Zod-validating the metadata)
  creates a `book_assets` row (0..n per book); `format` ∈ BOOK_ASSET_FORMAT (Zod + DB CHECK). Guards the book
  exists (`BookNotFoundError`). A book needs no asset (BK-17). `[code: service.ts addAsset; validators/books.ts AddAssetSchema]`
- **BR-BK-S3-2 (R2 upload — deny-safe on ABSENCE, fail-loud on FAILURE / BOO-09/44)** — the digital `file`
  uploads via the optional `attachment?` port, **upload-first so nothing persists on failure**: (a) absent port
  **or** no file ⇒ `file:{status:'attachment-unavailable'}` + `file_ref` null, asset still created (BK-17); (b)
  present port + success ⇒ `file:{status:'stored', fileRef}`, `file_ref` set; (c) present port + `upload()`
  rejects ⇒ **`AssetFileError`** (fail-loud, no asset persisted — a broken file never renders as an empty book).
  M1 ships no R2 substrate ⇒ always (a); M2 swaps the pipeline (zero-signature). `[code: service.ts addAsset;
  business-rules.md:127,97-98]`
- **BR-BK-S3-3 (per-asset position SSOT / BK-2/BOO-10)** — each asset owns exactly ONE `native_position`.
  `updatePosition(assetId, nativePosition)` (non-empty) writes only that column, re-reads, returns the `BookAsset`.
  Guards exists (`BookAssetNotFoundError`). `[code: service.ts updatePosition; validators UpdatePositionSchema]`
- **BR-BK-S3-4 (asset removal preserves work-anchored annotations / BOO-11)** — `removeAsset(id)` soft-deletes
  the asset (`book_assets` HAS `deleted_at`). Work-anchored annotations survive by construction (no FK to the
  asset — `business-rules.md:99-100`); the survival test lands at S4 (annotations don't exist yet). Guards exists
  (`BookAssetNotFoundError`). `[code: service.ts removeAsset]`
- **BR-BK-S3-5 (cross-format mapping NEVER guessed / BK-4/BOO-12)** — `getMappedPosition(assetId, targetAssetId)`
  returns the typed `MappedPosition`. At M1 the mapping algorithm (transcription + TOC-anchor matching) is unbuilt
  (design pass → build), so the result is **ALWAYS `{status:'not-synced', nativePosition}`** carrying the TARGET
  asset's own native position (BK-5 `:28-30`; terminal `:113`) — never a guessed `synced`. Guards both assets exist
  + belong to the **same book** (`BookAssetNotFoundError`). `[code: service.ts getMappedPosition]`
- **BR-BK-S3-6 (file error is typed + fail-loud / BOO-44)** — `AssetFileError` is the typed R2/decrypt error
  (`business-rules.md:127`). Thrown at S3 by `addAsset` on a present-port upload failure; the decrypt/download
  throw site (`openReader`) lands at S6 (terminal `:112`). `[code: types.ts AssetFileError; service.ts addAsset]`
- **BR-BK-S3-7 (N1 fold — BookAsset interface)** — `BookAsset` is a proper `@vida/types` interface mirroring the
  reshaped row (DB-11, the Book/BookChapter precedent); `BookView.assets: BookAsset[]` (was raw `BookAssetRow`).
  `[code: @vida/types learning.ts BookAsset; service.ts toAsset]`
- **BR-BK-S3-8 (B1 fold — chapter READ path, closes the S2 carry-forward)** — `getBook` now returns
  `chapters: BookChapter[]` ordered by `chapter_number`; `getCapabilities.readable` = ≥1 **live** asset
  (soft-delete-filtered; removing the last copy flips it false). `[code: service.ts getBook, getCapabilities]`

## Shipped invariants (as of S4 — Annotations + notes/links, BOO-15/16/17/18/19/20)

- **BR-BK-S4-1 (three annotation natures / BK-6)** — highlights, bookmarks, quotes are distinct tables. Highlights
  are deliberately light: NO notes, NO inter-links, at EITHER endpoint. Enforced two ways: (a) the entity-type
  registry EXCLUDES `book_highlight` (`_registry.ts:85-96`) — backstops a highlight as a link TARGET / note-entity;
  (b) `spaces.createLink` does NOT validate the SOURCE anchor, so Books enforces the full rule via `assertLinkable`
  → `AnnotationNotLinkableError` (fail-loud). `[code: service.ts assertLinkable; conventions.md:50]`
- **BR-BK-S4-2 (highlight — digital span, work-anchored / BOO-15)** — `addHighlight(assetId, {captured_text,
  position})` derives `book_id` from the asset (guards asset exists → `BookAssetNotFoundError`); `asset_id` records
  the digital-content source; `captured_text` `[E]`. Input is **snake_case** `captured_text` (the books-surface
  convention: `ChapterSeed`/`AddAssetInput` are snake_case; the frozen seam-contract's `capturedText` was a sketch
  slip). `[code: service.ts addHighlight; validators AddHighlightSchema]`
- **BR-BK-S4-3 (bookmark — work-anchored / BK-5/BOO-16)** — `addBookmark(bookId, position, label?)` anchors to the
  work (`book_id`, no asset FK); `position` non-empty; `label` `[E]`. Guards book. `[code: service.ts addBookmark]`
- **BR-BK-S4-4 (quote — first-class per book / BK-7/BOO-17)** — `addQuote(bookId, text, position?)`; `text` `[E]`
  required. Guards book. (Embeddability = S5; tags = S9.) `[code: service.ts addQuote]`
- **BR-BK-S4-5 (inter-link / BK-6/BOO-18)** — `linkAnnotations(a, b)` writes an `entity_links` row via
  `spaces.createLink(a.id, 'book_'+b.kind, b.id)` (page_id = generic source anchor, the knowledge `linkObject`
  precedent). Guards both exist (`AnnotationNotFoundError`) + neither is a highlight (`AnnotationNotLinkableError`).
  `[code: service.ts linkAnnotations]`
- **BR-BK-S4-6 (notes via pages / BK-6/BOO-16-17)** — `openAnnotationNote(ref)` = `notes.ensureEntityNote('note',
  'book_'+ref.kind, ref.id, seed)` (idempotent; seed = bookmark label / quote text, the knowledge `openObjectNote`
  precedent). Rejects a highlight (`AnnotationNotLinkableError`). `[code: service.ts openAnnotationNote]`
- **BR-BK-S4-7 (annotations anchor to the WORK / BK-5/BOO-19)** — `listAnnotations(bookId)` returns all three
  natures for the work (soft-delete filtered, `isNull(deleted_at)` explicit per table), each an `AnnotationView`
  (`kind` + row + native `position`), ordered by `created_at`. Cross-format normalization to a viewing asset = P6
  (composes the S3 `getMappedPosition`; BOO-19 SPLIT). `[code: service.ts listAnnotations]`
- **BR-BK-S4-8 (All Quotes library / BOO-20)** — `listQuotes({bookId?})` returns quotes per-book or all
  (soft-delete filtered). The `tags?` filter is deferred to **S9** (`scopeTag`/BOO-04; the S1 `BookFilter`
  precedent — never advertise an unimplemented filter). `[code: service.ts listQuotes]`

## Shipped invariants (as of S5 — Quote-embed feed + toggles, BOO-21/22)

- **BR-BK-S5-1 (quote-embed feed — live rows, never copied / BK-7/BOO-21)** — `getEmbeddableQuotes({bookId?})`
  returns live `BookQuote` rows (soft-delete filtered, `isNull(deleted_at)` explicit — the `findWhere`-skips-filter
  rule). The returned row IS the reference; no text copy/transform (`toQuote` is a field projection). `[code:
  service.ts getEmbeddableQuotes, toQuote]`
- **BR-BK-S5-2 (toggle precedence — per-book > global / BK-7/BOO-22)** — the effective toggle resolves the per-book
  override first, global second: scoped path `override !== undefined ? override : global`; feed path
  `overrides.get(book_id) ?? global` (`??` not `||` — an explicit `false` override stays off). `[code: service.ts
  resolveEmbedToggle; getEmbeddableQuotes feed filter]`
- **BR-BK-S5-3 (deny-safe permissive default / NIT-3)** — an absent `preferences?` port ⇒ every non-deleted quote
  is embeddable (fail-OPEN, the habits `backfillWindowDays` precedent — a convenience policy, not a security gate).
  Narrow 2-read port (`getQuoteEmbedGlobal`/`getQuoteEmbedOverride`), not a coupling to full `services/preferences`.
  `[code: service.ts (both `!preferences` fast-paths); types.ts PreferencesPort]`
- **BR-BK-S5-4 (`QuoteEmbedDisabledError` — scoped throws, feed excludes / BK-7/BOO-22)** — a SCOPED
  `getEmbeddableQuotes({bookId})` whose book resolves toggle-OFF throws `QuoteEmbedDisabledError(bookId)`; the GLOBAL
  `{}` feed EXCLUDES toggle-off books and never throws (a feed yields a filtered list). An empty-but-ENABLED book
  returns `[]` (empty ≠ disabled). `[code: service.ts getEmbeddableQuotes; contract.md:68]`
- **BR-BK-S5-5 (references, never copies / BK-7/conventions.md:22)** — the feed returns the stored quote rows
  (id/text/position preserved); the editor stores a reference (quote id) and re-reads — copying text into the embed
  node is excluded (and a P6 concern). `[code: service.ts getEmbeddableQuotes]`

## S6 — Reading sessions + Reader orchestration (BOO-23/24/25/26/39)

- **BR-BK-S6-1 (`registerBooks()` / BOO-23, IR-1)** — a call-once, `DuplicateSubType`-guarded registration of the
  `reading` `SessionTypeDef`, every field a transcription of **ADR-004 §3.2**: `effects:[]` (§3.2.2 — Books is a
  non-feeder per **C-E2** `rerun books.md:73`), lifecycle `scheduled→in_progress→completed` (§3.2.3),
  `permissions.allowed_effects:[]` (§3.2.4 — `∅` ⊆ shipped), `default_purpose:'reading'`. Idempotent. Registers ONLY
  the sub-type (no study_method — Books isn't a review method). `createSession('reading')` throws
  `SessionTypeNotFound` until it runs. `[code: service.ts registerBooks/READING_SESSION_TYPE_DEF; ADR-004 §3.2.2-3.2.4]`
- **BR-BK-S6-2 (`startSession` / BOO-23, BK-10, ADR-004 §3.1/§3.2.1)** — creates a base `sessions` `reading` row
  (`in_progress`, `started_at` stamped at creation — the engine auto-stamps only on a transition INTO in_progress) +
  the Books `reading_sessions` extension keyed `session_id`, and attaches **the book** (`entity_type='book'`, the
  §3.2.1 instance target; `book_asset` is an excluded ENTITY_TYPE). Guards the book (+ the asset, same-book, for
  `{assetId}`). Never a `study_session` reuse, never a standalone table. `[code: service.ts startSession; _registry.ts:87-89]`
- **BR-BK-S6-3 (`endSession` / BOO-24, BK-10)** — `id`=the base `session_id`; `completeSession` transitions the base
  row in_progress→completed (stamps `ended_at`) + updates the extension's mode-adaptive capture
  (`pages`→`pages_read`, `position`→`position_delta`, `stopPoint`→`stop_point`; `statistics` stays null — the dormant
  M2 seam). Guards exists → `ReadingSessionNotFoundError`. `[code: service.ts endSession]`
- **BR-BK-S6-4 (`attachPhoto` — photo ALWAYS stores / BOO-25, BK-10, conventions.md:53-54)** — stores the photo via
  `attachment?` (absent ⇒ `attachment-unavailable`; present-port reject ⇒ fail-loud `AssetFileError`) AND OCRs it via
  `ai?` (on_device, ZK-safe; absent/denied ⇒ `ai-unavailable`) — the two are **independent**: an OCR failure never
  discards the photo. Durable photo row + daily-Journal feed = S10/M2. `[code: service.ts attachPhoto]`
- **BR-BK-S6-5 (`getStatistics` / BOO-26, C-E2)** — derives `{sessionsLogged, pagesRead, minutesSpent}` over the
  reading-sessions ledger (+ the base session `started_at`/`ended_at` clock for minutes, completed sessions only;
  in-progress ⇒ 0 minutes but still counted). Never stored; no economy grant (grants ride base-`sessions`).
  `[code: service.ts getStatistics]`
- **BR-BK-S6-6 (`openReader` — the Reader service face / BOO-39, BK-15)** — decrypt the asset via
  `attachment?.download` (absent/no `file_ref` ⇒ `attachment-unavailable`; present-port reject ⇒ `AssetFileError`,
  the S6 decrypt throw site) + auto-start a reading session + resolve the asset's OWN position as a `MappedPosition`
  (native ⇒ synced-to-self, null ⇒ not-synced; never a cross-format guess, BK-4). The read/listen/annotate chrome is
  P6. `[code: service.ts openReader; parts/books.md:49]`
- **BR-BK-S6-7 (C-E2 guard)** — Books declares no effect and emits no `award_xp`/`grant_currency` (realized by the
  empty `reading` envelope); the reading-completion grant rides the base-`sessions` sub-type. S6 takes no `effects?`
  dep. `[rerun C-E2 books.md:73,119,138; BK-10]`
- **BR-BK-S6-8 (persistence / F1 + JSON boundary / N-fold)** — `reading_sessions` repo = `softDelete:false`,
  `encryptedFields:[]`; NO `deleted_at` (session extension, BR-BK-4). `statistics` (`json<Record>`) is parsed
  defensively on read (`toReadingSession`), write path dormant (M2). `@vida/types` `ReadingSession` interface added
  (the S3/S4 N-fold). `AttachmentPort` extended additively with `download`. `[code: service.ts readingRepo/toReadingSession;
  @vida/types learning.ts; schema/books.ts:147-162]`

## S7 — Reading plans / Quota Planner (BOO-27/28/29/30/31/32/33)

- **BR-BK-S7-1 (`createPlan` — Books-owned, NO axes / BOO-27, BK-11/BK-12, C-M1)** — creates a `reading_plans` row +
  one `reading_plan_books` row per book (sequence for `sequenced`), computes + stores the initial `quota_distribution`.
  Validates `arrangement`/`goalType`/≥1 book (each guarded → `BookNotFoundError`). **No `measurement_kind`/`binding_mode`
  written** — the pursuable goal is Purpose-owned (C-M1; Purpose unbuilt → no dep). `manual` takes the caller's `quota`;
  `auto` derives it. `[code: service.ts createPlan; rerun C-M1 books.md:71]`
- **BR-BK-S7-2 (auto-goal + distribution — arithmetic, Calendar stubbed / BOO-28/29)** — `goal='auto'` daily quota =
  `ceil(Σ total_pages / max(1, daysUntilTarget))`; a book with no `total_pages` contributes 0 (honest, never guessed);
  `quota_distribution.calendarReconciled=false` keeps the Calendar-slot forward-dep visibly stubbed. `[code: service.ts
  computeDistribution; structure-data.md:48-49]`
- **BR-BK-S7-3 (`getTodayQuotas` — derived provider / BOO-30)** — per active plan, `{target (today's daily quota),
  done (cumulative), status}` where `status` compares cumulative done vs `dailyQuota × daysElapsed` (behind/on-pace/
  ahead). Derived on read, never stored; feeds the Reading Hub + Journal `/summary` (wired S10). `[code: service.ts
  getTodayQuotas; structure-data.md:38-41]`
- **BR-BK-S7-4 (`recordQuotaProgress` — idempotent credit / BOO-31)** — credits a reading session's `pages_read` into
  `recalculation_state.progressBySession[sessionRef]` (OVERWRITE, not add → idempotent; `pagesDone` recomputed from the
  map). Guards the plan (`ReadingPlanNotFoundError`) AND the session (`ReadingSessionNotFoundError` — never a silent
  0-credit). `[code: service.ts recordQuotaProgress]`
- **BR-BK-S7-5 (`recalculate` — reshape or propose, never silent drop / BOO-32, BK-11)** — on/ahead of pace
  (`requiredDailyQuota = ceil(remainingPages/remainingDays) ≤ original dailyQuota`) reshapes `dailyQuota` silently +
  returns the plan; **behind** (`>` original, or `remainingDays ≤ 0` with pages left) throws `TargetUnreachableProposal`
  (`options: ['extend_date','raise_quota']`, `suggestedDate` keeps the pace, `suggestedQuota` keeps the date;
  `remainingDays ≤ 0` ⇒ `extend_date` only). Never a silent target rewrite. `[code: service.ts recalculate;
  conventions.md:28-29]`
- **BR-BK-S7-6 (`getProjection` — derived trajectory / BOO-33)** — derives `{projectedCompletionDate, onTrack,
  remainingPages, remainingDays}` (arithmetic; Calendar stubbed). Derived on read, never stored. Guards the plan.
  `[code: service.ts getProjection; structure-data.md:48]`
- **BR-BK-S7-7 (BK-12 ownership)** — `createPlan`/`recordQuotaProgress`/`recalculate` are Books-only writes; no plan-
  write surface is exposed to consumers (the Study-Planner read-provider is S10/BOO-45). `[business-rules.md:62-64]`
- **BR-BK-S7-8 (persistence / json write boundary / atomic / N-fold)** — `reading_plans`+`reading_plan_books` repos
  `softDelete:true`, `encryptedFields:[]`; `quota_distribution`/`recalculation_state` `json<Record>` are WRITTEN
  (serialize on write, parse on read — `toReadingPlan`/`parseDistribution`/`parseState`); `createPlan` writes plan +
  junctions ATOMICALLY (`db.transaction`+`createInTx`, both Books-local); `@vida/types` `ReadingPlan`+`ReadingPlanBook`
  N-fold; pure date helpers + `asOf?` seam (no clock dep). `[code: service.ts plansRepo/createPlan; schema/books.ts:165-188]`

## S8 — Unified progress + conflict resolution (BOO-13/34/35)

- **BR-BK-S8-1 (unified progress is derive-on-read / BK-3, BOO-13)** — `getUnifiedProgress(bookId)` returns
  `number | 'conflicted' | null` (guards the book → `BookNotFoundError`). It inlines `resolveProgress` §3.2 semantics:
  a non-null `books.progress` is the **manual-override terminal** (returned clamped 0–100); `null` ⇒ **derive**. No
  progress column is ever written. `books.progress` stays unsettable via the service (BR-BK-S1-1), so the override slot
  is inert at M1. `[code: service.ts getUnifiedProgress; engine.ts:56]`
- **BR-BK-S8-2 (candidate derivation — quantitative normalize / BOO-14)** — a per-asset candidate ∈ 0–100 is computed
  **only** for a page-unit asset: `format ∈ {pdf, physical, braille}` AND `native_position` matches `/^\d+$/` AND
  `books.total_pages > 0`, as `round(normalize({quantitative, current: parseInt(np), baseline: 0, target: total_pages,
  isHigherBetter: true}) × 100)` (over-100 clamps via `clamp01`). `epub`/`audiobook` (non-page units, mapping unbuilt
  BK-4) and `other` (unknown unit) yield **no candidate** — unmeasured, never guessed. `findWhere` + explicit
  `isNull(deleted_at)`. `[code: service.ts computeCandidates; engine.ts:14-22]`
- **BR-BK-S8-3 (unmeasured ⇒ null / BR-2)** — zero page-unit candidates (no copy, TOC-only, no `total_pages`, or only
  epub/audio/other) ⇒ `null`. Never coerced to 0. `[code: service.ts getUnifiedProgress; engine.ts:44]`
- **BR-BK-S8-4 (agreement ⇒ value; rounding absorbs near-ties)** — one candidate, or ≥2 whose rounded values agree
  (`new Set(progress).size === 1`), ⇒ that value. Rounding-to-agree is intentional (49.6 % and 50.4 % both → 50 ⇒ no
  false conflict). `[code: service.ts resolveClash]`
- **BR-BK-S8-5 (clash ⇒ ASK by default, RULE if set / BK-8, BOO-34/35)** — ≥2 distinct rounded values = a clash. The
  preset rule is read via `preferences?.getConflictRule(bookId)` (absent port / `undefined` ⇒ BK-8 default `ask`):
  `ask` ⇒ `'conflicted'`; `source_of_truth` ⇒ the named asset's value iff in the clash else `'conflicted'` (read-side
  miss is benign); `last_valid` ⇒ greatest `updated_at`, tie-broken by asset `id` descending (deterministic);
  `photo_valid` ⇒ `'conflicted'` (no photo-source position at M1 — OCR `ai-unavailable`; resolves automatically at M2).
  `[code: service.ts resolveClash; conventions.md:36]`
- **BR-BK-S8-6 (`PositionConflictPending` — exported typed vocabulary, NO M1 backend throw-site)** — exported as the
  typed signal for the `'conflicted'` state; **not thrown anywhere in M1 backend**. Per `contract.md:64` the only
  intended throw-site is a position **WRITE** flow (confirming a unified truth) — a P6/M2 concern; `updatePosition`'s
  per-asset `native_position` write is NOT that clash-write (each asset owns its SSOT, BK-2). The read surfaces flag
  `'conflicted'`; S9 `getReadingMeasureSource` **returns `null`** for a conflicted book (the measure contract is
  `number|null`; never throws — the `getMasterySource` precedent). *(Corrects the S8-session note that said "thrown at
  S9"; §XXIX no-silent-drift, verified in S9.)* `[code: types.ts PositionConflictPending; contract.md:64; seam-contract.md:58; BK-8]`
- **BR-BK-S8-7 (`getConflicts` — derived queue, no table / interpretation rule 7)** — guards the book
  (`BookNotFoundError`, fail-loud parity), then: an unresolved clash ⇒ one `ConflictItem`
  (`id='conflict:'+bookId`, `blocking: true`, competing `sources: PositionSource[]`), else `[]`. The id is
  deterministic (no `book_conflicts` table). `[code: service.ts getConflicts; seam-contract.md:47]`
- **BR-BK-S8-8 (`resolveConflict` — persist a valid preset via the deny-safe port / B2)** — parses `conflict:<bookId>`
  (malformed/unknown ⇒ `BookNotFoundError`); validates a `source_of_truth` `assetId` ∈ the book's non-deleted assets
  (`BookAssetNotFoundError` — a structural error, distinct from a read-side miss); persists via
  `preferences.setConflictRule`. **Absent port ⇒ no-op** (the `revokeLookupGrant` precedent, BR-BK-S2-6; real write =
  M2/P6). `[code: service.ts resolveConflict]`
- **BR-BK-S8-9 (`BookView.unifiedProgress` reconcile / BOO-03)** — `getBook` composes S8 (`unifiedProgress =
  await getUnifiedProgress(id)`), and `BookView.unifiedProgress` widened `number | null` → `number | 'conflicted' |
  null`. `getBook` still returns `null` for a missing book (never reaches the throw). `[code: service.ts getBook; types.ts BookView]`
- **BR-BK-S8-10 (`PreferencesPort` extension — NIT-3 narrow)** — the port gained the derivation **read**
  `getConflictRule(bookId): Promise<ConflictChoice | undefined>` + the `resolveConflict` **write seam**
  `setConflictRule(bookId, choice)`. The two S5 quote-embed signatures are unchanged; absent port ⇒ permissive read
  (`ask`) + no-op write. Real Preferences keys = M2/P6 (zero-signature swap). `[code: types.ts PreferencesPort]`

## S9 — Education partition + measurement source + tags + linkable-target (BOO-04/14/36/37/38/46)

- **BR-BK-S9-1 (`scopeTag` — classification via entity_tags / BOO-04, BK-16)** — `scopeTag(bookId, scopedTag)` guards
  the book (`BookNotFoundError`) + that `scopedTag` resolves to a live `tags` row (`tagsRepo.findById == null ⇒
  TagNotFound` — the create-path silent-orphan guard; `spaces.tagEntity` blind-inserts the tag_id), then delegates to
  `spaces.tagEntity(scopedTag, 'book', bookId)` → `EntityTagRow`. The book row stays lean (no inline `tags`/`genre`).
  `[code: service.ts scopeTag; knowledge scopeTag precedent]`
- **BR-BK-S9-2 (`linkSubject` — Education partition junction, idempotent, faithful row / BOO-36, BK-13)** — guards the
  book (`BookNotFoundError`); `subjectId` trusted (no Education read — KNO-25). No schema `UNIQUE(book_id,subject_id)`
  → app-layer idempotency: an existing **active** (`isNull(deleted_at)`) link is returned as-is; else create **+
  re-read via `findById`** so both paths return a faithful `BookSubjectRow` (B1 — `create()` echoes the input).
  `[code: service.ts linkSubject; schema/books.ts:191-199]`
- **BR-BK-S9-3 (`unlinkSubject` — soft-delete, idempotent / BOO-36)** — soft-deletes the active `(book_id,subject_id)`
  link; a no-op when none exists (never throws). Books-only write (BK-13 boundary). `[code: service.ts unlinkSubject]`
- **BR-BK-S9-4 (`listBooksForSubject` — Books→Education read surface / BOO-37)** — active junction rows for a
  `subject_id` (`findWhere` + explicit `isNull(deleted_at)`, sorted by `created_at`) → `booksRepo.findById` each
  (soft-delete filtered — deleted books drop) → `Book[]`. The `subject_id` query is unindexed (accepted M1 cost;
  frozen schema). `[code: service.ts listBooksForSubject]`
- **BR-BK-S9-5 (`getPaceStatus` — deny-safe null at M1 / BOO-38, BK-13)** — guards the book (`BookNotFoundError`) then
  returns `null`: Education's `subject_schedules`/assessments are **unbuilt** (`#52`), so a pace is never fabricated
  (the `MasterySource` null precedent). `subjectId` trusted, not guarded (the KNO-25 cross-module boundary); it is the
  M2-ready signature. `[code: service.ts getPaceStatus; slice-map.md:49]`
- **BR-BK-S9-6 (`getReadingMeasureSource` — the reading measure SOURCE / BOO-14, C-M1)** — a **method** (per-book,
  async — the KNO-25 `getMasterySource` pattern; NOT `advertise()`). Composes `getUnifiedProgress` (which guards the
  book) and returns `ReadingMeasureSource { progress }` where `'conflicted'`/`null` ⇒ `null` (a conflict is "not
  measurable yet", never a throw). No stored `books.measurement_kind` (C-M1 — the `quantitative`/`derived-pull`
  vocabulary is referenced, not authored). `[code: service.ts getReadingMeasureSource]`
- **BR-BK-S9-7 (BOO-46 — Books as a linkable TARGET, identity only)** — `'book'` + `'book_chapter'` are registered
  `ENTITY_TYPES` → valid tag/link targets for Knowledge/review/Skills/Purposes, which own those links; Books exposes
  the identity and authors nothing. No new method; the seam-contract's `backlinks` dep is **not wired** (no consuming
  read-method — No-Guessing). `[code: _registry.ts:89-90; seam-contract.md:146-147]`
- **BR-BK-S9-8 (partition boundary / BK-13)** — Books reaches Education only through the junction + (future) contract;
  never a direct Education table read. `subjectId` trusted; no junction write is exposed to Education (Books-owned).
  `[business-rules.md:65-68]`

### S10 — Integration close-out + fan-out + Journal (BOO-40/41/42/43/45/47) — THE FINAL SLICE

- **BR-BK-S10-1 (BOO-40/41 — TTS/transcription deny-safe)** — `convertToSpeech`/`transcribeForMapping` are scoped model
  calls (X11→ADR-015; NOT AI4) through the deny-safe `ai?` port, mirroring `attachPhoto`/`assistCompoundSet`: no dep OR
  a denied/failed `askModel` ⇒ `ai-unavailable`; a `ready` result carries `source:'ai'` (AI6). Books stamps its OWN
  `defId` (`BOOKS_TTS_INTEGRATION_ID`/`BOOKS_TRANSCRIPTION_INTEGRATION_ID` — No-Guessing); the caller picks only the
  mode (AI1). Guards the asset (`BookAssetNotFoundError`). The manual fallback always stays callable (BK-14).
  `[code: service.ts runModelCall; parts/books.md:50-51]`
- **BR-BK-S10-2 (BOO-42/43 — the consent gate)** — `IntegrationConsentError` is exported BK-14 typed vocabulary with
  **NO M1 backend throw-site** (the `PositionConflictPending`/BR-BK-S8-6 precedent): at M1 no consent refusal is
  producible (no consent store; the deny-safe ports return `*-unavailable`, and `on_device` never egresses), so the
  methods map every deny to the deny-safe state — **no `checkModelCall` gate, no throw-through** (`seam-contract.md:153`).
  The real consent gate that throws it is M2. `[FACT: ai/types.ts:98-100; seam-contract.md:57,153; business-rules.md:69-76]`
- **BR-BK-S10-3 (BOO-45 / BK-12 — Study-Planner read-provider)** — `getPlansForConsumer()` returns the active plans
  (soft-delete filtered), read-only; Books exposes NO plan-write to consumers (the boundary invariant — Books owns
  plans, consumers consume). Distinct from `getTodayQuotas` (the derived pace view). `[parts/books.md:55; BK-12]`
- **BR-BK-S10-4 (BOO-26 / C-E2 — measurement-only fan-out)** — `endSession` emits ONE `emit_measurement_signal`
  (grain = base session id, exactly-once per completion; `targetRef` = book_id) via the deny-safe `effects?` port —
  emit-only, post-commit, failure-isolated, rail-idempotent, **dormant** without `effects?`/a registered handler.
  **NEVER an economy grant** (C-E2 — `award_xp`/`grant_currency` ride the base-`sessions` sub-type, not Books).
  **No named M1 consumer** (the reading measure is derived-pull, BR-BK-S9-6) ⇒ a dormant seam-only signal (a handler
  registers downstream at M2), not a live re-derive like knowledge's `review.recorded`. `[code: service.ts
  fanOutReadingCompletion; slice-map.md:24; effects/types.ts:22; rerun C-E2 books.md:73]`
- **BR-BK-S10-5 (BOO-30 — Journal contribution)** — `registerBooksJournal(registry, svc)` plugs a `sectionKey:'summary'`
  / `module:'books'` contribution; `summary(date)` composes `getDayBooksDigest` (pages read + sessions logged over the
  day's completed-session `ended_at` window, the `getStatistics` timing; + plan pace tallies) → `state:'success'` on
  activity, `state:'empty'` on an idle day, never a throw (the per-section degrade is the dashboard's). Reuses
  `TerminalState` BY TYPE (the knowledge precedent). Coexists with other modules under 'summary' (registry dedups by
  `module`). `[code: journal.ts; parts/books.md:40; knowledge/journal.ts]`
- **BR-BK-S10-6 (BOO-47 / BK-18 — local-first)** — every Books write (position/annotation/session/plan) succeeds
  locally first (DB-6 Repository write-through; no network dependency); LWW per entity via the sync seam. A platform
  baseline asserted here, not a new write path. `[business-rules.md:88-89; conventions.md:41-42]`

## Carry-forward (homed to a later slice)

- **`listBooks`/`listQuotes` tag·subject·format-owned filter completions** (BOO-02/BOO-20 query halves) → a later leg
  (NOT S9 — the slice-map scopes S9 to entity_tags *classification*, the `scopeTag` write; "never advertise an
  unimplemented filter"). *(S4 "Embeddability = S5" CLOSED by BR-BK-S5-1..5; S3 annotation-survival CLOSED by
  BR-BK-S4-7; S2 "Chapter READ path" CLOSED by BR-BK-S3-8; S1 "Derivation lands at S8" CLOSED by BR-BK-S8-1..9.)*

## Deferred (homed, not yet enforced — see delivery/slice-map.md Deferred-by-design)

Cross-format mapping `NotSyncedState` (S3, algorithm = build-phase design pass) · ISBN lookup **real fetch +
normalization** (M2 — mediator + registry; the S2 port is built deny-safe) · OCR / TTS / transcription **real model
pipelines** (M2 — on-device runtime + cloud mediator + `source=ai` row authorship; the `ai?` ports are built deny-safe,
S6/S10) · R2 file/photo (deny-safe port, M2) · **conflict-rule real Preferences write** (M2/P6 adapter — the S8 port
seam is built) · **`PositionConflictPending` on-write block** (a P6/M2 position-write/unified-truth-confirm flow,
`contract.md:64`; the M1 backend never throws it) · **the real consent gate** that throws `IntegrationConsentError`
(M2 — needs the persisted consent store; the BK-14 typed vocabulary is exported now, S10) · **the `effects?`
measurement handler** (who consumes `emit_measurement_signal` — registered downstream, M2; the fan-out is dormant
emit-only now) · C-E2 (no economy grant on Books — grants ride base-`sessions`) · C-M1 (no stored measurement axes).
*(Unified-progress derivation + the derived conflict queue (S8) + the Education partition·tags·measure-source (S9) +
integrations·fan-out·Journal (S10) are now BUILT — BR-BK-S8/S9/S10-*. Education pace ships the deny-safe `null` shape;
the real derivation awaits Education `#52`, M2. **① backend COMPLETE — all 48 BOO legs delivered.**)*
