<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A6 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in delivery/{slice-map,seam-contract}.md + the aspect docs
     + the shipped note_attachments schema + A1-A5. No-Guessing: every claim is [FACT: path:line]. -->
<!-- ground-truth docs referenced by bare filename below live at docs/features/notes-and-pages/ (+ delivery/) and docs/specs/features/mod-notes/ -->

# A6 — note_attachments CRUD  (MOD-notes ① · slice A6)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = the Entity Front Matter
(`delivery/{slice-map,seam-contract}.md`) + the aspect docs (NP-3, NP-9, structure-data:17) + the shipped
`note_attachments` schema (`schema/notes.ts:85-109`) + A1-A5. `current-*` are removed-① residue (not consulted);
§XXIX regenerates them at the A-track close.

## 1. Context & scope
A6 adds **plain CRUD over `note_attachments`** — the first BLOB surface — to the SAME `services/notes/service.ts`,
plus the `NewAttachment` input type. It authors no table (DB-4 shipped `note_attachments`).

**In scope (the frozen seam row tagged A6 — `seam-contract.md:29`, `slice-map.md:21`):**
- `NewAttachment` type (`z.infer` of `newAttachmentSchema`, `validators/note.ts` — single-homed in
  `services/notes/types.ts` like `EntityNoteSeed`; NOT a `@vida/types` interface).
- `addAttachment(pageId, file: NewAttachment): Promise<NoteAttachmentRow>` — **enforces the documented 25 MB
  per-attachment limit** (fail-loud, BR-A6-7) · `getAttachments(pageId): Promise<NoteAttachmentRow[]>` ·
  `removeAttachment(id): Promise<void>`.
- `AttachmentTooLargeError` (bespoke `extends Error`, `services/notes/types.ts`).

**Explicitly OUT (later slices / other concerns — do NOT build):**
- **No cascade on page delete.** `softDeletePage` → cascade to `note_attachments` is **A8** (N8/IR-13), not A6.
- summary (A7). A6 does not touch `_deps` (attachments are page-local; no registry/spaces/backlinks needed).

**Pattern to mirror (same file):** the A1 page repo + `live` closure — A6 adds a `noteAttachmentRepo` + `liveAttachments`
closure the same way `[FACT: services/notes/service.ts:44,48]`; `softDeletePage` for the soft-delete
`[FACT: service.ts:77-79]`; the A4 `entityNoteSeedSchema`/`z.infer` pattern for `NewAttachment`.

## 2. Business rules (invariants A6 must hold)
- **BR-A6-1 · `addAttachment` creates a `note_attachments` row (composes A1's repo pattern).** `noteAttachmentRepo.create({
  page_id: pageId, ...file })` where `file: NewAttachment` = the insertable business columns `filename` · `mime_type` ·
  `encrypted_blob` · `thumbnail_blob?` · `size_bytes` `[FACT: schema/notes.ts:85-101]`. Returns the Drizzle
  `NoteAttachmentRow` (`$inferSelect`, `:108`). `id`/timestamps/`_sync_*` are repository-generated. N1: create stamps
  `_sync_hash` via `hashContent`.
- **BR-A6-2 · `[E]` fields carry PLAINTEXT/raw bytes; the repository owns encryption (M1.0 pass-through).** `filename`
  + `encrypted_blob` + `thumbnail_blob` are `[E]`; `mime_type` + `size_bytes` are plaintext (P) `[FACT:
  security-model.md:479; business-rules.md:11 NP-3; baseline.md:39]` — the caller passes **raw** bytes exactly like a
  plaintext `title`; the repository encrypts `[E]` on write, and in M1.0 the `[E]` set is EMPTY → pass-through (raw
  stored) `[FACT: BR-DB6-3; repository.ts:123-125 empty-set short-circuit]`. The `encrypted_blob` name reflects the M3
  target, not a caller obligation.
- **BR-A6-3 · `getAttachments(pageId)` = live rows for the page (N7/IR-6).** `liveAttachments(eq(noteAttachments.page_id,
  pageId))` = `findWhere` + `isNull(deleted_at)` (verbatim predicate, `!` on `and()`), backed by `idx_attachments_page`
  `[FACT: schema/notes.ts:100; repository.ts:379-382]`. Returns `NoteAttachmentRow[]`.
- **BR-A6-4 · `removeAttachment(id)` = soft-delete by id (NP-9).** `noteAttachmentRepo.delete(id)` sets `deleted_at` +
  enqueues `operation:'update'` (softDelete:true), excluded from `getAttachments` thereafter `[FACT: business-rules.md:17
  NP-9; repository.ts:457-465]`. By `id` (not a business key — attachments have no natural UNIQUE).
- **BR-A6-5 · `NewAttachment` = the insertable subset of the DOCUMENTED `NoteAttachment` type, single-homed as a
  `z.infer` DTO.** `@vida/types` `NoteAttachment` (the documented type, `contract.md:18`) declares `filename` ·
  `mime_type` · `encrypted_blob: Uint8Array` · `thumbnail_blob: Uint8Array | null` · `size_bytes`
  `[FACT: @vida/types/note.ts:148-158]`; `NewAttachment` is that minus the managed `id`/`page_id`/`created_at`/`_sync_*`.
  `newAttachmentSchema` in `validators/note.ts` (extend, do not overwrite); `NewAttachment = z.infer<…>` in
  `services/notes/types.ts` — NOT re-declared as a `@vida/types` interface (the A4 `EntityNoteSeed` single-home rule)
  `[FACT: _index.md:88,106; types.ts:6 header; @vida/types/CLAUDE.md]`. Blob fields typed `z.instanceof(Uint8Array)` (a
  Node `Buffer` IS a `Uint8Array`; better-sqlite3 `mode:'buffer'` round-trips it). Defense-in-depth schema — not
  `.parse()`d in `addAttachment` (the internal-DTO pattern, mirrors `EntityNoteSeed`).
- **BR-A6-6 · N2 deviceId + empty-`[E]` repo config.** `noteAttachmentRepo = createRepository(db, noteAttachments,
  {deviceId, encryptedFields: [], softDelete: true})` `[FACT: mirrors spaces/service.ts:69]`. Returns Drizzle Rows
  (DB-11 reconcile not this entity's job — baseline C2).
- **BR-A6-7 · `addAttachment` enforces the 25 MB per-attachment limit — fail-loud (ADR-003:185).** The documentation
  states a **hard per-attachment rule** — *"Maximum file size: 25 MB per attachment"* — and defines the constant
  `MAX_ATTACHMENT_BYTES = 25 MiB` `[FACT: ADR-003:185; encryption.ts:124]`. Because Notes is local-first, the attachment
  is CREATED at `addAttachment` before it ever reaches the R2 sync pipeline — so the limit is enforced **at the creation
  entry point** (fail-loud), not deferred to a later R2 rejection: `if (file.size_bytes > MAX_ATTACHMENT_BYTES) throw new
  AttachmentTooLargeError(file.size_bytes)`. Validates the documented `size_bytes` field (the same field the R2
  upload-url flow carries, `ADR-003:195`). `AttachmentTooLargeError` is bespoke `extends Error` (the Notes convention,
  `JournalExistsError`/`UnregisteredEntityTypeError`).

## 3. Contract (the A6 surface ② will bind to)
```ts
// validators/note.ts (canonical Zod — EXTEND):
export const newAttachmentSchema = z.object({
  filename: z.string(),
  mime_type: z.string(),
  encrypted_blob: z.instanceof(Uint8Array),        // raw bytes (M1.0 pass-through; repo encrypts [E] at M3)
  thumbnail_blob: z.instanceof(Uint8Array).nullish(),
  size_bytes: z.number().int().nonnegative(),
})
// services/notes/types.ts — the ONE home for the type (mirror EntityNoteSeed):
export type NewAttachment = z.infer<typeof newAttachmentSchema>

export interface NotesService {                    // GROWS per slice; A6 appends these rows
  addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow>  // throws AttachmentTooLargeError (BR-A6-7)
  getAttachments(pageId: string): Promise<NoteAttachmentRow[]>
  removeAttachment(id: string): Promise<void>
}
export class AttachmentTooLargeError extends Error { constructor(public readonly sizeBytes: number) { … } }  // types.ts
```
- Imports: `noteAttachments, type NoteAttachmentRow` from `../../db/schema/notes`; `MAX_ATTACHMENT_BYTES` from
  `@vida/types` (barrel-exported, `index.ts:9`). `②` consumer: B2/B6 (note detail + gallery) render attachments;
  B2's page-actions add/remove `[FACT: slice-map.md:31,35]`.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A6 — note_attachments')` (reuse A1 `setup()`):**
   - **addAttachment creates + round-trips (live-DB smoke, N1):** `addAttachment(page.id, {filename:'a.png',
     mime_type:'image/png', encrypted_blob: new Uint8Array([1,2,3]), size_bytes:3})` → a `NoteAttachmentRow` with
     `page_id`/`filename`/`mime_type`/`size_bytes` correct, `id`+`_sync_hash` truthy, and the blob round-trips
     (re-read via `getAttachments`, `Buffer`/`Uint8Array` bytes equal).
   - **thumbnail optional:** an attachment without `thumbnail_blob` persists (`thumbnail_blob` null).
   - **size limit (BR-A6-7):** `addAttachment(page.id, {…, size_bytes: MAX_ATTACHMENT_BYTES + 1})` **rejects
     `AttachmentTooLargeError`** (instanceof + `.sizeBytes`); `size_bytes: MAX_ATTACHMENT_BYTES` (exactly at the limit)
     **succeeds** (boundary: `>` not `>=`).
   - **getAttachments** returns only the page's attachments (seed 2 on page A, 1 on page B → `getAttachments(A)` = 2).
   - **removeAttachment soft-deletes (N7/NP-9):** add → `removeAttachment(id)` → `getAttachments(page.id)` excludes it.
2. **Green bars:** `pnpm --filter @vida/core test` all green (A1-A5's 39 stay green) · root `typecheck` 0 · `eslint` 0.
3. **§XXIX currency:** deferred to the A-track close — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `validators/note.ts` — append `newAttachmentSchema` (z.object per §3) — EXTEND, do not overwrite.
2. `services/notes/types.ts` — import `entityNoteSeedSchema`→ add `newAttachmentSchema`; `export type NewAttachment =
   z.infer<typeof newAttachmentSchema>`; add `NoteAttachmentRow` to the `../../db/schema/notes` type import; add the
   `AttachmentTooLargeError` class (bespoke, mirror `JournalExistsError`); append the 3 interface rows.
3. `services/notes/service.ts` — import `noteAttachments` (value) from `../../db/schema/notes`, `MAX_ATTACHMENT_BYTES`
   from `@vida/types`, `AttachmentTooLargeError` from `./types`; after `entityTagRepo` add `noteAttachmentRepo =
   createRepository(db, noteAttachments, {deviceId, encryptedFields: [], softDelete: true})` + a `liveAttachments(pred)`
   closure; append the methods:
   ```ts
   async addAttachment(pageId, file) {
     // BR-A6-7 (ADR-003:185): fail-loud at the creation entry point on the 25 MB per-attachment limit.
     if (file.size_bytes > MAX_ATTACHMENT_BYTES) throw new AttachmentTooLargeError(file.size_bytes)
     return noteAttachmentRepo.create({ page_id: pageId, ...file })   // [E] fields raw (M1.0); repo encrypts at M3
   },
   getAttachments(pageId) {
     return liveAttachments(eq(noteAttachments.page_id, pageId))
   },
   async removeAttachment(id) {
     await noteAttachmentRepo.delete(id)                              // soft-delete (NP-9)
   },
   ```
4. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A6` cases.
5. Do NOT touch current-* (§XXIX). Do NOT add a size guard (R2/ADR-003 §4.3). Do NOT add cascade (A8).

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to escalate:
- 3 CRUD methods + signatures → BR-A6-1/3/4 (`seam-contract:29`·`slice-map:21`).
- `[E]` = {filename, encrypted_blob, thumbnail_blob}; P = {mime_type, size_bytes}; caller passes raw, repo encrypts
  (M1.0 empty-`[E]` pass-through) → BR-A6-2 (`security-model.md:479`·`NP-3`·`repository.ts:123-125`).
- soft-delete by id → BR-A6-4 (`NP-9`).
- `NewAttachment` = insertable subset of the documented `NoteAttachment`, single-homed `z.infer` (not `@vida/types`)
  → BR-A6-5 (`@vida/types/note.ts:148`·`_index.md:106`, the A4 precedent).
- **`addAttachment` enforces the 25 MB per-attachment limit, fail-loud (`AttachmentTooLargeError`)** → BR-A6-7
  (`ADR-003:185`·`MAX_ATTACHMENT_BYTES`). *(Corrects a prior draft that dismissed the size limit as "R2-only" — the
  25 MB is a documented HARD per-attachment rule; local-first means the creation entry point enforces it fail-loud.)*
- no cascade (A8) → §1 OUT.
