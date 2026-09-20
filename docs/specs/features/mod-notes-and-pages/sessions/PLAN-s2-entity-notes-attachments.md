# Spec: feature:mod-notes-and-pages — S2 Entity notes + attachments

Status: draft
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-notes-and-pages (S2).
Gate: §XXVI gate-1 = THIS spec. Authority: backend-intent/parts/notes-and-pages.md (NOT-11/12/29/30/31).
Slice contract: docs/features/notes-and-pages/delivery/{slice-map,seam-contract,interpretation}.md (S2).
Builds ON S1 (shipped `ef8c1ed`): reuses `pageRepo`, `createPage`, `getPagesForEntity`.

## 1. Identity
S2 adds the **entity-note lifecycle** + **attachments** to the `NotesService`.
- **What it is:** `ensureEntityNote` (idempotent auto-exist `*_note` with a deterministic client-side seed, NP-8/ZK-1)
  + `addAttachment`/`getAttachments`/`removeAttachment` over the `note_attachments` table.
- **What it is NOT:** the eager-trigger WIRING (owning modules call `ensureEntityNote` — NOT-13, not here); `[E]`
  blob encryption (M3/DB-5 — M1.0 pass-through); page-links (S3); entity-link/tag facade (S4).
- **Rows:** NOT-11 · 12 · 29 · 30 · 31.

## 2. Business Rules
- **BR-S2-1 (NP-8 idempotent auto-exist):** `ensureEntityNote(pageType, entityType, entityId, seed)` returns the EXISTING
  non-deleted `*_note` for `(pageType, entityType, entityId)` if present (via S1 `getPagesForEntity` filtered by `type`),
  else creates one seeded. Second call with same args → same row (no duplicate). [FACT: notes-and-pages.md:25 (NOT-11); mod-notes/_index.md:46]
- **BR-S2-2 (NP-8/ZK-1 seed determinism — SCOPED TO `content`):** the created page's `content` is a PURE function of
  `seed` (stable field order, no `Date.now()`/random, no server call, no plaintext egress). Same `seed` → identical
  `content` string. The row's `id`/`created_at`/`updated_at` are repo-generated and NON-deterministic BY DESIGN — the
  invariant is on the seed VALUE only. [FACT: notes-and-pages.md:26 (NOT-12); mod-notes/_index.md:107; repository.ts:327,333]
- **BR-S2-3 (seed reads parent LOCAL fields):** `seed` carries the parent entity's own local fields (title/type/status/
  dates); the seed generator reads only these — no cross-module table access. [FACT: notes-and-pages.md:26 (NOT-12)]
- **BR-S2-4 (registry on create):** `ensureEntityNote` creates via S1 `createPage`, so `entity_type` is registry-validated
  (BR-S1-3) → `UnregisteredEntityTypeError` on an unregistered type. [FACT: reuse S1; NOT-20]
- **BR-S2-5 (attachments own the table):** `addAttachment(pageId, file)` inserts a `note_attachments` row; `filename`/
  `encrypted_blob`/`thumbnail_blob` are `[E]` (M1.0 pass-through, BR-S1-11). `encrypted_blob` NOT NULL, `thumbnail_blob`
  nullable. [FACT: schema/notes.ts:91-107 (NOT-29)]
- **BR-S2-6 (attachment reads filter soft-delete):** `getAttachments(pageId)` → `findWhere(and(eq(page_id), isNull(deleted_at)))`
  (the findWhere gotcha, BR-S1-7). [FACT: schema/notes.ts:106; NOT-30]
- **BR-S2-7 (soft-delete, NP-9):** `removeAttachment(id)` → `attachRepo.delete(id)` (soft). [FACT: NOT-31; repository.ts:206]
- **BR-S2-8 (async rejection · factory shape):** validating methods async; helpers hoisted, no `this.` (BR-S1-5/10 carry over).

**DECISION D-S2-1 (seed `content` format).** `seedContent(seed)` produces a **minimal deterministic `EditorDocument`
JSON string** (a heading node = `seed.title`, a paragraph = the remaining fields) — `content` is TipTap JSON (NP-4), so a
valid minimal doc is forward-compatible + still just opaque TEXT to M1.0. **Determinism (R1):** the leading fields render in
a FIXED order (title → type → status), then any remaining `[k]` keys render in `Object.keys(seed).sort()` order (NOT insertion
order, which isn't guaranteed across callers); nullish skipped. `JSON.stringify` over this stable structure = byte-identical for
equal seeds. [INTERP: content=TipTap JSON (schema/notes.ts:49) + @vida/types EditorDocument]. Plain-string alt rejected (content
must render as an editor doc).

**DECISION D-S2-2 (validator depth).** Extend `validators/note.ts` (do NOT overwrite — mod-notes/_index.md:88) with ONLY
`newAttachmentSchema` (filename non-empty, mime_type non-empty, size_bytes nonneg int, `encrypted_blob` `z.instanceof(Uint8Array)`,
`thumbnail_blob` optional) — defense-in-depth for `addAttachment`. **NO `entityNoteSeedSchema` (R2):** the seed is caller-internal
parent-field data, the authority (`notes-and-pages.md`) mandates no seed validator, and an unused schema is dead code — `EntityNoteSeed`
stays a plain TS type. [FACT: notes-and-pages.md NOT-11/12 name no seed validator]

## 3. Contract (appended to `NotesService`)
```ts
ensureEntityNote(pageType: PageType, entityType: string, entityId: string, seed: EntityNoteSeed): Promise<PageRow> // NOT-11/12
addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow>  // NOT-29
getAttachments(pageId: string): Promise<NoteAttachmentRow[]>                    // NOT-30
removeAttachment(id: string): Promise<void>                                     // NOT-31
```
Net-new types (in `services/notes/types.ts`, zod-free per @vida/types/CLAUDE.md):
```ts
interface EntityNoteSeed { title?: string; type?: string; status?: string; [k: string]: string | number | boolean | null | undefined }
interface NewAttachment { filename: string; mimeType: string; encryptedBlob: Uint8Array; thumbnailBlob?: Uint8Array; sizeBytes: number }
```
Returns `NoteAttachmentRow` (`typeof noteAttachments.$inferSelect` [FACT: schema/notes.ts:114]) / `PageRow`.
No net-new error class (reuses `UnregisteredEntityTypeError` via S1 createPage).

## 4. Acceptance
- [ ] `NotesService` gains the 4 S2 methods; `EntityNoteSeed`/`NewAttachment` in `types.ts`; barrel + interface updated.
- [ ] `validators/note.ts` EXTENDED (not overwritten) with `newAttachmentSchema` ONLY (no `entityNoteSeedSchema`, R2); `PageTypeSchema`/`createPageSchema`/`updatePageSchema` untouched; enum-parity test still green.
- [ ] `attachRepo = createRepository(db, noteAttachments, {deviceId, encryptedFields:[], softDelete:true})`.
- [ ] `ensureEntityNote`: idempotent (2nd call → same row id, BR-S2-1); creates via `createPage` when absent; `content` = `seedContent(seed)`.
- [ ] `seedContent` is PURE + deterministic: same seed → byte-identical `content` (BR-S2-2); no `Date.now`/random (asserted by a same-seed-twice equality test).
- [ ] `addAttachment` stores an attachment (blob round-trips through the live store); `getAttachments` excludes soft-deleted (BR-S2-6); `removeAttachment` soft-deletes.
- [ ] `tsc --noEmit` 0; ESLint 0; `@vida/core` suite green (≥979 + new); enum-parity test green.
- [ ] **Verification Gate (live store):** ensureEntityNote idempotence + seed determinism + unregistered-type reject; attachment add→get→remove→get(excluded) with a real BLOB round-trip.

## 5. Implementation Prompt
1. `types.ts` — append `EntityNoteSeed`, `NewAttachment`, and the 4 method signatures to `NotesService`.
2. `validators/note.ts` — APPEND `newAttachmentSchema` ONLY (import `z`; do not touch existing exports; no `entityNoteSeedSchema`, R2). Satisfies D-S2-2.
3. `service.ts` — add `attachRepo` (BR-S2-5). Hoisted pure `seedContent(seed: EntityNoteSeed): string` → `JSON.stringify` of a deterministic `EditorDocument`: heading=`seed.title`; a paragraph listing the leading fields in FIXED order (type, status), then the remaining keys via `Object.keys(seed).sort()` (R1), skipping nullish — no Date/random (BR-S2-2, D-S2-1).
4. `ensureEntityNote`: `const existing = (await getPagesForEntity(entityType, entityId)).find(p => p.type === pageType); if (existing) return existing;` else `return service.createPage({ type: pageType, entity_type: entityType, entity_id: entityId, content: seedContent(seed) })` (reuses BR-S1-3 registry validation). Satisfies BR-S2-1..4.
5. `addAttachment(pageId, file)`: `newAttachmentSchema.parse(file)`; `attachRepo.create({ page_id: pageId, filename: file.filename, mime_type: file.mimeType, encrypted_blob: file.encryptedBlob, thumbnail_blob: file.thumbnailBlob ?? null, size_bytes: file.sizeBytes })`. `getAttachments(pageId)` → `attachRepo.findWhere(allOf(eq(noteAttachments.page_id, pageId), isNull(noteAttachments.deleted_at)))` (BR-S2-6). `removeAttachment(id)` → `attachRepo.delete(id)` (BR-S2-7).
6. Update `index.ts` barrel exports (add `EntityNoteSeed`/`NewAttachment`). Then §4 is the done-check.

## 6. Open UNKNOWNs / Decisions Needed
- D-S2-1 (seed format) + D-S2-2 (validator depth): leans stated above; confirm at Approval 1.
- None blocking. `ensureEntityNote` reuses S1 primitives; attachments are single-table.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | mod-notes-and-pages (S2) | initial draft — gate-1, after S1 ship |
