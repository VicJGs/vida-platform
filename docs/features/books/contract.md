<!-- Contract — features/books · /documentation Phase 2 · sources: ADR-002 §Books · learning.ts · docs/intake/books.md -->

# Contract — Books  (level: Feature / own module)

> **Status:** types exist for the FACT base only (`Book`, `BookChapter` in `@vida/types/learning.ts` — to be
> re-homed with the extraction); `@vida/core` has **no book logic** (`models/learning.ts` = 0 lines). Every
> signature below beyond FACT-base CRUD is the **designed interface** (⚠ INTENDED).
> `[FACT: learning.ts L131-171; wc -l]`

## Exposed surface (via `@vida/core`)
- **Works (FACT base + reframe):** CRUD + `listBooks(filter: status|tags|format-owned|subject)` ·
  `getBook(id)` → work + assets + unified progress. `[FACT: Book L131-157; INTENT B2]`
- **Assets (⚠ INTENDED):** `addAsset(bookId, {format, file?})` (encrypted upload for digital) ·
  `updatePosition(assetId, nativePosition)` · `removeAsset(id)` (work-level annotations survive, BK-5) ·
  `getMappedPosition(assetId, targetAssetId)` → position | **`NotSyncedState`** (BK-4).
- **TOC (⚠ INTENDED):** `setChapters(bookId, chapters[])` (manual) · `lookupBook(isbn|query)` → metadata + TOC
  (consent-gated, BK-14) · chapter completion tracking. `[FACT: book_chapters L2445-2469]`
- **Annotations (⚠ INTENDED):** `addHighlight(assetId, span)` · `addBookmark(bookId, position, label?)` ·
  `addQuote(bookId, text, position?)` · `linkAnnotations(bookmarkId|quoteId, quoteId|bookmarkId)` ·
  notes on bookmarks/quotes via `pages` (never inline).
- **Quotes feed (⚠ INTENDED):** `listQuotes(bookId|all, {tags?})` · `getEmbeddableQuotes(scope)` — respects
  per-book>global toggles (BK-7); consumed by the Notes/Pages quote-embed block.
- **Sessions (⚠ INTENDED):** `startSession(bookId, assetId|manual)` · `endSession(id, {pages?, position?})` ·
  `attachPhoto(sessionId, photo)` → stored encrypted + position extraction (BK-10) · `getStatistics(bookId|all)`.
- **Plans (⚠ INTENDED):** `createPlan({books[], arrangement: sequenced|parallel, goal: manual|auto, target})` ·
  `getTodayQuotas()` (Hub + Journal `/summary`) · `recordQuotaProgress(planId, sessionRef)` ·
  `recalculate(planId)` → reshaped distribution + make-up proposal (BK-11) · `getProjection(planId)`.
- **Conflict resolution (⚠ INTENDED):** `getConflicts(bookId)` · `resolveConflict(id, choice)` ·
  preset rule read from Preferences (BK-8).
- **Books→Education partition (⚠ INTENDED, immature):** `linkSubject(bookId, subjectId)` / `unlinkSubject` ·
  `listBooksForSubject(subjectId)` · `getPaceStatus(bookId, subjectId)` → on-pace|behind|ahead vs next
  class/assessment (reads Education's contract, BK-13).

## What it consumes (outside dependencies)
- **Notes & Pages** — notes on bookmarks/quotes/book (typed per-type UIs for summary/key-takeaways) via
  `pages`; backlinks via `entity_links` (`'book'`/`'book_chapter'` exist; annotation types = amendment).
  `[FACT: ADR-002 L1342-1346]`
- **Shared scoped tags** — publisher/genre/category grouping (BK-16). `[INTENT B11]`
- **Attachments (R2 pipeline)** — encrypted book files + page photos. `[FACT: ADR-003]`
- **Education** — `subject_schedules` + assessment dates through its contract (BK-13). `[INTENT B7]`
- **Preferences** — quote-embed toggles, conflict rule, reader/companion defaults. `[INTENT B12-E]`
- **⚠ Extension layer (Books governing principle, BK-14):** TTS · transcription (mapping) · ISBN/metadata
  lookup · photo OCR — all opt-in, consent-gated, manual fallback.

## Fed by / Consumed by
- **Study Planner** → consumes plans/deadlines/sessions (never writes; BK-12). `[INTENT B6]`
- **Daily Journal** → today's quotas (`/summary`) + page-photos (visual reading journal, BK-10). `[INTENT B16b]`
- **Education Subject Hub** → books-per-subject + pace (partition). `[INTENT B7]`
- **Knowledge** → `study_topics.linked_book_id`/`reading_chapter_id` `[FACT: L2559-2561]` · **Flashcards** →
  decks per book `[FACT: L2631]` · **Study Sessions (legacy FACT)** → `resource_type='book'` `[FACT: L2526]`.
- **Calendar entity** → quota reconciliation *(forward dep, stubbed)* · **Skills/Purposes** → they link TO
  books (ownership theirs — flagged). `[INTENT B9/B11]`

## Contract error cases
- `getMappedPosition` without a computed mapping → **`NotSyncedState`** (a typed state, not an exception —
  native position included; BK-4). `[INTENT]`
- Consent not granted → `IntegrationConsentError`; the manual path remains callable (BK-14). `[INTENT]`
- Position clash on write → `PositionConflictPending` until answered or preset rule applies (BK-8). `[INTENT]`
- File decrypt/download failure → typed `AssetFileError` — never renders an empty book (fail loud). `[INTERP]`
- `recalculate` that cannot meet the target → `TargetUnreachableProposal` (options: extend date / raise
  quota) — never a silent rewrite (BK-11). `[INTENT]`
- Embedding a quote whose book toggle is off → `QuoteEmbedDisabledError` (surfaced in editor). `[INTERP BK-7]`

## Completion checklist
- [x] exposed + consumed + fed-by/consumed-by · [x] types/errors cited · [x] integration via documented points · [x] [FACT/INTENT] each claim · [x] not-yet-coded flagged
