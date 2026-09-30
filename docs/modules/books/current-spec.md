<!-- CURRENT-SPEC · module: books · the living contract (§XXIX Currency Rule) · never lags the code -->

# Books — CURRENT SPEC  (`@vida/core` `services/books`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-books ① S1 (LIF-117, #51). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createBooksService(deps)` — the ① backend service tier for the **reading Universe** over DB-4 `023_books`
(10 tables). The full design lives in `docs/features/books/` (aspect docs) + `docs/features/books/delivery/`
(interpretation · slice-map · seam-contract). Build state: **S1 of 10 shipped** (Works CRUD + reframe).

## Delivered surface (as of S1)

`createBooksService({ db, deviceId }) → BooksService`. Factory-object, hoisted closures, no `this.`. Deps grow
per slice (S2–S10 add spaces/backlinks/notes/sessions/sessionRegistry + optional deny-safe ports).

| Method | Leg | Contract |
|---|---|---|
| `createBook(input)` | BOO-01 | create a WORK; `status` default `want_to_read`; `progress` never settable (derived); `rating` 1–5; TOC-only ok (BK-17) |
| `updateBook(id, patch)` | BOO-01 | guard-exists → `BookNotFoundError`; patch non-derived/non-retired columns; re-read for faithful row |
| `softDeleteBook(id)` | BOO-01 | guard-exists → `BookNotFoundError`; sets `deleted_at` |
| `getBook(id)` | BOO-03 | `BookView` (work + `assets:[]` [S3] + `unifiedProgress:null` [S8]) \| `null` (not found/soft-deleted) |
| `listBooks(filter?)` | BOO-02 | soft-delete filtered; S1 `filter = { status? }` only |
| `getCapabilities(id)` | BOO-48 | `{ plannable: total_pages != null, readable: false }`; guard-exists |

**Types/errors:** `BooksServiceDeps`, `BooksService`, `BookView`, `BookFilter`, `BookCapabilities`,
`BookNotFoundError`, `BOOK_ENTITY_TYPE = 'book'`. Input Zod: `validators/books.ts` (`CreateBookSchema`,
`UpdateBookSchema`). Row→interface: `toBook` (single `_sync_status` union cast — no json columns).

## Persistence

`createRepository(db, books, { deviceId, softDelete: true, encryptedFields: [] })`. `encryptedFields:[]` = M1.0
dormant [E] seam (title/author/isbn/review/cover_url → M3/DB-5). No FK → app-layer guard-exists. `findWhere`
skips the soft-delete filter → `listBooks` adds `isNull(deleted_at)` explicitly.

## Composition seams (not yet wired — per slice-map)

S2 chapters (`sessions`/registry, notes, spaces) · S3 assets + `attachment?` port · S4 annotations (spaces/notes)
· S5 quote-embed (`preferences?`) · S6 reading sessions (`sessions` + `sessionRegistry` + `registerBooks()`) ·
S7 plans · S8 unified-progress/conflict · S9 Education/measurement · S10 integrations (`ai?`/`ingestion?`) +
`registerBooksJournal`. Deferred reach = deny-safe ports (doc+substrate grounded; see slice-map Deferred-by-design).

## `@vida/types` reconcile (S1, DB-11)

The `Book` interface was reshaped to the reframed table: dropped `format`/`current_page`/`genre`/`tags`;
`progress: number | null`; `total_pages: number | null`. `BOOK_FORMAT`/`BookFormatSchema` kept (P-6).
