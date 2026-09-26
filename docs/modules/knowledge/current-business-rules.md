# Current Business Rules — Knowledge (module)

> §XXIX currency. Ground truth for the shipped `createKnowledgeService` backend. Updated per slice.
> Status: **S1 + S2 shipped** (kinds/objects/hierarchy + containers/references/link+tag). S3–S8 pending
> (`docs/modules/knowledge/delivery/decomposition.md`). Inherits KN-1…KN-12 (`docs/features/knowledge/business-rules.md`).

## S1 — Kinds + Objects + Hierarchy (legs KNO-01…09, 41)

- **BR-KN-S1-1 — One object entity, discriminated by `kind_id`.** All kinds are rows of `knowledge_objects`;
  personalization is data, not schema. `[FACT: services/knowledge/service.ts; conventions.md:12-13]`
- **BR-KN-S1-2 — Kind registry is user-extensible + FLAT.** `seedDefaultKinds` seeds `topic` (realm `null` — a
  spine node), `concept` (`understand`), `definition` (`memorize`) as **editable/removable** defaults
  (`is_default=1`). No `parent_kind_id` (schema-FLAT). Seed is idempotent — re-seeds **only** when the registry is
  empty (a fully-cleared registry re-seeds; NOT an is_default probe). `[FACT: service.ts seedDefaultKinds; identity.md:8-9]`
- **BR-KN-S1-3 — Hierarchy via `parent_object_id`.** The Subject›Unit›Topic spine + user kinds below Topic chain
  through `parent_object_id` (self-ref, no FK). `[FACT: KN-3]`
- **BR-KN-S1-4 — Mastery is read-only (never hand-set).** `mastery_level` is absent from the create/update input
  schemas; `createObject` initializes it `null` (no signal at birth); no write path can set it (validator strips
  it, `updateObject` whitelists 9 fields excluding it). Derivation is S4. `[FACT: validators/knowledge.ts;
  service.ts createObject/updateObject; KN-9]`
- **BR-KN-S1-5 — KN-2 boundary.** A knowledge object is never the same row as an Education planning Topic; S1
  writes no Education coupling (the link is `entity_links`/compound-set, S2/S5). `[FACT: KN-2]`
- **BR-KN-S1-6 — Referential integrity at write.** `createObject`/`updateObject` reject an unresolved `kind_id`
  (`ObjectKindNotFoundError`) or `parent_object_id` (`InvalidParentRefError`), and a parent change that forms a
  **cycle** (self-parent or ancestor loop, `HierarchyCycleError`). The cycle walk is termination-safe (a `seen`
  set breaks a pre-existing data cycle). `[FACT: service.ts assertKindExists/assertParentExists/assertNoCycle; KNO-08]`
- **BR-KN-S1-7 — Typed errors + optimistic revert.** Typed errors only; a failed write reverts (core LF-2).
  `[FACT: service.ts error classes; KNO-41]`
- **BR-KN-S1-8 — M1.0 encryption seam.** `[E]` fields persist via `encryptedFields:[]` (M1.0 pass-through);
  `json<T>()` columns (`key_concepts`) are serialized at the service boundary (stringify write / parse read),
  since the M1.0 repo does not auto-serialize non-encrypted values. M3 target unchanged. `[FACT: service.ts
  toKnowledgeObject/createObject; repository.ts:125,130]`
- **BR-KN-S1-9 — Soft delete + filtered reads.** `knowledge_objects`/`object_kinds` soft-delete (`deleted_at`);
  `listObjects`/`listKinds` re-apply the `isNull(deleted_at)` filter (`findWhere` skips it). `[FACT: service.ts]`

## S2 — Containers + References + link/tag cross-cut (legs KNO-10,11,12,13,14,29,30,45)

- **BR-KN-S2-1 — Containers are org entities, nested by tags not `parent_id`.** `knowledge_containers` =
  `{container_type (module|area|subject), name}`; `createContainer`/`listContainers(filter)`/`deleteContainer` (CRUD +
  soft-delete). The Module ⊃ Area ⊃ Subject nesting is NOT a `parent_id` chain. `[FACT: service.ts createContainer/
  listContainers; schema/knowledge.ts:80-87; KN-7]`
- **BR-KN-S2-2 — Container membership rides `entity_tags` (scoped tag), many-to-many.** `tagMembership(containerId,
  memberRef, scopedTag)` records membership via `spaces.tagEntity`; the `scopedTag` (a `tags` id) is caller-supplied
  (the schema has no `root_tag_id` on `knowledge_containers`, so the binding cannot live in the schema); an Area may
  join multiple Modules. `[FACT: service.ts tagMembership; spaces/service.ts:128-143; KN-7; parts/knowledge.md:28]`
- **BR-KN-S2-3 — References are first-class (replace `resource_urls`).** `addReference(objectId, {title, source?,
  url?, type?})` writes an object-scoped `references` row (`title`/`source`/`url` `[E]`); `listReferences(objectId)`
  reads live refs; `removeReference` soft-deletes. `[FACT: service.ts addReference/listReferences; schema/knowledge.ts:90-105]`
- **BR-KN-S2-4 — Cross-module reach via `entity_links`; never `resource_type`.** `linkObject(objectId, targetRef,
  context?)` → `spaces.createLink(objectId, …)` with the object id as the source `page_id` (plain TEXT, no FK); the
  retired `resource_type` CHECK does not exist. `unlinkObject` → `spaces.removeLink`; `listLinks` →
  `backlinks.getLinksFrom`. `[FACT: service.ts linkObject/unlinkObject/listLinks; schema/foundation/spaces.ts:67-79; KN-6]`
- **BR-KN-S2-5 — Many book links per object.** Each `linkObject` writes one idempotent link row; N book links = N
  calls (`entityType='book'`) — restores v1 `linked_book_ids[]`, no single-FK landmine. `[FACT: service.ts linkObject
  (idempotent via spaces BR-14); KNO-11]`
- **BR-KN-S2-6 — Command/query split — no junction WRITE repo.** All link/tag mutations delegate to `SpacesService`;
  reads use `BacklinkResolver` (links) + a read-only `entityTagRepo` (list-by-tag) + read-only `tagsRepo` (existence).
  `[FACT: service.ts (no junction write repo); backlink-resolver.ts:2-15; notes/service.ts precedent]`
- **BR-KN-S2-7 — `entity_type` validated fail-loud (delegated).** `spaces.tagEntity`/`createLink` throw
  `UnknownEntityType` for an unregistered target; knowledge types are pre-seeded in `ENTITY_TYPES` → no registration
  code. `[FACT: service.ts (delegates); _registry.ts:80-83; spaces/service.ts:76-78]`
- **BR-KN-S2-8 — Referential integrity at write AND remove (fail-loud).** Create path: `linkObject`/`addReference`
  reject an unresolved `objectId` (`KnowledgeObjectNotFoundError`); `tagMembership` rejects an unresolved
  `containerId` (`KnowledgeContainerNotFoundError`). Remove path: `unlinkObject` guards the object,
  `untagMembership` guards the container. `removeReference` → `ReferenceNotFoundError`. `[FACT: service.ts
  assertObjectExists/assertContainerExists; KNO-08 pattern]`
- **BR-KN-S2-8b — Scoped tag must exist on the CREATE path (silent-orphan guard).** `tagMembership` asserts
  `scopedTag` resolves to a LIVE `tags` row (`tagsRepo.findById` → `TagNotFound`) before delegating — `tagEntity`
  blind-inserts an unresolved `tag_id`. `untagMembership` does NOT guard `scopedTag` (remove stays cleanable; a
  soft-deleted tag reads as not-found on create via `notDeleted()`). `[FACT: service.ts tagMembership;
  spaces/service.ts:128-143; repository.ts:356-365]`
- **BR-KN-S2-9 — Soft-delete + filtered reads.** `knowledge_containers`/`references` soft-delete; every `findWhere`
  (`listContainers`/`listReferences`/`listMemberships`) hand-appends `isNull(deleted_at)` (`findWhere` skips it).
  `[FACT: service.ts; [[repository-findwhere-skips-softdelete-filter]]]`
- **BR-KN-S2-10 — KN-45 is ratification, not migration.** S1 retired the inline `tags` column; in a fresh local DB
  there is no legacy tag data — KN-45 is satisfied by tagging riding `entity_tags` (BR-KN-S2-2). `[FACT: schema/
  knowledge.ts:45-68 (no tags col); parts/knowledge.md:60]`

## Deferred to later slices
Review engine + curves/bindings/due/record (S3/S4) · mastery derivation + rollup (S4) · measurement source →
Education (S5) · pages-notes/compound/lab/search/ingestion (S6) · flashcards (S7) · events + journal (S8).
`KNO-44`/`KNO-46` excluded (Education assessment link / OS-automation surface, parked).
