<!-- service/operation-flow.md — Track A · §5 lens 2 + the 3 backend-only nuances (persistence/schema,
     concurrency/txn, ZK). The full CRUD lifecycle + idempotence + transaction boundaries + data-flow.
     Cited to service.ts / repository.ts / drizzle.ts. Born 2026-08-22 (recovery). -->

# Operation flow — CRUD lifecycle, idempotence, transactions, persistence, ZK

Data-flow contract (every mutation): **validate → repository → encrypt-seam → return** (`docs/core/architecture/data-flow.md`).
`[FACT: CLAUDE.md "Pattern"]`

## Create (page)

1. `createPageSchema.parse(input)` — Zod (rejection, not sync throw — the method is `async`).
2. NP-6: if `entity_type != null` → `assertRegistered` (else `UnregisteredEntityTypeError`).
3. NP-2: if `type==='journal'` + `journal_date` → `getPageByJournalDate`; a live clash → `JournalExistsError`.
4. `pageRepo.create({...})` — repository stamps id (UUIDv7)/timestamps/sync-metadata, computes `_sync_hash`,
   co-transactionally enqueues `sync_queue` `operation:'create'`. `[FACT: service.ts:76-101]`

## Read

Every read is `findWhere(and(<predicate>, isNull(deleted_at))!)`. `findWhere` runs the predicate **verbatim**
(no auto-`notDeleted`), so each read appends `isNull(deleted_at)` explicitly; drizzle `and()` is `SQL|undefined`
→ the `!` non-null suffix (mirrors AR-6). `getPage`/`findById` and `getPageByJournalDate` return `… | null`.
`[FACT: service.ts:14,69-74,108-141,235-239]`

## Update

`updatePageSchema.parse(patch)` — `.strict()` whitelist (title/content/parent_id/is_favorite/is_archived/icon/
cover_image/summary_config/has_pomodoro/word_count). **Identity fields excluded** (`type`/`journal_date`/
`entity_*`/`deleted_at`) → journal identity is immutable via update. `[FACT: service.ts:112-116; types.ts:23-37]`

## Soft-delete + restore

`softDeletePage`/`removePageLink`/`removeAttachment` → `repo.delete()` sets `deleted_at` + enqueues
`operation:'update'` (soft-delete is a syncable mutation, NP-9). Restore path is the **page-link revive**:
`createPageLink` on a soft-deleted business-key row → `update {deleted_at:null}` (not a raw re-insert → no UNIQUE
collision). `[FACT: service.ts:118-120,144-164,241-243]`

## Idempotence paths (NP-5, NP-8)

- **`createPageLink`** — `findWhere` on `(source,target)` **without** `isNull` (to catch a soft-deleted row):
  live → return the row (no-op); soft-deleted → revive; absent → create. Retry-safe. `[FACT: service.ts:144-164]`
- **`ensureEntityNote`** — `findWhere` on `(type, entity_type, entity_id)` live; exists → return it (never a
  second note); absent → `createPage` with the deterministic `seedContent`. `[FACT: service.ts:196-214]`

## Backend nuance 1 — persistence & schema binding

Four repos, all `createRepository(db, <table>, { deviceId, encryptedFields: [], softDelete: true })`. Tables:
`pages`/`page_links`/`note_attachments` (`db/schema/notes.ts`) + `entity_tags` (`db/schema/foundation/spaces.ts`,
**read-only here** — AR-6 owns writes). Migrated by `ALL_MIGRATIONS` (`012_notes` among 001–032). `[FACT:
service.ts:20-21,55-60]`

## Backend nuance 2 — concurrency & transactions (DP-8)

`repo.create/update/delete` run through `db.transaction`. In the browser (②a) `getDb()` wraps `.transaction`
with a **non-reentrant async mutex (DP-8)** so two writes can't interleave `BEGIN…BEGIN` over the per-statement
worker RPC; reads bypass → concurrent. The serialization unit is the WHOLE transaction (IR-6). `[FACT:
apps/web/src/db/drizzle.ts:35-61; ../delivery/interpretation.md IR-6]`

## Backend nuance 3 — zero-knowledge / keyless-hash (NEED #1, IR-1)

Every repository WRITE computes `_sync_hash` via `hashContent()` — a **keyless** BLAKE2b that calls
`assertReady()` → requires `initVault()` (libsodium WASM) loaded, **independent of `[E]`**. M1.0 repos are
empty-`[E]` (`encryptRow` early-returns on the empty set) but the hash on write still runs → libsodium MUST be
loaded at boot. This is NEED #1 (the vault bug) and the reason S6 exists. `[FACT: ../delivery/interpretation.md
NEED #1; packages/core/src/db/repository.ts (computeSyncHash→hashContent); encryption/vault.ts assertReady]`
