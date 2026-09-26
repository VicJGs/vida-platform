# Current Spec — Knowledge (module)

> §XXIX currency. The shipped `createKnowledgeService` contract + persistence model. Updated per slice.
> Status: **S1 + S2 shipped**. Home: `packages/core/src/services/knowledge/`. Types: `@vida/types/knowledge.ts`
> (10 entity interfaces mirror `022_knowledge` + `008_knowledge_review`). Validators: `@vida/core/validators/knowledge.ts`.

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

Typed errors: `ObjectKindNotFoundError`, `InvalidParentRefError`, `HierarchyCycleError`,
`KnowledgeObjectNotFoundError`, `KnowledgeContainerNotFoundError` (S2), `ReferenceNotFoundError` (S2), + the
delegated substrate errors `UnknownEntityType` (bad target type) / `TagNotFound` (bad scopedTag).

Constant: `KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'` (the tag/pages entity_type; consumed S2/S6).

## Verification (S1 + S2)
Live-store (Node 24, better-sqlite3), **41 tests** — S1 (22): seed idempotency + re-seed-when-cleared · kind CRUD ·
object CRUD + faithful echo · `key_concepts` JSON round-trip · referential-integrity + cycle rejects · mastery-
unsettable · listObjects filtering · soft-delete · sync_queue enqueue. S2 (+19): container CRUD + type-filter +
soft-delete · reference add/list/remove + object-guard + `ReferenceNotFoundError` · link write→`listLinks` read
round-trip (via real `spaces`/`backlinks`) + many-book + idempotency + object-guard + `UnknownEntityType` ·
tagMembership→`listMemberships` round-trip + many-to-many + container-guard + bogus-scopedTag `TagNotFound`
(no-orphan) + untag guard. Full `@vida/core` suite green (**1363**), typecheck 0, eslint 0.

## Not yet built
S3–S8 per `docs/modules/knowledge/delivery/decomposition.md`. The 10 `@vida/types` interfaces are authored (DB-11
reconcile, S1); their **validators + service methods** land in the owning slice.
