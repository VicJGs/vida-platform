# PLAN — mod-learning-education · S9 — Subject vault + tags/links/notes

> **Slice:** S9 of 10 [FACT: slice-map.md:26]. **Unit:** `createLearningEducationService` (append). **Context:**
> `@vida/core` → `packages/core/src/services/learning-education/{service,types}.ts`; `@vida/core/validators` →
> `validators/learning.ts`; `@vida/types` → `packages/types/src/learning.ts` (net-new `SubjectDocument`); composes
> `SpacesService` (entity_tags/entity_links WRITES), `NotesService.getPagesForEntity` (notes READ), the deny-safe
> `attachment?` port (R2 upload).
> **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2 → build) then the per-slice
> **live-store Verification Gate** (blocking) → independent code-review → /critique → §XXIX currency.
> **Baseline:** S1–S8 shipped [FACT: task Slice log; @vida/core 1648/1648]. **No-Guessing:** every claim
> `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S9 only)

Give a Subject its **vault** (documents) and its **spaces** (tags + entity links), reading documents and notes together:
1. **`addDocument(subjectId, {title, docType?, description?, file?, storageRef?}) → SubjectDocument`** — add a document to
   the per-subject vault (the PJ-8 / `project_documents` pattern); inline small `file` (`encrypted_blob`) or R2
   `storage_ref`; the deny-safe `attachment?` port governs the file→R2 path [FACT: contract.md:30-31
   `addDocument(subjectId, file)` — the intent-authority signature; seam-contract.md:64 elaborates the metadata;
   slice-map.md:26; LEA-43 parts/learning-education.md:69; schema learning.ts:310-322].
2. **`getVault(subjectId) → { documents: SubjectDocument[]; notes: PageRow[] }`** — read the subject's documents AND its
   `pages` notes together, one place per subject [FACT: seam-contract.md:65; LEA-44 parts:70; `notes: PageRow[]` grounded
   in the NotesService convention (notes/types.ts:58-83 — every method returns `PageRow`; no `toPage` mapper exists),
   overriding the seam-contract's design-time `Page[]` per [[drizzle-row-not-assignable-to-vida-types-interface]]].
3. **`tagEntity(ref, tagId) → EntityTagRow`** / **`linkEntities(from, to) → EntityLinkRow`** — compose `SpacesService`
   writes, Education-scoped; guard that `tagId` resolves (the blind-insert gap) [FACT: seam-contract.md:66; LEA-58
   parts:84; [[spaces-junctions-split-read-write-tagentity-blind-inserts]]].

**S9 does NOT:** register entity_types (`subject`/`subject_document` already registered, `_registry.ts:100-106`
[FACT]); physically drop a `subjects.tags` column (already retired at DB-4 — `learning.ts:31` `// RETIRED: inline tags
→ entity_tags` — the retire is a FACT, S9 only realizes the `entity_tags` path, nothing to migrate); create notes
(note creation is `NotesService`'s own surface — S9 only READS them in `getVault`); soft-delete documents
(`subject_documents` has NO `deleted_at`, PJ-8 → `softDelete:false`) [FACT: learning.ts:321-322 "NO deleted_at"];
implement R2 (M2 — the port is deny-safe/absent at M1); build UI (② P6).

## 2. Business Rules (BR-LE-S9-*)

- **BR-LE-S9-1 — The vault write is subject-scoped, fail-loud on the subject (no soft-delete).** `addDocument(subjectId,
  input)` guards `subjects.findById(subjectId)` live (`SubjectNotFoundError`, the no-FK app-layer integrity precedent,
  BR-LE-S2), then creates one `subject_documents` row. The table has **NO `deleted_at`** → `createRepository(...,
  {softDelete:false, encryptedFields:[]})` (the `ics_*` / `class_sessions` precedent, BR-LE-S4/S5) [FACT: learning.ts:321;
  [[session-extensions-carry-no-deleted-at]] class]. `title` required; `description`/`doc_type` nullable; `doc_type` is
  an **OPEN vocab** (no CHECK, no Zod enum — a free string) [FACT: learning.ts:315 "OPEN vocab … no CHECK"].
- **BR-LE-S9-2 — File routing: `storageRef` → `storage_ref`; `file` + port → R2; `file` + no port → inline;
  present-port-reject → typed.** **The typed vault error is a REAL R2/decrypt FAILURE, not an absent port** — this is the
  decisive, doc-RESOLVED grounding (not a fork): `business-rules.md:89` states the vault's error state is "decrypt/R2
  error → typed", and ED-16 states "every write succeeds locally first (LWW)" [FACT: business-rules.md:64,89; ED-16]. An
  absent port on a local-first write must therefore still SUCCEED locally (the inline `encrypted_blob` column is that
  path), never throw. The aspect docs outrank the seam-contract's "absent ⇒ `AttachmentUnavailable`" wording, which is
  design-time drift [[aspect-docs-outrank-rebuild-decomposition-artifacts]]:
  - `storageRef` given (caller pre-uploaded to R2) ⇒ `storage_ref = storageRef`, `encrypted_blob = null`. No port.
  - `file` given + `attachment` **present** ⇒ `attachment.upload({file, subjectId})` → `storage_ref = fileRef`,
    `encrypted_blob = null` (upload FIRST so nothing persists on failure — the books `addAsset` precedent,
    service.ts:547). A PRESENT port whose `upload` **rejects** ⇒ fail-loud `DocumentFileError` — **this IS the
    business-rules.md:89 "decrypt/R2 error → typed" state** (the books `AssetFileError` class, BR-BK-S3-2).
  - `file` given + `attachment` **absent** ⇒ **deny-safe inline**: `encrypted_blob = file.bytes`, `storage_ref = null`.
    The document is created; no throw (local-first ED-16/LEA-67; [[absent-deny-safe-port-write-is-noop-not-new-error]]).
  - neither ⇒ a metadata-only reference row (both null) — valid (a syllabus URL/title with no file). `[FACT: ED-13 "docs …
    live in one client-encrypted vault (inline small / R2 large)"; business-rules.md:58-59,89]`
  - `file` and `storageRef` are mutually exclusive (Zod refine) [FACT: contract.md:30-31 single-file; seam-contract.md:64].
  - **mimeType is NOT persisted** (inline OR R2) — `subject_documents` has no `file_type`/mime column (unlike PJ-8's
    `project_documents.file_type`, projects.ts); `FileBlob.mimeType` is optional; `doc_type` (OPEN vocab) is the only
    kind signal. Both storage paths are symmetric w.r.t. the row. `[FACT: learning.ts:310-322 no mime column; FileBlob
    books/types.ts:112-116 mimeType optional]`
- **BR-LE-S9-3 — `getVault` composes documents (vault table) + notes (`pages`), together.** `documents` = all
  `subject_documents` for the subject, mapped `→ SubjectDocument` (the service's own entity, the toSubject precedent), no
  soft-delete filter (the table has none), **sorted by `created_at` in JS** (`findWhere` has no `orderBy` — the books
  `listAnnotations` precedent service.ts:699-700). `notes` = `notes.getPagesForEntity('subject', subjectId)` returned as
  `PageRow[]` (already filters `deleted_at`; a foreign raw reader passed through — the NotesService convention, no
  `toPage` mapper exists) [FACT: NotesService.getPagesForEntity notes/service.ts:144-148; notes/types.ts:64 returns
  PageRow[]]. Returns both in one view object (LEA-44 "one place per subject").
- **BR-LE-S9-4 — `tagEntity` guards the tag resolves before the blind insert.** `tagEntity(ref, tagId)` where
  `ref={entityType, entityId}` (an Education-scoped entity): guard `tagsRepo.findById(tagId) == null ⇒ TagNotFound`
  (`SpacesService.tagEntity` blind-inserts an unresolved `tag_id`, the create-path silent-orphan gap), then delegate to
  `spaces.tagEntity(tagId, ref.entityType, ref.entityId)` (idempotent revive/no-op) [FACT: knowledge/service.ts:434-437;
  [[spaces-junctions-split-read-write-tagentity-blind-inserts]]]. `spaces.tagEntity` itself `assertRegistered`s the
  `entityType` (`UnknownEntityType`) so an off-Education type is rejected there [FACT: spaces/service.ts:129]. **The
  remove path is not added in S9** (the seam lists only create; `untag`/`unlink` stay the SpacesService surface,
  cleanable without a guard — knowledge:445 precedent).
- **BR-LE-S9-5 — `linkEntities` reuses the `page_id` slot as a generic source anchor.** `linkEntities(from, to)` where
  both are `{entityType, entityId}`: delegate to `spaces.createLink(from.entityId, to.entityType, to.entityId,
  context?)` — `entity_links` is page→entity, so the source entity id rides the `page_id` TEXT slot as a generic anchor
  (plain TEXT, no FK), the `linkObjects` precedent [FACT: knowledge/service.ts:411-413; spaces/service.ts:158
  `createLink(pageId, entityType, entityId, context)`]. `spaces.createLink` `assertRegistered`s the TARGET `entityType`
  [FACT: spaces/service.ts:159]. `[INTERPRETATION — `from.entityId` in the anchor slot; the knowledge precedent]`
- **BR-LE-S9-6 — `@vida/types` gains `SubjectDocument` (net-new).** `extends SyncableEntity`, mirrors
  `SubjectDocumentRow` exactly (`subject_id: string`, `title: string`, `description: string | null`, `doc_type: string |
  null`, `encrypted_blob: Uint8Array | null`, `storage_ref: string | null`) — **no `deleted_at`** (PJ-8), so
  `softDelete:false` [FACT: SubjectDocumentRow learning.ts:368; `ProjectDocument` project.ts:105 PJ-8 precedent; grep
  clean — no `SubjectDocument` today]. `blob('encrypted_blob')` (no `mode`) infers `Buffer | null` on the Row; the
  `@vida/types` interface uses `Uint8Array | null` (Buffer ⊂ Uint8Array, so the Row maps cleanly; `@vida/types` must not
  depend on node `Buffer`) [FACT: learning.ts:319; project_documents uses `{mode:'buffer'}` projects.ts; confirm the
  exact `$inferSelect` type at /preflight].
- **BR-LE-S9-7 — Deps grow by `spaces` (required), `notes` (required), `attachment?` (deny-safe).** `spaces:
  SpacesService` + `notes: NotesService` are REQUIRED (tagging/linking/vault-read is core to S9, not optional — the
  knowledge S2 "spaces/notes required" precedent); `attachment?: AttachmentPort` is deny-safe (R2 = M2) [FACT:
  seam-contract.md:14-23; knowledge/types.ts:66,75]. The factory also builds a READ-only `tagsRepo` (`createRepository(db,
  tags, {softDelete:true, encryptedFields:[]})`) for the BR-LE-S9-4 resolve guard (the knowledge:185 precedent).

## 3. Architecture / grounding

**Deps growth** (the S8 PLAN closed with "no deps growth"; S9 is the first to add `spaces`/`notes`/`attachment?`):
`LearningEducationServiceDeps` gains `spaces: SpacesService`, `notes: NotesService`, `attachment?: AttachmentPort`. All
existing call sites that build the service must pass `spaces`/`notes` — a compile break that the test harness + any
composition root surface (the live gate catches a missing wire) [FACT: knowledge/books inject both]. Imports:
`SpacesService`/`TagNotFound`/`UnknownEntityType` from `../../foundation/spaces`; `NotesService` from `../notes`;
`tags`/`EntityTagRow`/`EntityLinkRow` from `../../db/schema/foundation/spaces`; `Page`/`PageRow` from `@vida/types` /
`../../db/schema/notes`.

**`AttachmentPort` (Education-local, subject-keyed).** The books `AttachmentPort` is `bookId`-keyed (books/types.ts:121)
— cite-not-reuse (a different key), so S9 defines its own narrow port:
```ts
export interface FileBlob { bytes: Uint8Array; mimeType?: string; filename?: string }  // mirror books FileBlob books/types.ts:112-116
export interface AttachmentPort {
  upload(input: { file: FileBlob; subjectId: string }): Promise<{ fileRef: string }>
}
```
Only `upload` is needed in S9 (the Reader `download` is a Books concern; Education has no reader slice) [FACT:
seam-contract.md:23 "deny-safe ⇒ 'attachment-unavailable' (M2)"]. `FileBlob` is NOT in `@vida/types` today (it lives in
books/types.ts) — S9 defines its own Education-local copy (the cite-not-reuse convention across service ports) [FACT:
grep — FileBlob only in books/types.ts:112].

**Repo:** `subjectDocuments` → `createRepository(..., {softDelete:false, encryptedFields:[]})` (no `deleted_at`; `[E]`
title/description pass through at M1.0 — the empty-set seam) [FACT: learning.ts:321; [[m10-repos-use-empty-encryptedfields-seam]]].
Because the table has no `deleted_at`, vault reads use `findWhere(eq(subject_id, …))` with **no** soft-delete clause
(the `findWhere` caveat is moot here — no column to filter) [FACT: [[repository-findwhere-skips-softdelete-filter]] NB:
only applies to tables that HAVE deleted_at].

**Mappers:** `toSubjectDocument(row)` casts only `_sync_status` (plain-text → union); `encrypted_blob` (`Buffer|null`)
and `storage_ref` pass through (Buffer is a Uint8Array). **No `toPage` mapper** — `getVault.notes` returns `PageRow[]`
raw (the NotesService convention; booleans are already `boolean` via `boolInt` mode, notes/schema.ts:55-63, so no
coercion would be needed even if we mapped) [FACT: notes/types.ts:64; no `toPage` in the codebase].

**`create()` echo:** `subject_documents` has no notNull-defaulted columns beyond `baseColumns` → the create echo is
faithful; backfill `description`/`doc_type`/`encrypted_blob`/`storage_ref` to their resolved values (not DB defaults)
for a faithful row [FACT: [[repository-create-returns-input-row-not-db-defaults]]].

**Factory-object:** `addDocument`/`getVault`/`tagEntity`/`linkEntities` are hoisted closures (no `this.`), added to the
returned object [FACT: [[factory-service-no-this-for-intra-calls]]].

## 4. Acceptance (§4 — the per-slice Verification Gate, blocking)

Done = **all** of:
- `addDocument(subject, {title})` → a metadata-only row (both blob/ref null); unknown subject → `SubjectNotFoundError`;
  missing `title` → Zod error; `file` + `storageRef` together → Zod refine error.
- `addDocument` with `storageRef` → `storage_ref` set, `encrypted_blob` null (no port consulted).
- `addDocument` with `file` + a present `attachment` → `storage_ref = fileRef`, `encrypted_blob` null; a present port
  that rejects → `DocumentFileError` (nothing persisted — the business-rules.md:89 "decrypt/R2 error → typed" state).
- `addDocument` with `file` + **no** `attachment` → `encrypted_blob = file.bytes` set, `storage_ref` null, document
  created (no throw — the ED-16 local-first path).
- `getVault(subject)` → `{documents: SubjectDocument[], notes: PageRow[]}`; documents reflect all added docs (sorted by
  created_at); notes reflect `getPagesForEntity('subject', id)` (a seeded subject note appears; a soft-deleted note does not).
- `tagEntity({entityType:'subject', entityId}, tagId)` with a real tag → an `entity_tags` row; an unresolved `tagId` →
  `TagNotFound`; an off-Education `entityType` → `UnknownEntityType` (from spaces); a 2nd identical call → idempotent
  (same row / revive).
- `linkEntities({entityType:'subject',…},{entityType:'book',…})` → an `entity_links` row with the subject id in the
  anchor slot; idempotent on repeat.
- `@vida/types` `SubjectDocument` compiles; `tsc` 0; `eslint` 0; **enum-parity** green.
- **Live-store Verification Gate** (real store, Node 24): the above end-to-end incl. the spaces write + notes read
  compose; full `@vida/core` suite green (≥ 1648 + new).
- §XXIX currency: `current-*` refreshed (BR-LE-S9-1..7), committed with the code.

## 5. Implementation Prompt (§5 — strict order)

1. **`@vida/types/learning.ts`** — add `export interface SubjectDocument extends SyncableEntity { subject_id: string;
   title: string; description: string | null; doc_type: string | null; encrypted_blob: Uint8Array | null; storage_ref:
   string | null }` (NO `deleted_at`). Barrel re-exports learning.
2. **`validators/learning.ts`** — `AddDocumentSchema`: `title: z.string().min(1)`, `doc_type: z.string().nullish()`,
   `description: z.string().nullish()`, `storage_ref: z.string().nullish()`, with the raw `file` split off the validated
   metadata (bytes are not a validated value — the books `AddAssetSchema` `{file, ...meta}` split, service.ts:542) + a
   `.refine` that `file` and `storageRef` are not both present.
3. **`service/types.ts`** — add `FileBlob`, `AttachmentPort`, `DocumentFileError`; `EducationEntityRef = {entityType:
   string; entityId: string}`; `VaultView = {documents: SubjectDocument[]; notes: PageRow[]}`; `AddDocumentInput`
   (`z.input<typeof AddDocumentSchema>` + `file?: FileBlob`); the 4 method sigs on `LearningEducationService`; grow
   `LearningEducationServiceDeps` with `spaces`/`notes`/`attachment?`; import `SubjectDocument` (`@vida/types`) + `PageRow`
   (`../../db/schema/notes`).
4. **`service/service.ts`** — destructure `spaces, notes, attachment` from deps; add `subjectDocumentsRepo`
   (softDelete:false) + `tagsRepo` (READ-only); `toSubjectDocument` mapper (no `toPage` — notes pass through raw);
   implement `addDocument` (guard subject → file routing BR-LE-S9-2, upload-first → create), `getVault` (documents sorted
   + `getPagesForEntity` raw), `tagEntity` (guard tag → `spaces.tagEntity`), `linkEntities` (`spaces.createLink` anchor);
   add all 4 to the returned object.
5. **Fix the composition call sites** — any `createLearningEducationService({...})` (tests, index/barrel, a composition
   root) now must pass `spaces`/`notes` (compile break → wire them) [UNKNOWN → /preflight: enumerate the call sites].
6. **`__tests__`** — a live-store suite: addDocument metadata-only / storageRef / blob+port / blob+reject /
   blob+no-port-inline / unknown-subject / blob+storageRef-refine; getVault documents+notes (incl. soft-deleted note
   excluded); tagEntity real/unresolved/off-type/idempotent; linkEntities create/idempotent.
7. **tsc 0 · eslint 0 · enum-parity green · full suite green** → Verification Gate → code-review → /critique → §XXIX
   currency (promote BR-LE-S9-* into `current-business-rules.md`; update `current-spec.md` surface) in the build commit.

## 6. Risks / doc-resolved calls (grounded — surfaced for Victor's eye, not open forks)

Per the "ground everything" directive, the one fork the g1 critique raised is now **doc-resolved**, not an open decision:

- **`addDocument` deny-safe semantics — RESOLVED to inline-on-absent, typed-on-real-failure (BR-LE-S9-2).** The g1
  critique flagged this as the primary fork (seam-contract names `AttachmentUnavailable` on absent). The aspect docs
  settle it against the seam-contract: `business-rules.md:89` makes the vault's typed error specifically a **"decrypt/R2
  error → typed"** (a real failure), and **ED-16** mandates "every write succeeds locally first". So absent port ⇒
  local-first **inline** (the `encrypted_blob` column is that path), and **only a PRESENT port that rejects** throws
  (`DocumentFileError` = that "decrypt/R2 error" state). The seam-contract's "absent ⇒ `AttachmentUnavailable`" is
  design-time drift, overridden by the intent authority [[aspect-docs-outrank-rebuild-decomposition-artifacts]]. This is
  disanalogous to S5's `IcsUnavailableError` *by the docs*, not by my preference: ICS has no local path to a remote
  calendar; the vault does (inline). **No `AttachmentUnavailable` type is created.**
- **mimeType not persisted — schema FACT, not a gap (BR-LE-S9-2).** `subject_documents` has no mime/`file_type` column
  (unlike PJ-8 `project_documents.file_type`); `FileBlob.mimeType` is optional; inline and R2 rows are symmetric. The g1
  "inline is lossy" concern dissolves — the row never holds mime either way [FACT: learning.ts:310-322; projects.ts].
- **`getVault.notes: PageRow[]` — the NotesService convention (BR-LE-S9-3).** Every NotesService method returns
  `PageRow`; no `toPage` mapper exists. The seam-contract's `Page[]` is design-time drift; grounded to `PageRow[]`
  [[drizzle-row-not-assignable-to-vida-types-interface]]. (Also removes the g1 NIT — no mapper to under-build.)
- **`DocumentFileError` — net-new but with a real throw site (BR-LE-S9-2; g1 B2).** The S4 lesson (an invented
  `ClassSessionNotFoundError` with no throw site was struck) is honored: `DocumentFileError` fires at a real site (a
  present `attachment.upload` rejecting) and maps to the business-rules.md:89 authority state. Named per the books
  `AssetFileError` precedent; NOT the drifted seam-contract `AttachmentUnavailable`.
- **`doc_type` OPEN vocab — no Zod enum (BR-LE-S9-1)** — a free string [FACT: no-CHECK schema learning.ts:315].
- **`linkEntities` puts `from.entityId` in the `page_id` anchor slot (BR-LE-S9-5)** — the knowledge `linkObjects`
  precedent; `entity_links` has no entity↔entity shape [FACT: knowledge/service.ts:411-413].
- Verify at /preflight: the exact `$inferSelect` type of `encrypted_blob` (`Buffer | null` expected, no `mode`); the full
  set of `createLearningEducationService` call sites needing the new `spaces`/`notes` deps (a compile break); that
  `getPagesForEntity` is on the `NotesService` public interface (notes/types.ts:64 ✓); the `tags`/`EntityTagRow`/
  `EntityLinkRow` import paths; that `boolInt` yields `boolean` on PageRow (no coercion in the passthrough).
