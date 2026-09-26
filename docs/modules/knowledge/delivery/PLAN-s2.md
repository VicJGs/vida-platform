# PLAN — mod-knowledge S2: Containers + References + link/tag cross-cut

> §XXVI gate-1 spec. Slice S2 of 8 (`decomposition.md`). Legs: KNO-10,11,12,13,14,29,30,45.
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.

## §1. Context
S1 shipped the kind registry + the `knowledge_objects` hierarchy. S2 makes a knowledge object a **connected,
organized citizen**: it can be **linked** to any module entity (books, courses, skills…), carry first-class
**references**, live in **containers** (Module ⊃ Area ⊃ Subject), and hold **tag memberships**. All four ride
**already-shipped substrates** — S2 is a *composition* slice, not a from-zero build.

**Baseline correction (Interpretation layer — this is the S2 headline).** `decomposition.md:54,56` says
link/tag go "via `createBacklinkResolver` / `createAssociationResolver`". Both of those factories are **READ-ONLY**
(`backlink-resolver.ts:2-15` — "SpacesService owns the WRITE half … this service NEVER mutates"). The **write
path** is `SpacesService` (`createLink`/`removeLink`/`tagEntity`/`untagEntity`, `foundation/spaces/service.ts:44-53`).
So S2 composes **both halves**: `SpacesService` (command) for the writes + `BacklinkResolver` (query) for the reads —
the exact `NotesService` shape (`services/notes/service.ts:72-89`, `notes/types.ts:20-29`). `[FACT: backlink-resolver.ts:2-15,23-30; spaces/service.ts:38-61; notes/types.ts:20-29]`

> **Gate-1 critique (REVISE → folded before Approval 1).** Independent critic verified 12/12 citations + the
> architecture (read/write split, dropping AssociationResolver, required deps, no registry). Five folds: (F1) guard
> `scopedTag` existence — silent-orphan hazard vs BR-S2-8; (F2) add the tag READ path `listMemberships` — a write leg
> needs a verifiable read (the `listLinks` symmetry + NotesService `getEntitiesByTag` precedent); (F3) local
> `KnowledgeEntityRef` not imported `TaggableRef`; (F4) guard-exists on the remove path; (F5) name the companions.
>
> **Preflight PASSED + Gate-2 SHIP (Approval 2).** Independent pass re-opened every substrate API/table/type/harness
> citation — all match. Two tidy-ups folded: `EntityTagRow`/`EntityLinkRow` imports named in §5.2; scopedTag guard
> scoped to the CREATE path only (BR-S2-8b — untag stays cleanable). Zero blockers. **Cleared to implement.**

## §2. Business rules (S2-scoped, cited)
- **BR-S2-1 — Containers are org entities, nested by tags not `parent_id`.** `knowledge_containers` = `{container_type
  (module|area|subject), name}` — CRUD only; the Module ⊃ Area ⊃ Subject nesting is **NOT** a `parent_id` chain.
  `[FACT: structure-data.md:37; business-rules.md KN-7:39-42; schema/knowledge.ts:80-87]`
- **BR-S2-2 — Container membership rides `entity_tags` (scoped tag), many-to-many.** `tagMembership(containerId,
  memberRef, scopedTag)` records membership as an `entity_tags` row via `spaces.tagEntity(scopedTag, …)`. The
  `scopedTag` (a `tags` id) is **caller-supplied** — the doc-fixed signature carries the container→tag binding,
  because `knowledge_containers` has **no `root_tag_id` column** (unlike `spaces`, `spaces.ts:86`) so the binding
  cannot live in the schema (M1.0 foundation owns the schema; S2 authors none — [[m1-foundation-owns-schema-modules-build-on-it]]).
  An Area may join multiple Modules (many-to-many at every step). `[FACT: parts/knowledge.md:28; business-rules.md
  KN-7:39-42; conventions.md:18-20; spaces/service.ts:128-143]`
- **BR-S2-3 — References are first-class (replace `resource_urls`).** `addReference(objectId, {title, source?, url?,
  type?})` inserts a `references` row scoped by `object_id`; `title`/`source`/`url` are `[E]`, `type` is an OPEN
  plaintext label. `[FACT: structure-data.md:43; schema/knowledge.ts:90-105; KNO-29/30]`
- **BR-S2-4 — Cross-module reach via `entity_links`; never `resource_type`.** `linkObject(objectId, targetRef,
  context?)` → `spaces.createLink(objectId, targetRef.entityType, targetRef.entityId, context)`. The **source anchor
  is the object id in `page_id`** (plain TEXT, no FK — the column is a generic source anchor, not restricted to a
  pages row: `spaces.ts:71`). The retired `resource_type` CHECK does not exist on `entity_links` → satisfied
  structurally. `[FACT: business-rules.md KN-6:35-38; schema/foundation/spaces.ts:67-79; parts/knowledge.md:25]`
- **BR-S2-5 — Many book links per object.** Each `linkObject` writes one idempotent `entity_links` row; N book
  links = N calls with `entityType='book'` (restores v1 `linked_book_ids[]`; no single-FK landmine).
  `[FACT: parts/knowledge.md:26 (KNO-11); spaces/service.ts:158-180 (idempotent create)]`
- **BR-S2-6 — Command/query split — never *mutate* the junction tables directly.** All writes go through
  `SpacesService` (S2 owns **no WRITE repo** on `entity_tags`/`entity_links`). Reads: links via
  `BacklinkResolver.getLinksFrom`; tag memberships via a **read-only** `entityTagRepo` (`findWhere` only — the
  `NotesService` `getEntitiesByTag` precedent, `notes/service.ts:276-286`), and tag existence via a **read-only**
  `tagsRepo` (`findById` only, F1). Read-only repos are not a "direct mutation". `[FACT: backlink-resolver.ts:2-15;
  spaces CLAUDE.md; notes/service.ts:85,276-286]`
- **BR-S2-7 — `entity_type` validated fail-loud (SP2/BR-2).** `spaces.tagEntity`/`createLink` throw
  `UnknownEntityType` for an unregistered target type. `knowledge_object`/`knowledge_container`/`reference` are
  **already in `ENTITY_TYPES`** (`_registry.ts:80-83`) so a shared/injected registry validates them with **no
  registration code in S2**. `[FACT: _registry.ts:80-83; spaces/registry.ts:15-27; spaces/service.ts:76-78]`
- **BR-S2-8 — Referential integrity at write AND remove (fail-loud, never a silent orphan).** The **create** path
  guards the source: `linkObject`/`addReference` reject an unresolved `objectId` (`KnowledgeObjectNotFoundError`);
  `tagMembership` rejects an unresolved `containerId` (`KnowledgeContainerNotFoundError`). The **remove** path guards
  too (F4 — consistency + the S1 `deleteObject` guard, `service.ts:208-209`): `unlinkObject` guards `objectId`,
  `untagMembership` guards `containerId` (else `spaces.removeLink`/`untagEntity` silently no-op on a bogus id).
  `[FACT: KNO-08 pattern (S1 service.ts:113-119,208-209); spaces/service.ts:145-155,182-192 (remove = no-op on miss);
  No-Guessing]`
- **BR-S2-8b — The scoped tag must exist on the CREATE path (F1 — close the silent-orphan gap in the substrate).**
  `tagEntity` validates `entity_type` but **not** that `tag_id` resolves to a live `tags` row (`spaces/service.ts:128-143`
  — blind insert), so **`tagMembership`** MUST assert `scopedTag` resolves via a read-only `tagsRepo.findById` before
  delegating, throwing the substrate's `TagNotFound` (`foundation/spaces` types.ts:51) — reuse, don't reinvent.
  Without this, a bogus `scopedTag` persists an orphan `entity_tags` row (the exact failure BR-S2-8 forbids). The
  guard is **create-path-only**: `untagMembership` does NOT guard `scopedTag` (removing creates no orphan, and a
  since-soft-deleted tag must still be cleanable — `untagEntity` idempotently no-ops on a miss). `findById` applies
  `notDeleted()` (`repository.ts:356-365`), so a soft-deleted tag correctly reads as not-found on create.
  `[FACT: spaces/service.ts:128-143 (no tag_id guard); repository.ts:356-365; foundation/spaces/types.ts:51 (TagNotFound)]`
- **BR-S2-9 — Soft-delete + filtered reads + M1.0 seam.** `knowledge_containers`/`references` carry `deleted_at`
  (`softDelete:true`); every `findWhere` re-applies `isNull(deleted_at)` ([[repository-findwhere-skips-softdelete-filter]]).
  `[E]` fields persist via `encryptedFields:[]` (M1.0 pass-through, M3 target). `[FACT: schema/knowledge.ts:86,102;
  [[m10-repos-use-empty-encryptedfields-seam]]]`
- **BR-S2-10 — No `json<T>()` columns in S2.** `knowledge_containers`/`references` are all `text`/`enumText` — the
  S1 json serialization seam does **not** recur here (it returns in S6). `[FACT: schema/knowledge.ts:80-105]`
- **BR-S2-11 — KN-45 is ratification, not a data migration.** S1 already retired the inline `tags` column
  (`knowledge_objects` has none); in a fresh local-first DB there is no legacy inline-tag data to migrate. KN-45 is
  satisfied by tagging riding `entity_tags` (BR-S2-2) + this documented invariant. `[FACT: parts/knowledge.md:60;
  schema/knowledge.ts:45-68 (no tags col); conventions.md:18-20]`

## §3. Scope

### In scope
1. **Deps growth (`services/knowledge/types.ts`).** `KnowledgeServiceDeps` adds **required** `spaces: SpacesService`
   + `backlinks: BacklinkResolver` (mirrors `NotesService`; `notes/types.ts:20-29`). The shared `registry` is **not**
   a knowledge dep — `spaces` validates internally and knowledge types are pre-registered (BR-S2-7). Define a **local**
   `KnowledgeEntityRef {entityType: string; entityId: string}` for `targetRef`/`memberRef` — do NOT import
   `TaggableRef` (F3: it lives in `association-resolver.ts:42` and reaches consumers only via the barrel, which would
   couple knowledge's types to the association-resolver module the read/write-split thesis deliberately drops; a
   type-only import still names that surface). Keeps the S2 dep surface exactly `{SpacesService, BacklinkResolver}`.
2. **Validators (`validators/knowledge.ts`, in-place).** `CreateKnowledgeContainerSchema` (`container_type` =
   `KnowledgeContainerTypeSchema` [already imported :29], `name` min 1); `AddReferenceSchema` (`title` min 1,
   `source`/`url`/`type` nullable-optional). Links/tags take primitive args (no new schema; `targetRef`/`memberRef`
   validated structurally + by `spaces`).
3. **Service (`services/knowledge/service.ts`) — new methods (factory-object, hoisted closures, no `this.`):**
   - **Containers (KNO-12/14):** `createContainer(input)` → `containersRepo.create` (backfill `deleted_at:null`);
     `listContainers(filter?: {containerType?})` → `findWhere(and(isNull(deleted_at), [eq type]))`; `deleteContainer(id)`
     (soft, guard-exists). View-regroup **render** is P6 (KNO-14 query half only). Returns `KnowledgeContainer` (mapper
     casts `_sync_status`, [[drizzle-row-not-assignable-to-vida-types-interface]]).
   - **References (KNO-29/30):** `addReference(objectId, input)` → assert object exists → `referencesRepo.create`
     ({object_id, title, source/url/type ?? null, deleted_at:null}); `listReferences(objectId)` →
     `findWhere(and(eq(object_id), isNull(deleted_at)))`; `removeReference(id)` (soft, guard-exists). Returns
     `Reference`. **M4 coding note:** do NOT shadow the `references` Drizzle table export with a local variable.
   - **Links (KNO-10/11):** `linkObject(objectId, targetRef, context?)` → assert object exists →
     `spaces.createLink(objectId, targetRef.entityType, targetRef.entityId, context ?? null)`;
     `unlinkObject(objectId, targetRef)` → assert object exists (F4) → `spaces.removeLink(...)`; `listLinks(objectId)`
     → `backlinks.getLinksFrom(objectId)` (returns raw `EntityLinkRow[]` — the NotesService raw-reader pattern).
   - **Tag membership (KNO-13/45):** `tagMembership(containerId, memberRef, scopedTag)` → assert container exists +
     assert `scopedTag` exists (F1, `tagsRepo.findById` → `TagNotFound`) → `spaces.tagEntity(scopedTag,
     memberRef.entityType, memberRef.entityId)`; `untagMembership(containerId, memberRef, scopedTag)` → assert
     container exists (F4) → `spaces.untagEntity(...)`; **`listMemberships(scopedTag)`** (F2) → read-only
     `entityTagRepo.findWhere(and(eq(tag_id, scopedTag), isNull(deleted_at)))` returning raw `EntityTagRow[]` (the
     `getEntitiesByTag` list-by-tag precedent). `entity_type` validation on write is delegated (fail-loud) to `spaces`.
   - **New typed error:** `KnowledgeContainerNotFoundError` (KNO-41 style). Reuse `KnowledgeObjectNotFoundError` +
     the substrate `TagNotFound` (imported from `foundation/spaces`).
   - **Companion methods (CRUD-completion / read halves, NOT new legs, F5):** `deleteContainer`, `removeReference`,
     `unlinkObject`, `listLinks`, `untagMembership`, `listMemberships` — each completes a roster leg's lifecycle or
     read half (the S1 `deleteObject` + `listLinks`/`listReferences` precedents), none introduces new intent.
4. **Repos.** WRITE repos (own tables): `createRepository(db, knowledgeContainers|references, {deviceId,
   softDelete:true, encryptedFields:[]})`. **Read-only repos** (junction/tag reads, no mutation via them):
   `entityTagRepo` (list-by-tag, F2) + `tagsRepo` (tag-existence, F1) over the shipped `entity_tags`/`tags` tables.
   No junction WRITE repo — link/tag writes delegate to `spaces` (BR-S2-6).

### Out of scope (homed later — NOT built in S2)
- Review engine + curves/bindings/due/record/derive/rollup (S3/S4) · measurement source + Education (S5) ·
  pages-notes/compound/lab/search/ingestion (S6) · flashcards (S7) · events/journal (S8).
- **View-regroup RENDER of containers/members** — the P6 concern (KNO-14 "different render"). The *service-half
  query* is IN scope: `listContainers` + `listMemberships` (F2). Only the render/grouping UI defers.
- **`getMembershipTags(memberRef)`** (an entity's outgoing memberships, via `AssociationResolver`) — not needed by
  the S2 roster; would re-introduce the dropped `AssociationResolver` dep. Deferred to a consumer that needs it (YAGNI).
- Any schema authoring, any direct `entity_tags`/`entity_links` mutation, any `resource_type` write.

## §4. Acceptance
- [ ] `createContainer` persists a `{container_type, name}` row and echoes it faithfully; `listContainers` filters by
      type + excludes soft-deleted; `deleteContainer` soft-deletes (guard-exists → `KnowledgeContainerNotFoundError`).
- [ ] `addReference` rejects an unresolved `objectId` (`KnowledgeObjectNotFoundError`), persists object-scoped;
      `listReferences` returns only that object's live refs; `removeReference` soft-deletes.
- [ ] `linkObject` writes ONE idempotent `entity_links` row via `spaces` (source `page_id`=objectId), rejects an
      unresolved object, supports N `book` links; `unlinkObject` guards the object (F4) then soft-deletes the link;
      `listLinks` returns them via `backlinks`. An unregistered `targetRef.entityType` throws `UnknownEntityType`.
- [ ] `tagMembership` records an `entity_tags` row via `spaces` (idempotent), rejects an unresolved `containerId`
      (`KnowledgeContainerNotFoundError`) **and** an unresolved `scopedTag` (`TagNotFound`, F1);
      `untagMembership` guards the container (F4) then removes it; membership is many-to-many (same member, multiple
      tags); **`listMemberships(scopedTag)` reads them back** (F2) — the write→read round-trip is verified on the
      knowledge surface, not the substrate internals.
- [ ] No junction-table WRITE repo in knowledge (read-only `entityTagRepo`/`tagsRepo` only); no `resource_type`
      write; no `json<T>` handling; `KnowledgeEntityRef` is local (no `TaggableRef` import, F3).
- [ ] Verification Gate: functional unit tests + **live-store smoke** (Node 24, better-sqlite3) green — incl. a live
      link write→read round-trip and a tag membership round-trip through real `SpacesService`; `@vida/core` typecheck
      0, eslint 0, full suite green (no regression); S1 tests updated for the new required deps, still green.

## §5. Implementation prompt (build order)
1. `validators/knowledge.ts`: add `CreateKnowledgeContainerSchema` + `AddReferenceSchema` (in-place).
2. `services/knowledge/types.ts`: grow `KnowledgeServiceDeps` (+`spaces`,+`backlinks`); add input types (`z.infer`),
   local `KnowledgeEntityRef` (F3), the S2 method signatures on `KnowledgeService` (incl. `listMemberships`),
   `KnowledgeContainerNotFoundError`; import `TagNotFound` from `foundation/spaces` and `EntityTagRow`/`EntityLinkRow`
   from `db/schema/foundation/spaces` (the raw read-method signatures — the NotesService raw-reader precedent).
3. `services/knowledge/service.ts`: construct WRITE repos (`containersRepo`/`referencesRepo`) + read-only
   `entityTagRepo`/`tagsRepo` (F1/F2); add `toContainer`/`toReference` mappers; implement containers, references,
   links, tag-membership (+ `listMemberships`, + scopedTag/remove guards) methods; return them in the factory object.
4. Update the S1 test harness constructor to inject `spaces`+`backlinks` (mirror `notes/__tests__/notes-service.test.ts:74-77`:
   `registry = createTaggableTypeRegistry()` → `spaces = createSpacesService(db, DEVICE, registry)` →
   `backlinks = createBacklinkResolver(db, DEVICE)`); re-run S1 tests green.
5. Tests: extend `services/knowledge/__tests__/service.test.ts` — containers CRUD + soft-delete · references
   add/list/remove + object-guard · linkObject/unlink/listLinks round-trip through real `spaces`/`backlinks` ·
   many-book links · tagMembership/untag/**listMemberships** round-trip · unresolved-object/container rejects ·
   **bogus scopedTag → `TagNotFound`** (F1) · **unlink/untag guard-exists rejects** (F4) · `UnknownEntityType`
   for a bogus target type. Node 24 (`nvm use 24`); `022_knowledge` + `003_spaces` are in `ALL_MIGRATIONS`.
6. §XXIX: promote to `docs/modules/knowledge/current-{spec,business-rules}.md` (BR-S2-*).

## §6. /adr-check
- **ADR-006 (Spaces):** ✅ writes route through `SpacesService`; S2 does not own the tag/link tables (SP1/SP4).
- **ADR-002 (no-FK, polymorphic entity_type):** ✅ `page_id`/`entity_id` plain TEXT; `object_id` nullable no-FK.
- **ADR-005 (review engine retired):** n/a to S2.
- **No new ADR:** S2 is composition of shipped substrates via the established `NotesService` precedent — no novel
  architectural decision. The one interpretation call (page_id-as-source-anchor; caller-supplied scopedTag) is
  grounded in the schema + doc-fixed signatures above, not a new decision.

## Deviations ledger
- **D-S2-a (code-review MINOR-5 fold, SHIP):** `removeReference` initially threw `KnowledgeObjectNotFoundError` for a
  missing *reference* id (a semantic smell — the message names an "object"). Added a distinct `ReferenceNotFoundError`
  + a missing-id test. No design change; error-catch precision only. (NITs: no ORDER BY on list reads — render/order
  is P6, left as-is; the reuse-comment NIT is moot post-fix.)
