<!-- Entity Delivery Flow (v1) · S1 PLAN (gate-1 SPEC) · mod-books #51 · Works CRUD + reframe -->

# PLAN — S1 · Works CRUD + reframe (mod-books ①, LIF-117)

**Slice:** S1 of 10. **Legs:** BOO-01 (Works CRUD), BOO-02 (listBooks query half), BOO-03 (getBook aggregate),
BOO-48 (capability-gating — plannable half; readable composes S3). **Table:** `books` (reshaped).

## §1. Scope — what S1 builds

`createBooksService` skeleton (factory-object, no `this.`, async methods) + the `books` table CRUD + the reframe.
S1 is the module's first slice: it stands up `services/books/{index,types,service}.ts` + `validators/books.ts`
and reconciles the stale `@vida/types` `Book` interface. Later slices append to the same surface.

**Methods (S1):**

- `createBook(input): Promise<Book>` — validate; `progress` NOT settable (derived, BR-BK-2); status default
  `want_to_read`; rating 1–5 if present. Faithful create-echo (backfill notNull-default cols).
- `updateBook(id, patch): Promise<Book>` — guard exists → `BookNotFoundError`; `progress`/`current_page`/`format`/
  `genre`/`tags` NOT in the schema (retired/derived). Soft-delete-aware (repo rejects deleted).
- `softDeleteBook(id): Promise<void>` — soft delete (`deleted_at`).
- `getBook(id): Promise<BookView | null>` — S1 returns `{ book, assets: [], unifiedProgress: null }`; the
  `assets` fill at S3, `unifiedProgress` at S8 (deny-safe empty/null = not-yet-composed, honest — the
  incremental-slice aggregate, the knowledge getObject precedent). Signature stable.
- `listBooks(filter?): Promise<Book[]>` — S1 `BookFilter = { status? }` ONLY (soft-delete filtered). The
  `tags`/`subject`/`format-owned` filter keys are NOT in the S1 type — the interface GROWS when S3/S9 add them
  (never advertise an unimplemented filter → no silent-wrong-result; the g1 fix).
- `getCapabilities(id): Promise<{ plannable: boolean; readable: boolean }>` — BOO-48. `plannable` = S1-owned
  (`total_pages != null` — a TOC-only/no-copy book is plannable, BK-17); `readable` composes S3 (≥1 asset) → S1
  returns `readable: false` with the asset-count seam documented (fills at S3). _(A no-asset book is correctly
  not-readable today; S3 makes it true when a copy is added — not a lie, the real M1 state.)_

## §2. Business rules (this slice must encode)

- **BR-BK-2 (reframe)** — `books.progress` nullable, NEVER settable via create/update (derived-on-read);
  `current_page`/`format`/`genre`/`tags` RETIRED (absent from schema + input). `[FACT: schema/books.ts:51-62;
db-4-books/_index.md:45-48]`
- **FACT CHECKs** — `status` ∈ {want_to_read,reading,completed,dropped}; `rating` 1–5. Validated in Zod (the
  DB CHECK is the floor). `[FACT: business-rules.md:92; schema/books.ts:51,56]`
- **BK-17** — a no-copy/TOC-only book is first-class: `createBook` needs no asset; `plannable` true on
  `total_pages`. `[FACT: business-rules.md:85-87]`
- **BK-1 / M1.0** — [E] fields (title/author/isbn/review/cover_url) use `encryptedFields:[]` M1.0 pass-through
  (dormant seam → M3). `[FACT: schema/books.ts:35; m10-repos-use-empty-encryptedfields-seam]`
- **No FK** — integrity via app-layer guard-exists (`BookNotFoundError`), the knowledge precedent. `[FACT: BR-BK-6]`

## §3. @vida/types reconcile (DB-11, done here — the habits/finance-S1 precedent)

The `Book` interface (`types/src/learning.ts:227`) is STALE (carries retired `format`/`current_page`/`genre`/
`tags`, non-null `progress`). S1 reshapes it to mirror `BookRow`: drop `format`/`current_page`/`genre`/`tags`;
`progress: number | null`; keep `total_pages: number | null` (nullable per schema). `BOOK_FORMAT`/`BookFormatSchema`
stay (P-6 — other consumers; not removed now). `[FACT: db-4-books/_index.md:157-159 (P-6); habits @vida/types reconcile precedent]`

## §4. Acceptance

- [ ] `createBook`/`updateBook`/`softDeleteBook`/`getBook`/`listBooks`/`getCapabilities` typed + implemented.
- [ ] `progress` not accepted by create/update; no retired column referenced.
- [ ] `status`/`rating` validated (Zod); invalid → typed rejection (async).
- [ ] `Book` interface reconciled to `BookRow`; `@vida/core` + `@vida/types` build.
- [ ] `validators/books.ts` created (Create/Update schemas); enum schemas reused from `learning.ts`.
- [ ] ENTITY_TYPE `book` NOT re-registered (pre-seeded by DB-4 — inject the shared registry). `[FACT: db-4-books/_index.md:116]`
- [ ] tsc 0 (11/11); eslint 0.
- [ ] **Live-store Verification Gate**: create→get→update→list→soft-delete on real SQLite; reframe probe
      (progress stays null through create/update); status/rating rejection; soft-deleted excluded from list.
- [ ] code-review SHIP; §XXIX currency (`docs/modules/books/current-*` born, BR-BK-S1-\*).

## §5. Implementation order (types → logic → errors)

0. **g1 guard** — grep consumers of `Book.format`/`.current_page`/`.genre`/`.tags` BEFORE the interface reshape
   (breaking-change check; if any exist, reconcile them or flag STRUCTURAL). No-Guessing: verify net-new.
1. `validators/books.ts` — `CreateBookSchema` (title req; author/isbn/review/cover_url/start_date/end_date opt;
   status opt default; total_pages opt; rating opt 1–5; **no progress**), `UpdateBookSchema` (partial).
2. `@vida/types/learning.ts` — reshape `Book` interface.
3. `services/books/types.ts` — `BooksServiceDeps` (S1 subset: db, deviceId; later deps append), `BooksService`
   (S1 methods), `BookView`, `BookFilter`, `BookNotFoundError`, `BOOK_ENTITY_TYPE='book'`.
4. `services/books/service.ts` — `createBooksService`; `booksRepo = createRepository(db, books, {deviceId,
softDelete:true, encryptedFields:[]})`; `toBook` Row→interface; the 6 closures.
5. `services/books/index.ts` — barrel.
6. Wire into the `@vida/core` barrel if modules are exported there (check `services/index.ts`).

## §6. Out of scope (S1)

Assets/positions (S3) · annotations (S4) · sessions (S6) · plans (S7) · unified-progress derivation (S8) ·
tags/subject filters + measurement source (S9). getBook's `assets`/`unifiedProgress` = deny-safe empty/null.
