<!-- Entity Delivery Flow (v1) · per-slice SERVICE track · mod-books #51 (LIF-117) · S3 -->
<!-- PLAN (gate 1 = the SPEC). Per-slice cadence: g1 /critique → build → tsc → live-store Verification Gate →
     code-review → /critique SHIP → §XXIX currency. No per-slice Victor approval (Approval 1 covered the plan). -->

# PLAN — S3: Assets + positions + R2 port + mapping absent-state  (BOO-09/10/11/12/44)

## §1 Context (ground truth)

S1 (`df22a8d`) shipped Works CRUD + reframe; S2 (`547c889`) shipped Chapters/TOC + the deny-safe `ingestion?`
lookup port. The `book_assets` table already exists in the DB-4 schema (`schema/books.ts:88-100`): `book_id`
(no FK), `format` (enumText `BOOK_ASSET_FORMAT`, CHECK), `file_ref` ([E], nullable — physical has none),
`native_position` (plaintext, BK-1), `deleted_at` (HAS soft-delete). No `BookAsset` `@vida/types` interface
exists yet (`BookView.assets` is typed the raw `BookAssetRow` — S2 carry-forward N1). No attachment/R2 substrate
exists (`grep foundation/ = none`) — S3 defines the `AttachmentPort` seam deny-safe.

**Legs (slice-map.md:17):** BOO-09 (`addAsset` + R2 upload), BOO-10 (`updatePosition` per-asset SSOT), BOO-11
(`removeAsset`, work-level annotations survive), BOO-12 (`getMappedPosition` → `NotSyncedState`, the flagship
cross-format DERIVATION), BOO-44 (file decrypt/download error — `AssetFileError`).

**Folds (carry-forwards, slice-map.md:68-71):** N1 — replace `BookView.assets: BookAssetRow[]` with a proper
`BookAsset` `@vida/types` interface. B1 — surface chapters on `BookView` now that it expands (closes the S2
chapter-READ carry-forward, `current-business-rules.md:62-67`).

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S3-*)

- **BR-BK-S3-1 (asset = per-format copy, BK-2/BOO-09)** — `addAsset(bookId, {format, file?})` creates a
  `book_assets` row (0..n per book); `format` ∈ BOOK_ASSET_FORMAT (zod + DB CHECK). Guards the book exists
  (`BookNotFoundError`). A book needs no asset (BK-17) — assets are additive.
- **BR-BK-S3-2 (R2 upload — deny-safe on ABSENCE, fail-loud on FAILURE, BOO-09/44)** — the doc separates two
  cases and so does the service:
  - **capability absent** (no `attachment` port) **or no file** ⇒ `file: {status:'attachment-unavailable'}`,
    the row's `file_ref` stays `null` — the honest "asset-has-no-file" state (`business-rules.md:97-98` "a book
    with no assets… no Reader affordance"; terminal `:112` "asset has no file → add a copy"). The asset IS
    created (BK-17 sparse-graceful, `:85-87`). Deny-safe, the S2 `lookupBook` precedent (slice-map Deferred row
    "no attachment dep").
  - **present port + success** ⇒ `file: {status:'stored', fileRef}`, `file_ref` set.
  - **present port + `upload()` rejects** (a real R2 error) ⇒ **`AssetFileError`, fail-loud** — the asset is NOT
    persisted (a broken file "never renders as an empty book"). `[FACT: business-rules.md:127 "File decrypt/R2
    errors are typed"; :125 integration failures surface typed errors]`. At M1 the port is always absent, so this
    path is M2-reached but built + mock-tested now (zero-signature swap).
- **BR-BK-S3-3 (per-asset position SSOT, BOO-10)** — each asset owns exactly ONE `native_position` (page /
  epub location / audio timestamp / manual for physical·braille). `updatePosition(assetId, nativePosition)`
  writes only that column, re-reads, returns the `BookAsset`. Guards exists (`BookAssetNotFoundError`).
- **BR-BK-S3-4 (asset removal preserves work-anchored annotations, BOO-11)** — `removeAsset(id)` soft-deletes
  the asset (`book_assets` HAS `deleted_at`, `schema/books.ts:97`). `[FACT: business-rules.md:99-100 "Deleting
  an asset never deletes work-level annotations; annotations made in a deleted asset's native format remain…
  flagged native"]` — survival is **structural** (no-FK schema: bookmarks/quotes keyed `book_id`, highlights'
  `asset_id` is nullable + no FK, so no cascade). Annotations are built at S4 → the **survival test lands at S4**
  (nothing to delete-test at S3); S3 proves removal + drop-from-`getBook().assets` + the book still resolves.
  Guards exists (`BookAssetNotFoundError`).
- **BR-BK-S3-5 (cross-format mapping NEVER guessed, BK-4/BOO-12)** — `getMappedPosition(assetId,
  targetAssetId)` returns the typed `MappedPosition`: `{status:'synced', position, sourceAssetId}` **only** when
  a real mapping exists, else `{status:'not-synced', nativePosition}` (pending|failed|unavailable collapsed —
  the frozen seam type). The mapping algorithm (transcription + TOC-anchor matching) is a build-phase design
  pass (`structure-data.md:21`; `rerun §5:153`) — **at M1 it is unbuilt, so the result is ALWAYS `not-synced`**,
  carrying the **target** asset's own `native_position` as the honest fallback. `[FACT: business-rules.md:28-30
  (BK-5) "under an unsynced mapping they surface at native position"; terminal :113 "'not synced yet' + native
  position"]` — the native position in the format being viewed is the target's. Both assets must exist and belong
  to the **same book** (a cross-work map is nonsensical) → `BookAssetNotFoundError`.
- **BR-BK-S3-6 (file error is typed + fail-loud, BOO-44)** — `AssetFileError` is the typed R2/decrypt error.
  `[FACT: business-rules.md:127 "File decrypt/R2 errors are typed; a broken file never renders as an empty book"]`.
  **Two throw sites, both grounded:** (a) S3 — `addAsset` on a present-port `upload()` failure (an R2 *write*
  error, BR-BK-S3-2); (b) S6 — `openReader` decrypt/download (terminal `:112` "decrypt/render/playback error →
  typed, never silent"). The class is homed + exercised in S3 (not a phantom); the decrypt throw site lands at S6.
- **BR-BK-S3-7 (N1 fold — BookAsset interface)** — `BookAsset` is a proper `@vida/types` interface mirroring
  the reshaped row (DB-11 reconcile, the Book/BookChapter precedent); `BookView.assets: BookAsset[]`.
- **BR-BK-S3-8 (B1 fold — chapter READ path)** — `getBook` now returns `chapters: BookChapter[]` (ordered by
  `chapter_number`), closing the S2 chapter-READ carry-forward; `BookView` = work + assets + chapters + progress.

## §3 Deferred (homed, not built here)

- R2 real reach (encrypt/store/download) → `attachment?` port, M2 (ADR-003). `AttachmentPort` defined here.
- Cross-format mapping algorithm → build-phase design pass; S3 ships the honest `not-synced` absent-state.
- `AssetFileError` decrypt throw site → S6 (`openReader`). Blob GC on removeAsset → ADR-003 R2 lifecycle, M2.
- Unified progress invalidation on a position write → S8 is a React-Query DERIVATION (no stored counter to bust).

## §4 Acceptance (the live-store Verification Gate maps 1:1)

1. `addAsset` creates a row; no port/no file ⇒ `{file:'attachment-unavailable'}`, `file_ref` null, asset created.
2. `addAsset` present (mock) port + file + success ⇒ `{file:'stored', fileRef}`, `file_ref` persisted.
2b. `addAsset` present (mock) port whose `upload()` rejects ⇒ **`AssetFileError`**, and **no asset row persisted**
   (fail-loud, BR-BK-S3-2/`:127`).
3. `addAsset` guards the book exists (`BookNotFoundError`); invalid `format` rejected (zod).
4. `updatePosition` sets `native_position` (SSOT), re-reads faithfully; guards exists (`BookAssetNotFoundError`).
5. `removeAsset` soft-deletes; the asset drops from `getBook().assets`; the book still resolves; guards exists.
   *(Annotation-survival is structural/no-FK — its test lands at S4 when annotations exist, BR-BK-S3-4.)*
6. `getMappedPosition` across two assets of one book ⇒ `{status:'not-synced', nativePosition: <target native>}`
   (M1 mapping unbuilt, fail-loud — never `synced`); guards both exist + same-book (`BookAssetNotFoundError`).
7. N1: `getBook().assets` is `BookAsset[]` (typed interface, `_sync_status` narrowed). B1: `getBook().chapters`
   returns the TOC ordered by `chapter_number`.
8. `getCapabilities.readable` is true once ≥1 **live** asset exists (soft-delete-filtered count; removing the last
   copy flips it back to false — `business-rules.md:97-98` "no assets → no Reader affordance").

tsc 0 · eslint 0 · full `@vida/core` suite green.

## §5 Implementation prompt (type-first; factory-object; no `this.`)

1. **`@vida/types/learning.ts`** — add `BookAsset extends SyncableEntity` mirroring the row: `book_id: Id`,
   `format: BookAssetFormat`, `file_ref: string | null` (@encrypted), `native_position: string | null`,
   `deleted_at: Timestamp | null`. (N1.)
2. **`validators/books.ts`** — `AddAssetSchema` (`format` via `BookAssetFormatSchema` from `./learning`;
   `native_position` optional nullable) + `UpdatePositionSchema` (`native_position` non-empty string).
3. **`services/books/types.ts`** — service-layer types (NOT @vida/types, the `LookupResult` precedent):
   `FileBlob` (`{ bytes: Uint8Array; mimeType?: string; filename?: string }`), `AttachmentRef`
   (`stored|attachment-unavailable`), `AttachmentPort` (`upload(input): Promise<{fileRef}>`), `MappedPosition`
   (`synced|not-synced`). Extend `BooksServiceDeps` with `attachment?: AttachmentPort`. Extend `BookView` with
   `assets: BookAsset[]` + `chapters: BookChapter[]`. New errors: `BookAssetNotFoundError`, `AssetFileError`
   (homed; thrown at S6). Append the 4 methods to `BooksService`.
4. **`services/books/service.ts`** — `assetsRepo = createRepository(db, bookAssets, {deviceId, softDelete:true,
   encryptedFields:[]})`; `toAsset` mapper. Implement `addAsset` (absent port/no file → create row file_ref null;
   present port + file → `upload()`, success → store ref, **reject → `AssetFileError`, create nothing**),
   `updatePosition` (guard → update native_position → re-read), `removeAsset` (guard → soft-delete),
   `getMappedPosition` (guard both + same-book → always `not-synced`, target native_position, at M1). Update
   `getBook` to fill `assets` (soft-delete-filtered) + `chapters` (sorted). Update `getCapabilities.readable` =
   **live** asset count (`and(isNull(deleted_at), eq(book_id,id))`) `> 0`. Export the 4 methods.
5. **Tests** — append an S3 `describe` to `__tests__/service.test.ts` with a `mockAttachment` port (mirrors
   `mockIngestion`). 8+ cases per §4.
6. **Currency** — promote BR-BK-S3-1..8 to `docs/modules/books/current-business-rules.md`; refresh
   `current-spec.md`; update the slice-map gate ledger (S3 row) + the N1/B1 carry-forwards as CLOSED.

## §6 g1 resolution (all 4 critique points grounded in the aspect docs — Victor: "ground them in the documentation")

1. **`addAsset` present-port failure** — RESOLVED by `business-rules.md:127` ("File decrypt/R2 **errors are
   typed**; a broken file never renders as an empty book") + `:125`. The doc separates capability-absence
   (deny-safe `attachment-unavailable`) from a real R2 failure (**fail-loud `AssetFileError`**). BR-BK-S3-2
   rewritten to both; acceptance 2b added.
2. **Acceptance #5 untestable at S3** — RESOLVED by `business-rules.md:99-100` (annotation survival is
   structural/no-FK) + the slice-map (annotations = S4). Survival test homed to S4; S3 proves removal only.
3. **BOO-44 split** — RESOLVED, and *better than the critique's lean*: `:127` gives `AssetFileError` a real S3
   throw site (the `addAsset` R2-write failure), so it is **fully homed + exercised in S3** (not a phantom); the
   decrypt throw site is an additional S6 site (terminal `:112`). The gate ledger records BOO-44 as built in S3.
4. **Under-specified reads** — RESOLVED: `readable` = **live** asset count (`business-rules.md:97-98`); the
   mapping fallback carries the **target** asset's `native_position` (BK-5 `:28-30` + terminal `:113`).

No open points remain for Victor — every resolution cites the corpus; none is a build-time choice. Cleared to build.
