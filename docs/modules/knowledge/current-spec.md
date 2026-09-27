# Current Spec — Knowledge (module)

> §XXIX currency. The shipped `createKnowledgeService` contract + persistence model. Updated per slice.
> Status: **S1 + S2 + S3 + S4 shipped**. Home: `packages/core/src/services/knowledge/` + the review engine at
> `packages/core/src/foundation/review/` (D1). Types: `@vida/types/knowledge.ts` (10 entity interfaces mirror
> `022_knowledge` + `008_knowledge_review`). Validators: `@vida/core/validators/knowledge.ts`.

## Persistence model
- DB-6 `createRepository` per table, `encryptedFields:[]` (M1.0), `softDelete:true` on `knowledge_objects` +
  `object_kinds` + (S2) `knowledge_containers` + `references`. `create()` echoes the input row → serializers backfill
  notNull-defaults + coalesce nullables to null (faithful echo). `json<T>()` columns serialize/parse at the service
  boundary (S1 only; S2 tables carry none). Factory-object, hoisted closures, no `this.`; async validators.
- **S2 deps + read/write split.** `KnowledgeServiceDeps` requires `spaces: SpacesService` (the WRITE half —
  entity_links/entity_tags/tags mutations) + `backlinks: BacklinkResolver` (the link READ half). Both
  `createBacklinkResolver` + `createAssociationResolver` are read-only; `SpacesService` owns the writes (ADR-006). S2
  owns **no junction WRITE repo** — only read-only `entityTagRepo` (list-by-tag) + `tagsRepo` (tag existence). The
  shared `TaggableTypeRegistry` is NOT a dep: `spaces` validates `entity_type` internally and
  `knowledge_object`/`knowledge_container`/`reference` are pre-seeded in `ENTITY_TYPES`.

## Exposed surface — S1
```ts
createKnowledgeService({ db, deviceId }): KnowledgeService

// kind registry (KNO-01/02/03)
seedDefaultKinds(): Promise<void>              // idempotent; re-seeds only when empty
createKind(input): Promise<ObjectKind>          // FLAT registry, no parent_kind_id
listKinds(): Promise<ObjectKind[]>              // soft-delete filtered

// object hierarchy CRUD (KNO-04/05/06/07)
createObject(input): Promise<KnowledgeObject>   // rejects bad kind/parent; mastery not settable
updateObject(id, patch): Promise<KnowledgeObject> // re-checks kind + parent (exists + cycle)
getObject(id): Promise<KnowledgeObject | null>
listObjects({ kindId?, parentObjectId?, status?, difficulty? }): Promise<KnowledgeObject[]>
deleteObject(id): Promise<void>                 // soft delete
```
Input schemas (`validators/knowledge.ts`): `CreateObjectKindSchema`/`UpdateObjectKindSchema`,
`CreateKnowledgeObjectSchema`/`UpdateKnowledgeObjectSchema` (**`mastery_level` omitted** → unsettable, KN-9).

## Exposed surface — S2 (containers + references + link/tag cross-cut)
```ts
// containers (KNO-12/14) — nesting rides entity_tags, never parent_id (KN-7)
createContainer(input): Promise<KnowledgeContainer>        // {container_type, name}; faithful echo
listContainers(filter?: {containerType?}): Promise<KnowledgeContainer[]>  // query half; render = P6; soft-del filtered
deleteContainer(id): Promise<void>                          // soft; guard-exists

// references (KNO-29/30) — first-class, replaces resource_urls
addReference(objectId, {title, source?, url?, type?}): Promise<Reference>  // rejects unresolved object
listReferences(objectId): Promise<Reference[]>             // object-scoped; soft-del filtered
removeReference(id): Promise<void>                          // soft; guard-exists

// cross-module links (KNO-10/11) — write via spaces, read via backlinks; never resource_type (KN-6)
linkObject(objectId, targetRef, context?): Promise<EntityLinkRow>  // page_id=objectId (source anchor); idempotent; N book links
unlinkObject(objectId, targetRef): Promise<void>          // guards object; spaces resolve-then-soft-delete
listLinks(objectId): Promise<EntityLinkRow[]>             // backlinks.getLinksFrom (raw reader)

// tag membership (KNO-13/45) — write via spaces, read via read-only entityTagRepo
tagMembership(containerId, memberRef, scopedTag): Promise<EntityTagRow>  // guards container + scopedTag existence; idempotent; M:N
untagMembership(containerId, memberRef, scopedTag): Promise<void>        // guards container only (remove stays cleanable)
listMemberships(scopedTag): Promise<EntityTagRow[]>       // list-by-tag; soft-del filtered
```
`KnowledgeEntityRef = {entityType, entityId}` (local — not the spaces `TaggableRef`, to keep the dep surface
`{SpacesService, BacklinkResolver}`). Input schemas: `CreateKnowledgeContainerSchema`, `AddReferenceSchema`.

## S3 surface — review engine ① (KNO-15..20), delegated to `foundation/review`
`KnowledgeServiceDeps` adds the required `review: ReviewEngine`. The engine is a no-`this.` factory
(`createReviewEngine(db, deviceId, { capability })`, home `foundation/review/`), composed at app-wiring as
`createCapabilityRegistry → createReviewEngine → createKnowledgeService`. Cross-consumed (flashcards S7 + future).
`KnowledgeService` re-exposes the verbs by bare method reference; `resolveDefaultMethod` is the one wrapper (kind
lookup → delegate).
```
listMethods(): Promise<CapabilityDefinition[]>                       // capability.list() filtered kind='study_method'
registerMethod(input): Promise<CapabilityDefinition>                 // empty-envelope register → get; RegisterMethodSchema
listCurves(): Promise<ReviewCurve[]>                                 // soft-del filtered; params json parsed
defineCurve(input): Promise<ReviewCurve>                             // is_preset:false; params stringify/parse; DefineCurveSchema
removeCurve(id): Promise<void>                                       // guard → ReviewCurveNotFoundError
bindMethod(input): Promise<MethodBinding>                            // no-FK refs, NOT asserted; BindMethodSchema
listBindings(targetType, targetId): Promise<MethodBinding[]>        // by target level; soft-del filtered; S4 due input
unbindMethod(id): Promise<void>                                      // guard → MethodBindingNotFoundError
resolveDefaultMethod(kindId): Promise<string | null>                // 2-tier: default_method_id else null; ObjectKindNotFoundError on miss
```
Engine input schemas: `DefineCurveSchema`, `RegisterMethodSchema`, `BindMethodSchema`.

Typed errors: `ObjectKindNotFoundError`, `InvalidParentRefError`, `HierarchyCycleError`,
`KnowledgeObjectNotFoundError`, `KnowledgeContainerNotFoundError` (S2), `ReferenceNotFoundError` (S2),
`ReviewCurveNotFoundError` / `MethodBindingNotFoundError` (S3, in `foundation/review`), + the delegated substrate
errors `UnknownEntityType` (bad target type) / `TagNotFound` (bad scopedTag) / `DuplicateCapabilityId` (dup method id).

Constant: `KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'` (the tag/pages entity_type; consumed S2/S6).

## S4 surface — review engine ② (KNO-21..24), engine verbs delegated + `rollupMastery` knowledge-owned
Engine (`foundation/review`) gains the generic verbs; `KnowledgeService` re-exposes them by bare reference;
`rollupMastery` is the one knowledge wrapper (walks `knowledge_objects`, composes `measurement.rollup`, imported).
Mastery is **derive-on-read** (never stored). S4 imports the pure `foundation/measurement` free functions
(`normalize`/`rollup`) — the FIRST service consumer.
```
recordReview({objectId, methodId, quality?}): Promise<ReviewEvent>   // append-only; reviewed_at=now; no mastery write
getDue(range:{from,to}, {level?}): Promise<ReviewDueItem[]>          // due-queue; never-reviewed ⇒ due now (dueAt null)
dueIn(objectId, at?=now): Promise<boolean>                           // single-object due check
deriveMastery(objectId): Promise<number | null>                      // 0–100 (latest-quality qualitative); null=unmeasured
rollupMastery(objectId): Promise<number | null>                      // measurement.rollup up parent_object_id; visited-set; guards
```
`ReviewDueItem = {targetType, targetId, methodId, dueAt: number|null}` (renamed from `DueItem` — sessions owns that
name; barrel-collision rename). Input schema: `RecordReviewSchema`. Constants: `DAY_MS`, `DEFAULT_INTERVAL_DAYS=1`
(M1.0 fallback), `QUALITY_SCALE_MAX=5`. No new `@vida/types` (`ReviewEvent` exists). Non-linear curves = build-phase.

## Verification (S1 + S2 + S3 + S4)
Live-store (Node 24, better-sqlite3), **67 tests** — S1 (22): seed idempotency + re-seed-when-cleared · kind CRUD ·
object CRUD + faithful echo · `key_concepts` JSON round-trip · referential-integrity + cycle rejects · mastery-
unsettable · listObjects filtering · soft-delete · sync_queue enqueue. S2 (+19): container CRUD + type-filter +
soft-delete · reference add/list/remove + object-guard + `ReferenceNotFoundError` · link write→`listLinks` read
round-trip (via real `spaces`/`backlinks`) + many-book + idempotency + object-guard + `UnknownEntityType` ·
tagMembership→`listMemberships` round-trip + many-to-many + container-guard + bogus-scopedTag `TagNotFound`
(no-orphan) + untag guard. **S3 (+13):** engine (11, `foundation/review/__tests__/engine.test.ts`) — empty-envelope
register + partition filter (excludes shipped `habit_logger`) + dup-id reject + `config_schema` round-trip · curve
persist + `params` json round-trip (object, not string) + null params + soft-del filter + `removeCurve` guard ·
`bindMethod` no-FK (unregistered method allowed) + `listBindings` by target + `unbindMethod` guard · 2-tier
`resolveDefaultMethod` (no realm synthesis) · sync_queue enqueue — plus service delegation smoke (+2). **S4 (+13):**
engine (+7) — recordReview append + sync-enqueue + null-quality · deriveMastery null-vs-0 boundary + latest-non-null
wins · getDue interval window + level filter + never-reviewed-due-now (no crash) · dueIn · — plus service (+6):
rollupMastery null-exclusion (0.8→80) + 3-level tree (Unit→Topic→leaves = 90) + all-unmeasured→null + cycle-backstop
terminates + guard + deriveMastery delegation. Full `@vida/core` suite green (**1389**), typecheck 0, eslint 0,
gitleaks clean.

## Not yet built
S5–S8 per `docs/modules/knowledge/delivery/decomposition.md`. The 10 `@vida/types` interfaces are authored (DB-11
reconcile, S1); their **validators + service methods** land in the owning slice.
