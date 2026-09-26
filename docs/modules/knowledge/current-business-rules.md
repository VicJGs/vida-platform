# Current Business Rules — Knowledge (module)

> §XXIX currency. Ground truth for the shipped `createKnowledgeService` backend. Updated per slice.
> Status: **S1 shipped** (kinds + objects + hierarchy). S2–S8 pending (`docs/modules/knowledge/delivery/decomposition.md`).
> Inherits the module invariants KN-1…KN-12 (`docs/features/knowledge/business-rules.md`).

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

## Deferred to later slices
Containers/references/link/tag (S2) · review engine + curves/bindings/due/record (S3/S4) · mastery derivation +
rollup (S4) · measurement source → Education (S5) · pages-notes/compound/lab/search/ingestion (S6) · flashcards
(S7) · events + journal (S8). `KNO-44`/`KNO-46` excluded (Education assessment link / OS-automation surface, parked).
