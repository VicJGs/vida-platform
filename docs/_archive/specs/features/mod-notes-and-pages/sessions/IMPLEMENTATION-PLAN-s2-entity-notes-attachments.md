# IMPLEMENTATION-PLAN: mod-notes-and-pages — S2 Entity notes + attachments

Gate: §XXVI gate-2. Spec: `PLAN-s2-entity-notes-attachments.md` (Approval 1 ✅). Preflight PASSED (all symbols resolve).
Builds on S1 (`ef8c1ed`). No `this.`; hoisted closures; every read filters `isNull(deleted_at)` via `allOf`.

## Build order

- [ ] **B1 — `types.ts`.** Append `EntityNoteSeed` (`{title?; type?; status?; [k]: string|number|boolean|null|undefined}`) + `NewAttachment` (`{filename; mimeType; encryptedBlob: Uint8Array; thumbnailBlob?: Uint8Array; sizeBytes: number}`); add the 4 method sigs to `NotesService` (§3). Import `NoteAttachmentRow` from `../../db/schema/notes`.
- [ ] **B2 — `validators/note.ts`.** APPEND `newAttachmentSchema` ONLY (R2), keys matching the CAMELCASE public `NewAttachment` type: `z.object({ filename: z.string().min(1), mimeType: z.string().min(1), encryptedBlob: z.instanceof(Uint8Array), thumbnailBlob: z.instanceof(Uint8Array).optional(), sizeBytes: z.number().int().nonnegative() })`. The method (B6) maps camelCase → snake_case columns. Do NOT touch existing exports; do NOT add `entityNoteSeedSchema`.
- [ ] **B3 — `service.ts` attachRepo.** `const attachRepo = createRepository(db, noteAttachments, { deviceId, encryptedFields: [], softDelete: true })` (BR-S2-5). Import `noteAttachments` + `newAttachmentSchema`.
- [ ] **B4 — `seedContent` (pure, deterministic, R1/D-S2-1).** Hoisted `seedContent(seed: EntityNoteSeed): string`: build an `EditorDocument` — `content: [ heading(seed.title), paragraph(lines) ]` where `lines` = fixed order `['type','status']` then `Object.keys(seed).filter(k => !['title','type','status'].includes(k)).sort()`, each `k` with a non-nullish value rendered `` `${k}: ${seed[k]}` ``; skip nullish; heading omitted if no title. `return JSON.stringify(doc)`. NO `Date.now()`/random (BR-S2-2).
- [ ] **B5 — `ensureEntityNote`.** `async (pageType, entityType, entityId, seed)`: `const existing = (await getPagesForEntity(entityType, entityId)).find((p) => p.type === pageType); if (existing) return existing;` else `return service.createPage({ type: pageType, entity_type: entityType, entity_id: entityId, content: seedContent(seed) })` (reuses S1 registry validation → UnregisteredEntityTypeError). Call via the `service` const (no `this.`). BR-S2-1..4.
- [ ] **B6 — attachments.** `addAttachment(pageId, file)`: `const f = newAttachmentSchema.parse(file)` (camelCase), then map to snake_case columns: `attachRepo.create({ page_id: pageId, filename: f.filename, mime_type: f.mimeType, encrypted_blob: f.encryptedBlob, thumbnail_blob: f.thumbnailBlob ?? null, size_bytes: f.sizeBytes })`. `getAttachments(pageId)` → `attachRepo.findWhere(allOf(eq(noteAttachments.page_id, pageId), isNull(noteAttachments.deleted_at)))` (BR-S2-6). `removeAttachment(id)` → `await attachRepo.delete(id)` (BR-S2-7).
- [ ] **B7 — `index.ts`.** Add `EntityNoteSeed`, `NewAttachment` to the barrel type exports.
- [ ] **B8 — tests (`notes-service.test.ts`, append).** Live-store: ensureEntityNote creates then 2nd call returns same `id` (BR-S2-1); `seedContent` determinism — two ensureEntityNote on distinct entities with equal seed shape → equal `content` (BR-S2-2); unregistered entity_type → `UnregisteredEntityTypeError`; addAttachment → getAttachments returns it with `encrypted_blob` bytes intact (BLOB round-trip); removeAttachment → getAttachments excludes it (BR-S2-6/7).
- [ ] **B9 — gates.** typecheck 0 · `@vida/core` suite green (≥979 + new) · enum-parity green · eslint 0 · Verification Gate · post-impl `/critique` · §XXIX refresh `docs/modules/notes/current-*` (add S2 rows) → commit.

## On divergence

Any wrong/missing step → STOP → §XXVIII (critique → preflight → Approval → re-impl); update this plan + task Build Steps + Route History.
