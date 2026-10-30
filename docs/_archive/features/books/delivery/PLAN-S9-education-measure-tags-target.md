# PLAN — S9: Education partition + measurement source + tags + linkable-target (BOO-04/14/36/37/38/46)

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice 9 of 10.
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §0 Documentation grounding (authority trace — the intent source for every S9 element)

> The aspect docs + the Part-1.2 rerun driver-tokens are the intent authority; they outrank the slice-map/seam-contract.

| S9 element                                                                                                                                                                                                         | Authoritative doc source (intent)                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`scopeTag(bookId, scopedTag)`** — publisher/genre/category are Books-scoped `entity_tags` (classification), NOT columns; retires inline `books.tags`/`genre`                                                     | **BOO-04** (`parts/books.md:14`) · **BK-16** (`business-rules.md:80-84`) · SP1 (`structure-data.md:9,12-14`) · `conventions.md:19-21`                |
| **`getReadingMeasureSource(bookId)` → `{progress: number\|null}`** — a `quantitative`/`derived-pull` reading measure; Books NAMES the axes, stores none (C-M1)                                                     | **BOO-14** (`parts/books.md:24`) · rerun C-M1 (`books.md:71`) · `interpretation.md:38` (measure source)                                              |
| measure source is a **METHOD** (per-book, async), not `advertise()` (sync+scalar globals only) — the KNO-25 `getMasterySource` precedent                                                                           | `knowledge/service.ts:502` (`getMasterySource` returns the signal, never throws) · the source-registry advertise=scalar fact                         |
| **`linkSubject`/`unlinkSubject`** — the Education partition junction `book_subjects` (m:m), replaces v1's `metadata.linked_courses`; **no direct cross-module table access** (partition API only)                  | **BOO-36** (`parts/books.md:46`) · **BK-13** (`business-rules.md:65-68`) · `structure-data.md:27` · schema `schema/books.ts:191-199`                 |
| **`listBooksForSubject(subjectId)`** — the Books→Education read surface (Education Subject Hub consumer)                                                                                                           | **BOO-37** (`parts/books.md:47`) · BK-13                                                                                                             |
| **`getPaceStatus(bookId, subjectId)` → `on-pace\|behind\|ahead\|null`** — pace DERIVATION reading Education's `subject_schedules`+assessments through the contract; **deny-safe `null` at M1** (Education unbuilt) | **BOO-38** (`parts/books.md:48`, "⚠ INTENDED-immature") · `slice-map.md:49` ("Education module not built #52; `MasterySource` null precedent")       |
| **BOO-46 — Books as a linkable TARGET** (identity only): other modules (Knowledge/review/Skills/Purposes) own the links pointing AT `book`/`book_chapter`; Books exposes the identity, owns nothing                | **BOO-46** (`parts/books.md:56`) · `seam-contract.md:146-147` · `contract.md:39,55-58` · `_registry.ts:89-90` (`'book'`/`'book_chapter'` registered) |
| `book_subjects` has **no `UNIQUE(book_id,subject_id)`** — only `book_chapters` got the doc-fixed UNIQUE; junction has synthetic-id PK + `deleted_at`                                                               | schema `schema/books.ts:191-199` · migration `023_books.ts:17,242-259` (the ONE doc-fixed UNIQUE = `book_chapters`)                                  |
| `subject_id` is **trusted from the caller** (no Education FK, no existence guard) — the KNO-25 precedent (positional ref trusted; no cross-module read to validate)                                                | `knowledge/service.ts:495-507` · BK-13 (read-across boundary, no direct table access)                                                                |

**Genuinely build-phase (resolved here, grounded):**

- `linkSubject` **idempotency** is app-layer (the schema authored no `UNIQUE(book_id,subject_id)`): an active (non-deleted) link is returned as-is, else created. `unlinkSubject` soft-deletes the active link, no-op if none. `[INTERP: no-schema-UNIQUE → app-layer idempotency; the no-FK integrity pattern]`
- `getReadingMeasureSource` maps `getUnifiedProgress`'s `'conflicted'`/`null` → `null` (the measure contract is `number|null`; a conflict is "not measurable yet", never a throw — the `getMasterySource` null precedent). **This is where S8's `PositionConflictPending` would have landed — it does NOT**: the measure source returns `null`, confirming `PositionConflictPending` has no M1 backend throw-site (corrected below).
- `getPaceStatus` takes `subjectId` for the M2-ready shape but returns `null` regardless at M1 (Education's contract is unbuilt — No-Guessing, never a fabricated pace).

**S8 currency correction (no silent drift, §XXIX).** S8 documented `PositionConflictPending` as "thrown at S9 `getReadingMeasureSource`." Re-grounding against `contract.md:64` ("Position clash **on write** → `PositionConflictPending`") + the `getMasterySource` precedent shows that is wrong: the measure source **returns `null`**, and the only intended throw-site is a **position WRITE** flow (P6/M2), not a read. **N3:** `updatePosition` (S3) is NOT that write — a per-asset `native_position` is each asset's own SSOT (BK-2), so writing it is never a clash; the blocked write is a _unified-truth assertion_ (a manual progress-override / conflict-confirm), which lives at P6/M2. So S8's `PositionConflictPending` is **exported typed vocabulary, surfaced at M1** (interpretation rule 7) with **no M1 backend throw-site**. This slice corrects `current-business-rules.md` BR-BK-S8-6 + `current-spec.md` accordingly.

**Deferred (homed, NOT built here):**

- `listBooks`/`listQuotes` **tag/subject/format-owned filter completions** (BOO-02/BOO-20 query halves) — NOT S9 legs (the slice-map scopes S9 to "entity_tags **classification**" = the `scopeTag` write); they stay carry-forward (the "never advertise an unimplemented filter" precedent — grouping/filter READ surfaces, P6 + a thin service filter, land with their own leg).
- The **real pace derivation** (reading Education's `subject_schedules`/assessments) — Education `#52` unbuilt → M2 (`getPaceStatus` ships the deny-safe `null` shape now).
- `PositionConflictPending` **on-write block** — P6/M2 position-write flow (`contract.md:64`).
- TTS/transcription (`ai?`), consent-gate, Study-Planner read-provider, local-first, `effects?` fan-out, `registerBooksJournal` — **S10**.

---

## §1 Context (ground truth)

- **Service**: `createBooksService` (`services/books/service.ts`; factory-object, no `this.`). S1–S8 shipped; @vida/core **1516/1516** green. Branch `mod-books`.
- **Schema**: `book_subjects` (`schema/books.ts:191-199`) = `baseColumns` + `book_id` + `subject_id` + `deleted_at`, no FK, **no `UNIQUE(book_id,subject_id)`**, index on `book_id` only. `BookSubjectRow`/`BookSubjectInsert` exported (`:221-222`).
- **Spaces** (existing dep): `spaces.tagEntity(tagId, entityType, entityId) → EntityTagRow` (WRITE; blind-inserts the `tag_id`, so the caller guards it resolves — the knowledge `scopeTag` precedent `service.ts:434-437`). The `tags` table + `TagNotFound` live in `db/schema/foundation/spaces` + `foundation/spaces`.
- **Registry**: `'book'` + `'book_chapter'` are registered `ENTITY_TYPES` (`_registry.ts:89-90`) → both are valid tag/link targets (BOO-46 identity).
- **S8 `getUnifiedProgress`** (`service.ts`): `number | 'conflicted' | null` — composed by `getReadingMeasureSource`.
- **Deps**: no new dep. `scopeTag` uses existing `spaces` + an internal `tagsRepo` (the knowledge pattern); `book_subjects` is Books-owned (internal repo). The seam-contract's `backlinks` dep is **not wired** (BOO-46 is identity-only; no consuming read-method).

---

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S9-\*)

- **BR-BK-S9-1 (`scopeTag` — classification via entity_tags / BOO-04, BK-16)** — `scopeTag(bookId, scopedTag)` guards
  the book (`BookNotFoundError`) + that `scopedTag` resolves to a live `tags` row (`tagsRepo.findById == null ⇒
TagNotFound`, the create-path silent-orphan guard — `spaces.tagEntity` blind-inserts), then delegates to
  `spaces.tagEntity(scopedTag, 'book', bookId)` → `EntityTagRow`. `'book'` is a registered taggable type. The row
  stays lean (no inline `tags`/`genre`). `[code: service.ts scopeTag; knowledge/service.ts:434-437]`
- **BR-BK-S9-2 (`linkSubject` — Education partition junction, idempotent / BOO-36, BK-13)** — guards the book
  (`BookNotFoundError`); `subjectId` is **trusted** (no Education read — the KNO-25 precedent). The schema authored no
  `UNIQUE(book_id,subject_id)`, so idempotency is app-layer: an existing **active** (`isNull(deleted_at)`) link for
  `(book_id, subject_id)` is returned as-is; else a `book_subjects` row is created **and re-read via `findById`** so
  BOTH paths return a FAITHFUL `BookSubjectRow` — `create()` echoes the input (omitted `created_at`/`updated_at` come
  back `undefined`), so the create path must re-read, matching the idempotent path (the `updateBook`/`updatePosition`/
  `createPlan` faithful-row precedent; the gamification-S1 create-echo trap). `[code: service.ts linkSubject; schema/books.ts:191-199]`
- **BR-BK-S9-3 (`unlinkSubject` — soft-delete, idempotent / BOO-36)** — soft-deletes the active `(book_id,
subject_id)` link (the junction has `deleted_at`); a no-op when no active link exists (never throws). Books-only
  write (BK-13 boundary). `[code: service.ts unlinkSubject]`
- **BR-BK-S9-4 (`listBooksForSubject` — Books→Education read surface / BOO-37)** — queries `book_subjects` by
  `subject_id` (`findWhere` + explicit `isNull(deleted_at)`), resolves each `book_id` via `booksRepo.findById`
  (soft-delete filtered — deleted books drop), returns `Book[]` ordered by the junction `created_at`. **N2:** the
  `subject_id` query is unindexed (`book_subjects` carries only `idx_book_subjects_book`) — a full scan, an accepted
  M1 cost (single-user local DB; the frozen schema adds no index here). `[code: service.ts listBooksForSubject]`
- **BR-BK-S9-5 (`getPaceStatus` — deny-safe null at M1 / BOO-38, BK-13)** — guards the book (`BookNotFoundError`, for
  fail-loud parity on Books-owned data) then returns `null` — Education's `subject_schedules`/assessments are
  **unbuilt** (`#52` not Done), so a pace cannot be derived and is **never fabricated** (the `MasterySource` null
  precedent). `subjectId` is **trusted, not guarded** (the KNO-25 cross-module boundary — Books never reads Education
  to validate it); it is the M2-ready signature (the real derivation reads Education's contract then). `[code: service.ts getPaceStatus; slice-map.md:49]`
- **BR-BK-S9-6 (`getReadingMeasureSource` — the reading measure SOURCE / BOO-14, C-M1)** — a **method** (per-book,
  async — the KNO-25 pattern; NOT `advertise()`, which carries only sync global scalars). Composes
  `getUnifiedProgress(bookId)` and returns a named `ReadingMeasureSource { progress: number | null }` (N1 — the
  `MasterySource` named-type precedent) where `'conflicted'`/`null` ⇒ `null` (the measure contract is `number|null`;
  a conflict is "not measurable yet", never a throw). Guards the book (via `getUnifiedProgress` → `BookNotFoundError`).
  **No stored `books.measurement_kind`** — the vocabulary (`quantitative`/`derived-pull`) is referenced, not authored
  (C-M1). `[code: service.ts getReadingMeasureSource; knowledge getMasterySource precedent]`
- **BR-BK-S9-7 (BOO-46 — Books as a linkable TARGET, identity only)** — `'book'` + `'book_chapter'` are registered
  `ENTITY_TYPES` → both are valid tag/link targets for Knowledge/review/Skills/Purposes, which **own** those links;
  Books exposes the identity and authors nothing. **No new method, no `backlinks` dep** (No-Guessing — no consuming
  read-method exists in the frozen method surface; reverse-link reads are the other modules' resolvers / P6). A test
  asserts the registration. `[code: _registry.ts:89-90; seam-contract.md:146-147]`
- **BR-BK-S9-8 (partition boundary — no direct cross-module access / BK-13)** — Books reaches Education only through
  the partition junction + (future) contract; it never reads Education tables directly. `subjectId` is trusted; no
  `book_subjects` write is exposed to Education (Books-owned). `[business-rules.md:65-68]`

---

## §3 Deferred (homed, not built here)

- `listBooks`/`listQuotes` tag·subject·format-owned filter completions (BOO-02/20 query halves) — carry-forward (not S9 legs; never advertise an unimplemented filter).
- Real pace derivation over Education's schedule/assessment contract — M2 (Education `#52` unbuilt).
- `PositionConflictPending` on-write block — P6/M2 position-write flow (`contract.md:64`).
- S10: TTS/transcription (`ai?`), consent-gate (`IntegrationConsentError`), Study-Planner read-provider, local-first invariant, `effects?` fan-out (measurement-only, C-E2), `registerBooksJournal`.

---

## §4 Acceptance (the live-store Verification Gate maps 1:1)

1. `scopeTag` — tags a book (`'book'`, live tag) → `EntityTagRow`; unknown book ⇒ `BookNotFoundError`; unresolved tag ⇒ `TagNotFound`.
2. `linkSubject` — creates a `book_subjects` row; a second call with the same `(book, subject)` returns the SAME active row (idempotent, no duplicate); unknown book ⇒ `BookNotFoundError`.
3. `unlinkSubject` — soft-deletes the active link (subsequent `listBooksForSubject` excludes it); a second call / no-link ⇒ no-op (no throw).
4. `listBooksForSubject` — returns the live books linked to a subject (soft-delete filtered on both the junction and the book); `[]` when none; a soft-deleted book is excluded.
5. `getPaceStatus` — returns `null` for a linked book (Education unbuilt); unknown book ⇒ `BookNotFoundError`.
6. `getReadingMeasureSource` — `{progress: n}` for a single-asset book; `{progress: null}` for a conflicted book and for an unmeasured/TOC-only book; unknown book ⇒ `BookNotFoundError`.
7. BOO-46 — `'book'` and `'book_chapter'` are registered taggable/linkable types.
8. `@vida/core` suite green (1516 + new S9 tests); tsc 0; eslint 0; gitleaks clean.

---

## §5 Implementation prompt (type-first; factory-object; no `this.`)

**Imports (`service.ts`):** add `tags`, `type EntityTagRow`, `TagNotFound` (from `db/schema/foundation/spaces` +
`foundation/spaces`); `bookSubjects`, `type BookSubjectRow` (from `db/schema/books`). **Repos:**
`tagsRepo = createRepository(db, tags, { deviceId, softDelete: true, encryptedFields: [] })`;
`subjectsRepo = createRepository(db, bookSubjects, { deviceId, softDelete: true, encryptedFields: [] })`.

**Types (`types.ts`):** `BookSubjectRow` + the new `ReadingMeasureSource { progress: number | null }` interface (N1);
the 6 method signatures appended to `BooksService`. No new error (reuse `BookNotFoundError`, `TagNotFound`).

**Closures (hoisted):**

- `scopeTag(bookId, scopedTag)` — `booksRepo.findById` guard → `TagNotFound` guard → `spaces.tagEntity(scopedTag, BOOK_ENTITY_TYPE, bookId)`.
- `linkSubject(bookId, subjectId)` — book guard; `subjectsRepo.findWhere(and(eq(book_id), eq(subject_id), isNull(deleted_at)))` → `[0]` if present (idempotent) else `const { id } = await subjectsRepo.create({book_id, subject_id, deleted_at:null})` then **re-read `subjectsRepo.findById(id)`** (B1 — faithful row, both paths).
- `unlinkSubject(bookId, subjectId)` — find active link → `subjectsRepo.delete(id)`; none ⇒ return (no-op).
- `listBooksForSubject(subjectId)` — `findWhere(and(eq(subject_id), isNull(deleted_at)))` → sort by `created_at` → `booksRepo.findById` each → `.filter(Boolean)` → `toBook`.
- `getPaceStatus(bookId, _subjectId)` — book guard → `return null`.
- `getReadingMeasureSource(bookId)` — `const p = await getUnifiedProgress(bookId); return { progress: typeof p === 'number' ? p : null }`.
- **Export** the 6 in the returned object.

**BOO-46:** no code; a test asserts `createTaggableTypeRegistry().isRegistered('book')` and `'book_chapter'`.

**S8 currency fix:** edit `current-business-rules.md` BR-BK-S8-6 + `current-spec.md` — `PositionConflictPending` = exported typed vocabulary, no M1 backend throw-site (on-write block = P6/M2).

---

## §6 g1 resolution (interpretations pre-grounded in the corpus)

| Potential g1 flag                                            | Resolution (grounded)                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "S9 should also finish `listBooks`/`listQuotes` tag filters" | Those are BOO-02/BOO-20 query halves, **not** S9 legs — the slice-map scopes S9 to "entity_tags **classification**" (the `scopeTag` write). Finishing them needs an association-read resolver + their own leg; keeping them carry-forward honors "never advertise an unimplemented filter" (the S1 `BookFilter`/S4 `QuoteScope` precedent). `[slice-map.md:23]` |
| "measure source should `advertise()`"                        | `advertise()` carries sync global scalars only (net_worth/streak); a per-book async measure is a **method** the consumer injects — the KNO-25 `getMasterySource` precedent. Returns `null` for conflicted (never throws). `[knowledge/service.ts:502]`                                                                                                          |
| "BOO-46 needs a `backlinks` dep / method"                    | BOO-46 is **identity-only** — the entity_types are registered; other modules own the links. The frozen method surface has no Books reverse-read, so wiring `backlinks` would be an unused dep (No-Guessing). `[parts/books.md:56; _registry.ts:89-90]`                                                                                                          |
| "`getPaceStatus` ignores `subjectId`"                        | M1 returns `null` (Education `#52` unbuilt — the contract to read doesn't exist; No-Guessing forbids a fabricated pace). `subjectId` is the M2-ready signature. `[BOO-38; slice-map.md:49]`                                                                                                                                                                     |
| "`linkSubject` could duplicate (no UNIQUE)"                  | The schema authored no `UNIQUE(book_id,subject_id)` (only `book_chapters` got one) → app-layer idempotency: return the active link if present. `[migration 023_books.ts:17]`                                                                                                                                                                                    |
| "S8 said `PositionConflictPending` throws at S9"             | **Corrected (no silent drift).** `contract.md:64` = throw on a position WRITE flow (P6/M2); the measure source returns `null`. S8's error is exported typed vocabulary with no M1 backend throw-site. This slice fixes the S8 currency docs. `[contract.md:64; interpretation.md:153-156]`                                                                      |
