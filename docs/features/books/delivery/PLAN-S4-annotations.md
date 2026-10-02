<!-- Entity Delivery Flow (v1) · per-slice SERVICE track · mod-books #51 (LIF-117) · S4 -->
<!-- PLAN (gate 1 = the SPEC). Cadence: g1 /critique → build → tsc → live-store Verification Gate → code-review →
     /critique SHIP → §XXIX currency. No per-slice Victor approval (Approval 1 covered the plan). -->

# PLAN — S4: Annotations + notes/links  (BOO-15/16/17/18/19/20)

## §1 Context (ground truth)

S1–S3 shipped (Works · Chapters · Assets/mapping). S4 adds the **three annotation natures** (BK-6) over the DB-4
tables `book_bookmarks` / `book_highlights` / `book_quotes` (`schema/books.ts:103-145`), composing two BUILT
substrates: `foundation/spaces` (entity_links WRITE) + `services/notes` (pages-backed notes). The entity-type
registry already carries `book_bookmark` + `book_quote` and **deliberately excludes `book_highlight`**
(`_registry.ts:85-96` — "BK-6 — deliberately no notes/links on highlights") — so the registry IS the BK-6
enforcement: any attempt to link/note a highlight fails loud via `spaces`/`notes` `UnknownEntityType`.

**Legs (slice-map.md:18):** BOO-15 (`addHighlight`), BOO-16 (`addBookmark`), BOO-17 (`addQuote`), BOO-18
(`linkAnnotations` bookmark↔quote), BOO-19 (annotations anchor to the WORK, mapping-normalized), BOO-20
(`listQuotes` / `listAnnotations` library reads).

**Fold carry-forward (from S3):** the annotation-survival test for `removeAsset` (BR-BK-S3-4, structural no-FK)
lands here, now that annotations exist.

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S4-*)

- **BR-BK-S4-1 (three annotation natures / BK-6)** — highlights, bookmarks, quotes are **distinct tables**.
  Highlights are deliberately light (NO notes, NO inter-links); bookmarks + quotes take notes (via `pages`) and
  inter-link. Enforced structurally: `book_highlight` is NOT a registered `entity_type` (`_registry.ts:85-96`),
  so `spaces`/`notes` reject it fail-loud.
- **BR-BK-S4-2 (highlight — digital span, work-anchored / BOO-15)** — `addHighlight(assetId, {capturedText,
  position})` creates a `book_highlights` row; `book_id` is **derived from the asset** (guards the asset exists →
  `BookAssetNotFoundError`); `asset_id` records the digital-content source. `captured_text` is `[E]`. No notes/links.
- **BR-BK-S4-3 (bookmark — work-anchored position marker / BK-5/BOO-16)** — `addBookmark(bookId, position,
  label?)` creates a `book_bookmarks` row anchored to the **work** (`book_id`, no asset FK). `label` is `[E]`.
  Guards the book exists (`BookNotFoundError`).
- **BR-BK-S4-4 (quote — first-class, per book / BK-7/BOO-17)** — `addQuote(bookId, text, position?)` creates a
  `book_quotes` row; `text` is `[E]` (required). Guards the book exists. (Embeddability = S5; tags = S9.)
- **BR-BK-S4-5 (inter-link bookmark↔quote only / BK-6/BOO-18)** — `linkAnnotations(a, b)` writes an
  `entity_links` row via `spaces.createLink(a.id, 'book_'+b.kind, b.id)` (the knowledge `linkObject` precedent —
  `page_id` is a generic source anchor). Guards **both** annotations exist (`AnnotationNotFoundError`). A highlight
  endpoint fails loud via the registry (`book_highlight` unregistered → `UnknownEntityType`) — the BK-6 enforcement.
- **BR-BK-S4-6 (notes on bookmarks/quotes via pages / BK-6/BOO-16-17)** — `openAnnotationNote(ref)` =
  `notes.ensureEntityNote('note', 'book_'+ref.kind, ref.id, seed)` (idempotent; the knowledge `openObjectNote`
  precedent). Guards the annotation exists. A highlight ref fails loud via the registry (no `book_highlight`).
- **BR-BK-S4-7 (annotations anchor to the WORK / BK-5/BOO-19)** — `listAnnotations(bookId)` returns all three
  natures for the work (soft-delete filtered), each as an `AnnotationView` (`kind` + the row + its native
  `position`). Cross-format normalization to a *viewing* asset is the P6 Reader composing the S3
  `getMappedPosition` (BOO-19 is SPLIT; the service half is the work-anchored list — the mapping algorithm is
  unbuilt at M1, S3 BR-BK-S3-5).
- **BR-BK-S4-8 (All Quotes library / BOO-20)** — `listQuotes(scope: { bookId? })` returns quotes for a book or
  all (soft-delete filtered). The `tags?` filter is deferred to **S9** (tag WRITES = `scopeTag`/BOO-04/S9; the S1
  `BookFilter` precedent — never advertise an unimplemented filter).

## §3 Deferred (homed, not built here)

- `backlinks` dep (entity_links READ) → **S9** (BOO-46 linkable-target; S4's BOO-18 is a WRITE via `spaces`).
- `tags?` on `listQuotes` + tag application → **S9** (BOO-04 `scopeTag`).
- quote-embed feed (BOO-21/22) → **S5**. Inter-link/embed DISPLAY in the P6 Quotes library → P6 (composes reads).
- cross-format annotation normalization to a viewing asset → P6 (composes the S3 `getMappedPosition`).

## §4 Acceptance (the live-store Verification Gate maps 1:1)

1. `addBookmark` creates a work-anchored row (label `[E]`); guards book (`BookNotFoundError`); re-reads faithfully.
2. `addQuote` creates a row (`text` `[E]`, required; empty rejected); guards book.
3. `addHighlight` derives `book_id` from the asset, records `asset_id` + `captured_text`; guards asset
   (`BookAssetNotFoundError`).
4. `linkAnnotations(bookmark, quote)` writes an `entity_links` row; guards both exist (`AnnotationNotFoundError`);
   a **highlight** endpoint (source OR target) fails loud (`AnnotationNotLinkableError` — see §6 P3 correction).
5. `openAnnotationNote(bookmark|quote)` is idempotent (same page on re-call); guards exists; a **highlight** ref
   fails loud (`AnnotationNotLinkableError`).
6. `listAnnotations(bookId)` returns all three natures work-anchored, soft-delete filtered, each with its position.
7. `listQuotes({bookId})` vs `listQuotes({})` — per-book vs all; soft-delete filtered.
8. **S3 fold (the HARD case)** — add a **highlight** whose `asset_id` = an asset, then `removeAsset` that asset:
   the highlight **survives** (no cascade — no-FK). `[FACT: business-rules.md:99-100 "annotations made in a
   deleted asset's native format remain… flagged native"; schema/books.ts:123 asset_id]`. (A work-anchored
   bookmark survives trivially — the highlight is the real proof.)

tsc 0 · eslint 0 · full `@vida/core` suite green (modulo the documented vault flake).

## §5 Implementation prompt (type-first; factory-object; no `this.`)

1. **`@vida/types/learning.ts`** — add `BookBookmark`, `BookHighlight`, `BookQuote` interfaces (N-fold, the
   `BookAsset` precedent) mirroring the rows (`book_id`; bookmark: `position`/`label`[E]; highlight:
   `asset_id`/`captured_text`[E]/`position`; quote: `text`[E]/`position`; all `deleted_at`).
2. **`validators/books.ts`** — `AddBookmarkSchema` (`position` non-empty, `label?` nullable), `AddHighlightSchema`
   (`captured_text` + `position` non-empty), `AddQuoteSchema` (`text` non-empty, `position?` nullable). **Field
   casing = snake_case `captured_text`** (B1 reconcile) — mirrors the books input convention (`ChapterSeed.start_page`,
   `CreateBookInput.total_pages`, `AddAssetInput.native_position` are all snake_case) + the column `captured_text`
   (`schema/books.ts:125`) + the @vida/types interface convention; the frozen seam-contract's `capturedText`
   (camelCase) is a one-off sketch slip, recorded in currency. `[FACT: validators/books.ts; schema/books.ts:125]`
3. **`services/books/types.ts`** — `BookAnnotationKind = 'bookmark'|'highlight'|'quote'`; `AnnotationRef =
   {kind; id}`; `AnnotationView = {kind; annotation: BookBookmark|BookHighlight|BookQuote; position: string|null}`;
   `QuoteScope = {bookId?: string}`. Extend `BooksServiceDeps` with `spaces: SpacesService` + `notes: NotesService`
   (required). New error `AnnotationNotFoundError`. Append the 7 methods to `BooksService`. Import `EntityLinkRow`
   + `PageRow` for return types (the knowledge precedent).
4. **`services/books/service.ts`** — three repos (`bookmarksRepo`/`highlightsRepo`/`quotesRepo`,
   `softDelete:true`, `encryptedFields:[]`); `toBookmark`/`toHighlight`/`toQuote` mappers. Implement the 7 methods;
   `linkAnnotations`→`spaces.createLink`, `openAnnotationNote`→`notes.ensureEntityNote`, both mapping
   `kind→'book_'+kind`. **`openAnnotationNote` seed** (B3) = `{ title: label ?? '' }` for a bookmark, `{ title:
   text }` for a quote — the knowledge `openObjectNote({ title: obj.title })` precedent (`service.ts:518`);
   `ensureEntityNote` folds the seed into content idempotently (keys on the entity, not the seed). `listAnnotations`
   unions the three soft-delete-filtered reads, **ordered by `created_at`** (B-NIT). Guard-exists helpers per table.
5. **Tests** — append an S4 `describe` with mock `spaces` + `notes` (or compose the real built services over the
   live store — prefer REAL `createSpacesService`/`createNotesService` so the registry enforcement + idempotency
   are exercised, not mocked). 10+ cases per §4 incl. the highlight-rejection + the S3-fold survival test.
6. **Currency** — promote BR-BK-S4-1..8; refresh `current-spec.md`; update the slice-map gate ledger (S4 row) +
   close the S3→S4 annotation-survival carry-forward.

## §6 g1 resolution (grounded in the corpus — Victor's standing "ground them in the documentation")

- **P1 — `linkAnnotations` allowed pair** — RESOLVED: the corpus forbids **only highlights**
  (`conventions.md:50` "Never put notes/inter-links on highlights"; BK-6). Nothing forbids bookmark↔bookmark or
  quote↔quote. So enforce highlight-exclusion only (via the registry); the seam-contract "bookmark↔quote only" is
  the representative description, not a distinct-type mandate — manufacturing a distinct-type guard would invent a
  constraint the docs don't state.
- **P2 — `addHighlight` format gate** — RESOLVED: no corpus rule mandates a service-level rejection of a
  non-digital asset, and the frozen error set has no such error; `identity.md:25` / BOO-15 "digital-content"
  describe the highlight's *nature* + a P6 affordance (the Reader offers highlighting only on digital assets).
  → guard the asset exists + derive `book_id`; do NOT gate format.
- **P3 — highlight link/note rejection** — RESOLVED, then **CORRECTED at build** (§XXVIII, Verification-Gate-caught):
  the registry (`_registry.ts:85-96` excluding `book_highlight`) backstops a highlight as a link **TARGET** /
  note-entity — but `spaces.createLink` validates ONLY the target `entity_type`, **never the SOURCE anchor**
  (`foundation/spaces/service.ts:158` `assertRegistered(entityType)`). So a highlight as a link *source* would pass
  the registry into a persisted `entity_links` row — a real BK-6 violation (the knowledge `linkObject` precedent
  never hit this: its source is always a registered type). Books is the first consumer with an unregistered type as
  a potential source. **Correction:** Books enforces the full rule at its own boundary via `assertLinkable(ref)` →
  `AnnotationNotLinkableError` (both endpoints, before delegating); the registry remains a backstop. Grounded in
  `conventions.md:50` ("Never put notes/inter-links on highlights") + BK-6 — the fail-loud realization of a real
  rule, not a manufactured error. (The live Verification Gate caught the registry-only lean failing.)
- **P4 — `backlinks` dep homing** — RESOLVED: `conventions.md:22` (quote-embed = S5) + BOO-46 (linkable-target =
  S9) → no S4 read needs the resolver; the inter-link/embed DISPLAY is P6. S4 deps = `spaces` + `notes` only.

No open points remain for Victor — every resolution cites the corpus. Cleared to build.
