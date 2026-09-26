# Current Spec — Knowledge (module)

> §XXIX currency. The shipped `createKnowledgeService` contract + persistence model. Updated per slice.
> Status: **S1 shipped**. Home: `packages/core/src/services/knowledge/`. Types: `@vida/types/knowledge.ts`
> (10 entity interfaces mirror `022_knowledge` + `008_knowledge_review`). Validators: `@vida/core/validators/knowledge.ts`.

## Persistence model
- DB-6 `createRepository` per table, `encryptedFields:[]` (M1.0), `softDelete:true` on `knowledge_objects` +
  `object_kinds`. `create()` echoes the input row → serializers backfill notNull-defaults + coalesce nullables to
  null (faithful echo). `json<T>()` columns serialize/parse at the service boundary. Factory-object, hoisted
  closures, no `this.`; async validators.

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

Typed errors: `ObjectKindNotFoundError`, `InvalidParentRefError`, `HierarchyCycleError`,
`KnowledgeObjectNotFoundError`.

Constant: `KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'` (the tag/pages entity_type; consumed S2/S6).

## Verification (S1)
Live-store (Node 24, better-sqlite3), **22 tests** — seed idempotency + re-seed-when-cleared · kind CRUD ·
object CRUD + faithful echo · `key_concepts` JSON round-trip · referential-integrity + cycle rejects (create +
update paths) · mastery-unsettable (write-path proof) · listObjects filtering · soft-delete retention ·
co-transactional `sync_queue` enqueue. Full `@vida/core` suite green (1344), typecheck 0, eslint 0.

## Not yet built
S2–S8 per `docs/modules/knowledge/delivery/decomposition.md`. The 10 `@vida/types` interfaces are authored (DB-11
reconcile, S1); their **validators + service methods** land in the owning slice.
