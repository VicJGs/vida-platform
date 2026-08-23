<!-- service/contract.md — Track A · §5 lens 4. The backend's "UX" = the DX contract consumers feel:
     return shapes (Rows), input/validator schemas, typed-error taxonomy, [E] set, sync behavior, ZK.
     Cited to types.ts / index.ts / validators/note.ts. Born 2026-08-22 (recovery). -->

# Contract — the DX consumers feel

## Return shapes — Drizzle Rows (not DTOs)

The service returns raw Drizzle **Row** types, re-exported from `@vida/core`:
`PageRow` · `PageLinkRow` · `NoteAttachmentRow` (+ AR-6/AR-8 `EntityLinkRow`/`EntityTagRow` via the facades).
Consumers (② hooks) render Rows directly; no mapping layer. `[FACT: packages/core/src/index.ts:135-141;
../current-spec.md:20]`

## Input + validator schemas (`validators/note.ts`)

- `createPageSchema` — `journal_date` required **iff** `type==='journal'` (NP-2 refine). `CreatePageInput`
  derives from `pages` columns minus repository-managed (id/timestamps/sync). `[FACT: types.ts:19; ../current-spec.md:30-31]`
- `updatePageSchema` — `.strict()`; whitelist = the 10 updatable fields only. `UpdatePageInput` is **narrowed to
  match** the `.strict()` whitelist (type ≡ validator — a mismatch was a ① gate-2 blocker). `[FACT: types.ts:23-37;
  ../current-spec.md:32-33]`
- `EntityNoteSeed` (title/type/status/date, all optional) · `NewAttachment` (filename/mime_type/encrypted_blob
  `Buffer|Uint8Array`/thumbnail?/size_bytes). `[FACT: types.ts:41-55]`

## Typed-error taxonomy

`JournalExistsError(journalDate)` (NP-2) · `UnregisteredEntityTypeError(entityType)` (NP-6/SP2). Bespoke
`extends Error`. Validating methods are `async` → every validation failure is a **Promise rejection**, never a
sync throw — so `const { createPage } = svc; await createPage(...)` surfaces errors uniformly. `[FACT:
types.ts:108-120; ../current-business-rules.md:27-28]`

## `[E]` encryption set

**Empty at M1.0** (`encryptedFields: []`) — pass-through (BR-DB6-3). The `structure-data.md` `[E]` marks
(e.g. `content`) are the **M3/DB-5 target**, not active now. This does NOT remove the keyless `_sync_hash` /
libsodium boot NEED (contract-relevant: a consumer app that skips `initVault()` gets a write rejection, not a
silent pass). `[FACT: service.ts:55-56; ../current-business-rules.md:64,67-70]`

## Sync behavior

Every mutation co-transactionally enqueues `sync_queue` (`create`/`update`; soft-delete = `update`). Rows carry
the standard `_sync_*` metadata; `_sync_device_id` = the ②a device-id. No optimistic contract at the service
layer — the ② hooks are invalidate-and-reread (DP-6). `[FACT: service.ts:11-13; ../current-business-rules.md:24-26,39]`

## Barrel

`services/notes/index.ts` → `export * from './types'` + `'./service'`; `@vida/core/index.ts` re-exports the
service + the three Row types. `[FACT: packages/core/src/index.ts:135-141]`
