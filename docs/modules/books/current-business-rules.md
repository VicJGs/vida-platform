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
  is true on a `total_pages` basis. *(S2 carry-forward: a TOC without `total_pages` should also be plannable.)*
  `[code: service.ts getCapabilities; business-rules.md:85-87]`
- **BR-BK-S1-7 (soft-delete list exclusion)** — `listBooks` excludes soft-deleted rows via an explicit
  `isNull(deleted_at)` (`findWhere` skips the soft-delete filter). `[code: service.ts listBooks]`
- **BR-BK-S1-8 (M1.0 [E] seam)** — [E] fields (title/author/isbn/review/cover_url) use `encryptedFields:[]`
  pass-through; real field encryption is M3/DB-5. `[code: service.ts booksRepo; BK-1]`

## Deferred (homed, not yet enforced — see delivery/slice-map.md Deferred-by-design)

Unified-progress derivation (S8) · cross-format mapping `NotSyncedState` (S3, algorithm = build-phase design pass)
· ISBN lookup / OCR / TTS / transcription (deny-safe ports, M2) · R2 file/photo (deny-safe port, M2) · conflict
resolution (S8, derived) · Education pace (S9, deny-safe null) · measurement source (S9) · C-E2 (no economy grant
on Books — grants ride base-`sessions`) · C-M1 (no stored measurement axes on `reading_plans`).
