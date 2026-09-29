# Current Business Rules — Knowledge (module)

> §XXIX currency. Ground truth for the shipped `createKnowledgeService` backend. Updated per slice.
> Status: **S1 + S2 + S3 + S4 + S5 + S6 shipped** (kinds/objects/hierarchy · containers/references/link+tag · review
> engine ①: methods/curves/bindings · review engine ②: due/record/derive/rollup · measurement source + Education seams ·
> pages-notes/compound sets/lab/AI/search/ingestion seams). S7–S8 pending
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

## Review engine ① (S3 — KNO-15..20) — `foundation/review`
> The generic review engine's SCHEDULING substrate. Homes to `foundation/review` (D1 — cross-consumed by
> flashcards S7 + future skills/languages/education), composed into `createKnowledgeService` as the required
> `review` dep. Authors no schema (`008_knowledge_review` already shipped). No mastery/derive/due/record — that is S4.
- **BR-KN-S3-1 — Methods are the `kind='study_method'` partition of the ONE capability registry, never a parallel
  store.** `registerMethod` → `capability.register(...)`; `listMethods` → `capability.list()` filtered
  `kind==='study_method'` (the registry returns all kinds). `[FACT: engine.ts listMethods/registerMethod;
  capability/registry.ts:129-132; F2/D2]`
- **BR-KN-S3-2 — A study_method declares an EMPTY privilege envelope.** `render_targets:[]/effects:[]/bindings:[]/
  terminal_states:{}` → passes capability BR-2..6 trivially; `register()` forces `is_user_type:true`. Roles/config
  ride `config_schema` (resolved at S7). `[FACT: engine.ts registerMethod; capability/registry.ts:84-119]`
- **BR-KN-S3-3 — Curves are personalizable; SM-2 = one preset (seed defers to S4).** `defineCurve` creates a USER
  curve (`is_preset:false`); `listCurves` reads live curves. `params` is `json<T>` → stringify-on-write /
  parse-on-read (one localized cast). `[FACT: engine.ts defineCurve/toCurve; schema knowledge-review.ts:17-27;
  [[json-t-columns-need-service-serialize-in-m10]]]`
- **BR-KN-S3-4 — Bindings are polymorphic; refs are no-FK and NOT asserted.** `bindMethod({targetType(area|subject|
  unit|topic|kind), targetId, methodId, curveId?, dailyCap?})` inserts one row; `method_id`/`curve_id` may reference
  an unregistered/future method (e.g. Flashcards at S7) — the schema is no-FK, so `bindMethod` adds no existence
  guard. `[FACT: engine.ts bindMethod; schema knowledge-review.ts:30-45,34,53]`
- **BR-KN-S3-5 — `resolveDefaultMethod` is 2-tier, never a guess.** `default_method_id` if set, else `null`. The
  engine resolver is PURE over the kind's fields; the service wrapper looks the kind up (→ `ObjectKindNotFoundError`
  on miss) + delegates. The realm→method tier is a **forward seam** (S7, when methods self-declare their realm):
  S3 never synthesizes a method id. `[FACT: engine.ts resolveDefaultMethod; service.ts resolveDefaultMethod;
  conventions.md:8-10; business-rules.md KN-4:26-29]`
- **BR-KN-S3-6 — Soft-delete + M1.0 seam.** `review_curves`/`method_bindings` soft-delete; `listCurves`/
  `listBindings` hand-append `isNull(deleted_at)`; `removeCurve`/`unbindMethod` guard via `findById` (→
  `ReviewCurveNotFoundError`/`MethodBindingNotFoundError`). `review_events` is untouched in S3 (append-only, S4).
  `[FACT: engine.ts; [[repository-findwhere-skips-softdelete-filter]]]`

## Review engine ② (S4 — KNO-21..24) — due + record + derive + rollup
> Activates the S3 substrate. Composes `foundation/measurement` (the pure `normalize`/`rollup` free functions,
> imported — S4 is the FIRST service consumer). Authors no schema. **Mastery is a MEASUREMENT, derived-on-read via
> the engine — never a stored number, never a bespoke formula** ("tune the curve, not the number", KN-9). SM-2 is the
> SCHEDULING axis (`getDue`), a separate concern from the mastery axis.
- **BR-KN-S4-1 — `recordReview` appends an immutable event; mastery is NOT written.** `recordReview({objectId,
  methodId, quality?})` → one `review_events` row (`reviewed_at`=now); no `mastery_level` write (derive-on-read).
  `review_events` is append-only (no `deleted_at`; eventsRepo has no `softDelete`). `[FACT: engine.ts recordReview;
  schema knowledge-review.ts:48-62]`
- **BR-KN-S4-2 — `getDue`/`dueIn` is the due-queue provider.** Iterates live `method_bindings`; a target is due if
  `now ≥ latestReviewedAt + (curve.params.interval_days ?? 1)·DAY`; **unbound/never-reviewed ⇒ due now** (short-
  circuits before any deref — no crash). `getDue` filters by `level`=target_type; reports `dueAt` (null when never
  reviewed). Curve-accurate SM-2 progression = build-phase (ADR-011:76). `[FACT: engine.ts getDue/dueIn/nextReviewAt]`
- **BR-KN-S4-3 — `deriveMastery(objectId)` is a pure derive-on-read (0–100 or null).** M1.0 reduction: the LATEST
  non-null `quality` → `measurement.normalize({kind:'qualitative', rating, scaleMax:5})` → ×100. **`null` when no
  non-null quality** (unmeasured — NEVER 0); **`quality 0` ⇒ mastery 0** (a real measured value, distinct from null).
  Generic on `object_id` — the engine NEVER reads `knowledge_objects.mastery_level`. `quality` is the input, never
  stored as mastery (the Antigravity conflation, avoided by construction). Multi-event weighting/decay = build-phase.
  `[FACT: engine.ts deriveMastery; measurement/engine.ts:14-33; business-rules.md KN-9:47-50]`
- **BR-KN-S4-4 — `rollupMastery(objectId)` rolls UP the `parent_object_id` spine via `measurement.rollup`.** A node
  with children = `rollup(children)` (weighted; nulls excluded — an unmeasured child can't drag a parent down); a leaf
  = `deriveMastery`. Internal recursion is `[0,1]`, bridged to 0–100. Knowledge-owned (walks `knowledge_objects`, which
  the generic engine must not know). Carries a **visited-set backstop** (S1 guards cycles at create-time only; a
  corrupted/synced row must not infinite-loop). Guards an unresolved object. `[FACT: service.ts rollupMastery;
  measurement/engine.ts rollup:38-53; structure-data.md:29-31]`
- **BR-KN-S4-5 — The override slot is inert-not-dead in M1.0.** `mastery_level` (nullable) is an ADR-011 override
  slot (`NULL ⇒ derive`), but there is no mastery write path in M1.0 (S1 blocks the user), so it stays null; honoring
  a manual override activates where mastery becomes writable (not built here, YAGNI). `[FACT: ADR-011 §3.2:48;
  schema/knowledge.ts:57]`

## S5 — Cross-module measurement source + Education seams (legs KNO-25/26/27/42)

- **BR-KN-S5-1 — `getMasterySource(subjectRef)` is the KN-10 mastery SOURCE Knowledge provides to Education.**
  Returns `{objectMastery, assessmentResults, paceVsSyllabus}`. `subjectRef` = the Subject-level `knowledge_object`
  id on the `parent_object_id` spine (`structure-data.md:28-30` — Subject/Unit/Topic/kinds ARE knowledge_objects),
  **NOT** the `container_type='subject'` container. `objectMastery` = `rollupMastery(subjectRef)` (0–100 | null).
  Knowledge exposes the source; Education owns the Program-level rollup. `[FACT: services/knowledge/service.ts
  getMasterySource; business-rules.md KN-10:51-55; structure-data.md:28-30]`
- **BR-KN-S5-2 — `assessmentResults` (KNO-27) + `paceVsSyllabus` (KNO-26) are deny-safe `null` seams.** Education's
  assessments + syllabus-as-calendar entities are unbuilt (forward deps) → both signals are `null`, **never
  fabricated** (No-Guessing; never invent a schedule to measure pace against). Visibility = the return type +
  a cited code comment — there is **no logger seam** at `services/knowledge` (grep-verified). Computed when
  Education's entities land. `[FACT: service.ts getMasterySource; intake:216-221; measurement/engine.ts:29-31]`
- **BR-KN-S5-3 — KNO-42: unavailability is `null`, never guessed; mismatch-detection is provably latent.** A signal
  not measurable across the boundary is `null` (the flag). The richer reads are unrealizable in M1.0, grounded: (a)
  *signal-vs-signal* disagreement needs ≥2 present signals (only `objectMastery` exists); (b) *level/ref* mismatch
  needs a level attribute to validate `subjectRef` against — none exists (Subject/Unit/Topic are **positional**;
  kinds seed topic/concept/definition). Both fold into the KNO-26/27 forward-dep bucket. `[FACT: structure-data.md:
  28-30; schema/knowledge.ts:44-50; measurement/engine.ts:29-31]`
- **BR-KN-S5-4 — an unresolved `subjectRef` is rejected, not fabricated.** The existence guard rides `rollupMastery`
  → `KnowledgeObjectNotFoundError`; a bad ref must not silently read as an all-null "unmeasured" struct. The guard
  proves *existence*, not *Subject-level-ness* (the latter is trusted from the caller, BR-KN-S5-3). `[FACT:
  service.ts:158-159,384 assertObjectExists]`
- **BR-KN-S5-5 — no scalar `measurement.advertise`; no new dep; no schema.** The measurement source-registry
  (`advertise`/`query`, `source-registry.ts:11`) is a **sync scalar** seam (`() => number|null`); mastery is
  **async + per-subject + struct**, so it cannot be carried there, and no consumer exists (gamification is a
  `query`-only consumer). The KN-10 exposure is the service method, not the scalar registry. `KnowledgeServiceDeps`
  unchanged; no migration; no `@vida/types` change. `[FACT: source-registry.ts:11; gamification/service.ts:278,456]`

## S6 — Pages-notes + Compound sets + Lab + AI/search/ingestion seams (legs KNO-28,31,32,33,34,35,36,37,43)

- **BR-KN-S6-1 — Knowledge note = a `pages` row keyed on `entity_type`, never `knowledge_notes` (KN-5).**
  `openObjectNote(objectId)` guards the object (`KnowledgeObjectNotFoundError`) then delegates to
  `notes.ensureEntityNote('note', 'knowledge_object', objectId, {title})` — **idempotent** (returns the existing note
  or creates one). The notes service folds `seed.title` into the page **content** (an H1 via `seedContent`), NOT the
  `title` column — the note's editable title/render is P6. `[FACT: service.ts openObjectNote; notes/service.ts:41-45,
  159-176; _registry.ts:80 (knowledge_object pre-registered); KN-5]`
- **BR-KN-S6-2 — Compound sets: per-consumer builder + shipped default (KN-11 anti-lost).** `buildCompoundSet(
  consumerModule, spec?, name?)` creates a set (`is_default:false`); `applyDefaultCompoundSet(consumerModule)` is
  **idempotent** — returns the consumer's existing default, else creates one (`is_default:true`) so no user is forced
  to personalize. `consumer_module` is OPEN (no CHECK). `listCompoundSets` is consumer-scoped + soft-delete filtered.
  `[FACT: service.ts buildCompoundSet/applyDefaultCompoundSet/listCompoundSets; KN-11; schema/knowledge.ts:108-121]`
- **BR-KN-S6-3 — `spec` is an opaque JSON blob serialized at the boundary.** The builder accepts a structured
  `CompoundSetSpec` and `JSON.stringify`s it into the `[E]` `text()` column; `@vida/types CompoundSet.spec` is a
  `string` at rest, so `toCompoundSet` does NOT re-parse it (a consumer parses if it needs the structure). The default
  set's `spec` contents are a design-pass (`null`, not an invented rule-set — No-Guessing). `[FACT: service.ts
  buildCompoundSet/toCompoundSet; @vida/types/knowledge.ts:167]`
- **BR-KN-S6-4 — Knowledge Lab: hypothesis → conclusion → promoted object.** `createLabEntry({hypothesis, data_refs?})`
  (`data_refs` = json<string[]>, serialized/parsed at the boundary — the key_concepts precedent); `concludeLabEntry(id,
  conclusion)` guards exists (`LabEntryNotFoundError`); `promoteToObject(entryId, {kind_id, parent_object_id?})`
  requires a **concluded** (`LabEntryNotConcludedError` else) **un-promoted** (`LabEntryAlreadyPromotedError` else)
  entry → creates a catalog object (title=hypothesis, description=conclusion) then stamps `promoted_object_id`
  (create-then-stamp; eventually consistent per the no-FK app-layer convention). The `lab.concluded` **event is S8**.
  `[FACT: service.ts createLabEntry/concludeLabEntry/promoteToObject/listLabEntries; contract.md:47-49; decomposition.md:88 vs :32,108]`
- **BR-KN-S6-5 — AI-assist is an opt-in, deny-safe extension-model seam (KNO-33).** `assistCompoundSet(consumerModule,
  req)` composes the OPTIONAL `ai` dep: absent ⇒ `{status:'ai-unavailable'}`; `ai.askModel(req)` **throws `AiDenied`**
  on every deny path (M1 ports absent) → caught → `{status:'ai-unavailable', reason}`; success →
  `{status:'ready', suggestion: content}`. The caller supplies the `AiRequest` (mode + consent); Knowledge never
  auto-applies nor holds a model key. `[FACT: service.ts assistCompoundSet; ai/service.ts:32,72,88; ai/types.ts:72-74]`
- **BR-KN-S6-6 — Search is a loud DB-8 seam (KNO-37).** `searchKnowledge(query)` returns `{status:'search-unavailable'}`
  (the platform-wide convention); FTS5 `fts_knowledge` is unbuilt. Never throws, never a silent empty list.
  `[FACT: service.ts searchKnowledge; structure-data.md:46; apps/web command-bar convention]`
- **BR-KN-S6-7 — Auto-population is an opt-in, device-side, deny-safe ingestion seam (KNO-43).** `autoPopulate(act)`
  maps the OPTIONAL `ingestion` guard's `IngestionDecision`: absent ⇒ `ingestion-unavailable`; `!permitted` ⇒
  `refused` (reason + disclosure passed through, refuse-not-downgrade); `permitted` ⇒ `parser-unavailable` (source
  parsers deferred — the real M1 seam). `checkIngestion` never touches the mediator. `[FACT: service.ts autoPopulate;
  ingestion/guard.ts:48-81; decomposition.md:90]`
- **BR-KN-S6-8 — Typed errors + M1.0 seams inherited.** New errors `LabEntryNotFoundError`/`LabEntryNotConcludedError`/
  `LabEntryAlreadyPromotedError`; `encryptedFields:[]` M1.0 pass-through ([E] `spec`/`hypothesis`/`conclusion` → M3);
  soft-delete + explicit `isNull(deleted_at)` on every S6 `findWhere` read. `[FACT: service.ts; types.ts]`

## Deferred to later slices
Flashcards (S7) · events + journal fan-out (S8, incl. `object.created`/`review.recorded`/`mastery.changed`/
`lab.concluded`). The **SM-2 preset seed** (`seedPresetCurves`) + the **realm-driven default-method tier** +
**non-linear decay/interval curves** defer (S4-adjacent / S7 / build-phase respectively). The two S5 Education signals
(`assessmentResults`/`paceVsSyllabus`) unlock with Education's assessments + syllabus-as-calendar entities. The S6 AI
suggestion runtime (real spec generation) = M2/LIF-145; the ingestion source parsers = deferred. `KNO-44`/`KNO-46`
excluded (Education assessment link / OS-automation surface, parked).
