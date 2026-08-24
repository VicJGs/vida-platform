<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice A6. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + shape is code-verified (No-Guessing). Pairs with
     the approved spec a6-note-attachments.md (§2 rules, §4 acceptance). -->

# IMPLEMENTATION-PLAN — A6 note_attachments CRUD

**Home:** `services/notes/{types,service}.ts` + `validators/note.ts` + tests (all `@vida/core`). No new file.
**Branch:** `mod-notes-rebuild`. **Gate to clear:** ░Verification Gate░ (spec §4).

## Verified import/shape surface (confirmed on disk)
- Schema: `noteAttachments` (table) · `NoteAttachmentRow` (:108) — from `../../db/schema/notes`; columns `page_id`
  (notNull) · `filename`[E] · `mime_type` · `encrypted_blob` (blob buffer notNull [E]) · `thumbnail_blob` (blob buffer
  nullable [E]) · `size_bytes` (int notNull) · `deleted_at` · `idx_attachments_page` `[FACT: schema/notes.ts:85-108]`.
- `noteAttachmentRepo.create({page_id, ...file})` = a valid `CreateInput` (`Omit<Insert, managed>`; `page_id`+the 5
  business cols required/optional per the schema). Empty-`[E]` → `encryptRow` passes the Buffer straight through
  `[FACT: repository.ts:118-133 (empty set → {...row}); blob({mode:'buffer'}) accepts Buffer/Uint8Array]`.
- `validators/note.ts` — append `newAttachmentSchema` after `entityNoteSeedSchema` (`z` imported; EXTEND, do not overwrite).
- `services/notes/types.ts` — mirror the `EntityNoteSeed` single-home (`z.infer` alias; NOT `@vida/types`).
- `service.ts` already imports `and, eq, isNull, type SQL` (:16), `createRepository`, and has `live`/`livePageLinks`/
  `liveEntityTags` closures — `liveAttachments` is the same shape. Repo config mirrors the others (empty-`[E]`, softDelete).

## Build step 1 — `validators/note.ts` (EXTEND)
Append after `entityNoteSeedSchema`:
```ts
/** A6 attachment input. `[E]` fields carry RAW bytes (M1.0 pass-through; repo encrypts at M3). Buffer IS a Uint8Array. */
export const newAttachmentSchema = z.object({
  filename: z.string(),
  mime_type: z.string(),
  encrypted_blob: z.instanceof(Uint8Array),
  thumbnail_blob: z.instanceof(Uint8Array).nullish(),
  size_bytes: z.number().int().nonnegative(),
})
```

## Build step 2 — `services/notes/types.ts`
1. Extend the validator import: `import { createPageSchema, updatePageSchema, entityNoteSeedSchema,
   newAttachmentSchema } from '../../validators/note'`.
2. Extend the schema-row import: `import type { PageRow, PageLinkRow, NoteAttachmentRow } from '../../db/schema/notes'`.
3. Add the type alias (beside `EntityNoteSeed`): `export type NewAttachment = z.infer<typeof newAttachmentSchema>`.
4. Append the interface rows (after the A5 block):
   ```ts
     // --- attachments (A6) ------------------------------------------------------
     addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow> // throws AttachmentTooLargeError
     getAttachments(pageId: string): Promise<NoteAttachmentRow[]>
     removeAttachment(id: string): Promise<void>
   ```
5. Add the typed error (after `UnregisteredEntityTypeError`, mirror the bespoke shape):
   ```ts
   /** ADR-003:185 — attachment exceeds the 25 MB per-attachment limit (MAX_ATTACHMENT_BYTES). */
   export class AttachmentTooLargeError extends Error {
     constructor(public readonly sizeBytes: number) {
       super(`Attachment exceeds the ${MAX_ATTACHMENT_BYTES}-byte limit: ${sizeBytes}`)
       this.name = 'AttachmentTooLargeError'
     }
   }
   ```
   (import `MAX_ATTACHMENT_BYTES` from `@vida/types` at the top of `types.ts`.)

## Build step 3 — `services/notes/service.ts`
1. Extend the schema import: `import { pages, pageLinks, noteAttachments, type PageRow, type PageLinkRow,
   type NoteAttachmentRow } from '../../db/schema/notes'`. Add `MAX_ATTACHMENT_BYTES` to the existing `@vida/types`
   import (currently `import type { PageType } from '@vida/types'` → `import { type PageType, MAX_ATTACHMENT_BYTES }
   from '@vida/types'` — it's a runtime const, so a value import). Add `AttachmentTooLargeError` to the `./types` import.
2. After `entityTagRepo` add the repo + live closure:
   ```ts
   const noteAttachmentRepo = createRepository(db, noteAttachments, { deviceId, encryptedFields: [], softDelete: true })
   const liveAttachments = (pred: SQL): Promise<NoteAttachmentRow[]> =>
     noteAttachmentRepo.findWhere(and(pred, isNull(noteAttachments.deleted_at))!)
   ```
3. Append the methods to the returned object literal (after the A5 `getBacklinks`):
   ```ts
   // --- attachments (A6 · seam-contract:29) ---------------------------------
   async addAttachment(pageId, file) {
     // BR-A6-7 (ADR-003:185): fail-loud at the creation entry point on the 25 MB per-attachment limit.
     if (file.size_bytes > MAX_ATTACHMENT_BYTES) throw new AttachmentTooLargeError(file.size_bytes)
     // BR-A6-2: [E] fields (filename/encrypted_blob/thumbnail_blob) carry RAW bytes; the repo encrypts at M3.
     return noteAttachmentRepo.create({ page_id: pageId, ...file })
   },
   getAttachments(pageId) {
     return liveAttachments(eq(noteAttachments.page_id, pageId))
   },
   async removeAttachment(id) {
     await noteAttachmentRepo.delete(id) // soft-delete (NP-9) → enqueues operation:'update'
   },
   ```
Note: `newAttachmentSchema` is defined for the type + defense-in-depth but is NOT `.parse()`d in `addAttachment`
(the internal-DTO pattern, mirrors `ensureEntityNote`/`EntityNoteSeed`).

## Build step 4 — `services/notes/__tests__/notes-service.test.ts` (append)
`describe('A6 — note_attachments')`, reuse `setup()`. Cases (§4):
1. **addAttachment creates + blob round-trips (live-DB smoke, N1):** create a page P; `addAttachment(P.id, {filename:
   'a.png', mime_type:'image/png', encrypted_blob: new Uint8Array([1,2,3]), size_bytes: 3})` → row with `page_id===P.id`,
   `filename`/`mime_type`/`size_bytes` correct, `id`+`_sync_hash` truthy. Re-read via `getAttachments(P.id)` and
   **byte-compare**: `expect([...(fetched.encrypted_blob as Uint8Array)]).toEqual([1, 2, 3])` (spread → `number[]`,
   since a `Uint8Array` write reads back as a `Buffer` — byte-equal but NOT `===`, so compare via spread, not `toEqual`
   on the raw values).
2. **thumbnail optional:** an attachment with no `thumbnail_blob` persists (`fetched.thumbnail_blob` null).
3. **size limit (BR-A6-7):** `addAttachment(P.id, {…, size_bytes: MAX_ATTACHMENT_BYTES + 1})` rejects
   `AttachmentTooLargeError` (`instanceof` + `.sizeBytes === MAX_ATTACHMENT_BYTES + 1`); at exactly
   `size_bytes: MAX_ATTACHMENT_BYTES` it **succeeds** (boundary `>`, not `>=`). Import `MAX_ATTACHMENT_BYTES`/
   `AttachmentTooLargeError` in the test. (Use a small `encrypted_blob` — the guard reads `size_bytes`, not blob length.)
4. **getAttachments page-scoped:** 2 attachments on page A + 1 on page B → `getAttachments(A.id)` length 2.
5. **removeAttachment soft-deletes (N7/NP-9):** add → `removeAttachment(row.id)` → `getAttachments(P.id)` excludes it.

## Build step 5 — currency
Do NOT touch `current-*` (§XXIX). Do NOT add cascade (A8).

## Done = spec §4 green
`pnpm --filter @vida/core test` green (A1-A5's 39 stay green) · root `pnpm typecheck` 0 · `eslint` 0. All within
`@vida/core`. Then A6's ░Verification Gate░ (post-impl critique). **Run test ALONE**, not concurrent with typecheck.

## Deviation note
Any change to a landed seam signature → §XXVIII. Record any divergence in Route History.
