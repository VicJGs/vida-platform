# PLAN — mod-knowledge S1: Types reconcile + Kinds + Objects + Hierarchy

> §XXVI gate-1 spec. Slice S1 of 8 (`decomposition.md`). Legs: KNO-01,02,03,04,05,06,07,08,09,41.
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.

## §1. Context
The `createKnowledgeService` spine: the user-extensible **kind registry** + the **knowledge-object hierarchy**
below a Topic (`parent_object_id` self-ref). Baseline: schema shipped (`022_knowledge`), **zero service**, and
`@vida/types/knowledge.ts` still carries the **pre-DB-4 stale shape** (`StudyTopic`/`FlashcardDeck`/…). S1 lays the
persistence + validators + object/kind CRUD that every later slice composes.

## §2. Business rules (S1-scoped, cited)
- **BR-S1-1 — One object entity, discriminated by `kind_id`.** All kinds are rows of `knowledge_objects`; no
  per-kind tables. `[FACT: conventions.md:12-13; schema/knowledge.ts:45-68]`
- **BR-S1-2 — Kind registry is user-extensible + FLAT.** `object_kinds` seeds `topic`(realm=**null** — a spine
  node, not a study target; schema `learning_realm` nullable/OPEN) / `concept`(realm=understand) /
  `definition`(realm=memorize) as **editable/removable defaults** (`is_default=1`); the user adds kinds. Code
  against `object_kinds`, NEVER a hardcoded 3-kind enum. Registry is **FLAT** — no `parent_kind_id` (UNKNOWN
  resolved by schema). `[FACT: conventions.md:6-8; identity.md:8-9; schema/knowledge.ts:71-78 (no parent_kind_id, learning_realm nullable)]`
- **BR-S1-3 — Hierarchy via `parent_object_id`.** The Subject›Unit›Topic spine + user kinds below Topic are all
  `knowledge_objects` chained by `parent_object_id` (self-ref, no FK). `[FACT: business-rules.md KN-3:18-25;
  structure-data.md:56; schema/knowledge.ts:50]`
- **BR-S1-4 — Mastery is read-only (never hand-set).** `mastery_level` is derived (S4); S1 exposes NO setter —
  it is stripped from the create/update input schemas. `[FACT: business-rules.md KN-9:47-50; conventions.md:9-10;
  KNO-05]` (schema: `mastery_level` nullable, no default — `schema/knowledge.ts:57`.)
- **BR-S1-5 — KN-2 boundary.** A knowledge object is NEVER the same row as an Education planning Topic — separate
  entities (the link is `entity_links`/compound-set, S2/S5). S1 writes no Education coupling; documented invariant.
  `[FACT: business-rules.md KN-2:15-17; identity.md:26-29]`
- **BR-S1-6 — Referential integrity at write (KNO-08).** Reject a `createObject`/`updateObject` whose `kind_id`
  does not resolve, or whose `parent_object_id` does not resolve or would form a **cycle** (self-parent or an
  ancestor loop). `[FACT: contract.md:74-76; business-rules.md terminal-table:66-68; KNO-08]`
- **BR-S1-7 — Typed errors + optimistic revert (KNO-41).** Typed errors only; a failed write reverts (LF-2, never
  silent loss). `[FACT: contract.md:73-76; core business-rules LF-2]`
- **BR-S1-8 — M1.0 encryption seam.** `[E]` fields (`title`/`description`/`key_concepts`) → **empty `[E]` set** in
  M1.0 (`encryptedFields:[]`); M3 target. `[FACT: schema/knowledge.ts:37 (BR-DB6-3); [[m10-repos-use-empty-encryptedfields-seam]]]`
- **BR-S1-9 — Soft delete.** `knowledge_objects`/`object_kinds` carry `deleted_at`; list reads filter it.
  `[FACT: schema/knowledge.ts:62,77; conventions.md:31-32]`

## §3. Scope

### In scope
1. **`@vida/types/knowledge.ts` entity-interface reconcile (DB-11).** Edit-in-place, preserving/authoring
   provenance comments. Retire the 6 superseded interfaces (`StudyTopic`, `TopicReview`, `FlashcardDeck`,
   old `Flashcard`, `FlashcardReview`, `KnowledgeNote`); author the 10 schema-mirroring interfaces
   (`KnowledgeObject`, `ObjectKind`, `KnowledgeContainer`, `Reference`, `CompoundSet`, `KnowledgeLabEntry`,
   `Flashcard`[lean], `ReviewCurve`, `MethodBinding`, `ReviewEvent` — **`ReviewEvent extends SyncableEntity` but
   carries NO `deleted_at`**: `review_events` is an append-only ledger (`knowledge-review.ts` — `...baseColumns`,
   no `deleted_at`), the `AvailabilityException`/`consequence_ledger` precedent [[session-extensions-carry-no-deleted-at]])
   as **1:1 FACT mirrors** of the shipped
   `schema/knowledge.ts` + `schema/foundation/knowledge-review.ts`. **PRESERVE all enums** — incl.
   `FLASHCARD_RESOURCE_TYPE` + the study-planner enums (`PRESET_BLOCK`, `STUDY_PLAN_BATCH_STATUS`, `SCHEDULED_*`),
   which are imported by `validators/knowledge.ts:1-15` (`schema/foundation/scheduling.ts` too) — a broken import
   there fails `@vida/core` typecheck. **PRESERVE** the study-planner interfaces (`StudyAvailability`…
   `SessionTemplate` — consumed by `services/sessions/types.ts` as `*Row` aliases; sessions-owned, out of scope). Rationale:
   one shared file, **zero external importers** (Decomposition-critic-verified), 1:1 FACT mirrors (no design) →
   reconciling the full entity set once keeps the contract coherent; validators+service stay per-slice.
2. **Validators** — **extend `validators/knowledge.ts` in-place** (it already exists + is already re-exported by
   `validators/index.ts:12` — do NOT add a barrel line, avoid double-export): add Zod for
   `CreateObjectKind`/`UpdateObjectKind`, `CreateKnowledgeObject`/`UpdateKnowledgeObject` (update omits
   `mastery_level`, BR-S1-4).
3. **Service** (`services/knowledge/{types,service,index}.ts`): `createKnowledgeService` factory-object (hoisted
   closures, no `this.`, async validators — [[factory-service-no-this-for-intra-calls]]):
   - `seedDefaultKinds()` — idempotency guard = **`(await listKinds()).length === 0`** (all-kinds count, "on
     first run"). Intentional: if the user has removed ALL default kinds, a length-0 store re-seeds (defaults are
     removable, BR-S1-2) — NOT an `is_default`-row probe. `createKind`, `listKinds` (KNO-01/02/03).
   - `createObject`, `updateObject`, `getObject`, `listObjects({kindId?,parentObjectId?,status?,difficulty?})`,
     `deleteObject` (KNO-04/05/06/07).
   - `checkHierarchyCycle` (self-parent + ancestor-loop guard, KNO-08); `assertKindExists`, `assertParentExists`.
   - Typed errors: `KnowledgeObjectNotFoundError`, `ObjectKindNotFoundError`, `HierarchyCycleError`,
     `InvalidParentRefError` (KNO-41).
   - Repository: `createRepository(db, <table>, {deviceId, softDelete:true, encryptedFields:[]})`; backfill
     notNull-default cols (`is_exam_topic`,`sort_order`,`is_default`) in the create input
     ([[repository-create-returns-input-row-not-db-defaults]]); list via `findWhere(and(<filter>, isNull(deleted_at)))`
     ([[repository-findwhere-skips-softdelete-filter]]).

### Out of scope (homed later — NOT built in S1)
- Containers/references/link/tag (S2) · review engine (S3/S4) · mastery derivation+rollup (S4) · measurement
  source (S5) · pages-notes/compound/lab/search/ingestion (S6) · flashcards (S7) · events/journal (S8).
- `entity_links`/`entity_tags`/mastery/education — no coupling written in S1.

## §4. Acceptance
- [ ] `@vida/types` reconcile: 10 interfaces mirror the schema field-for-field (name, nullability, `@encrypted`
      tags per `[E]`); 6 stale interfaces retired; all enums + study-planner interfaces intact; provenance
      comments authored (NOT stripped); `pnpm --filter @vida/types typecheck` clean.
- [ ] `seedDefaultKinds` seeds exactly topic/concept(understand)/definition(memorize) with `is_default=1`, and is
      idempotent (a second call adds nothing); kinds are editable/removable.
- [ ] `createObject` rejects unresolved `kind_id` (`ObjectKindNotFoundError`) and unresolved/cyclic
      `parent_object_id` (`InvalidParentRefError`/`HierarchyCycleError`); backfills defaults; returns the row.
- [ ] `updateObject` cannot set `mastery_level` (type-level omission) + re-checks cycle on parent change.
- [ ] `listObjects` filters by kind/parent/status/difficulty and excludes soft-deleted.
- [ ] Verification Gate: functional unit tests + **live-store smoke** (Node 24, better-sqlite3) green; `@vida/core`
      typecheck 0, eslint 0, full suite green (no regression).

## §5. Implementation prompt (build order)
1. Reconcile `@vida/types/knowledge.ts` (interfaces only; enums/study-planner untouched) → rebuild dist.
2. `validators/knowledge.ts`: object/kind Zod schemas (+ wire into `validators/index.ts`).
3. `services/knowledge/types.ts`: `KnowledgeServiceDeps`, input types (`z.infer`), `KnowledgeService` (S1 subset),
   error classes.
4. `services/knowledge/service.ts`: `createKnowledgeService` — repos, seed, kind CRUD, object CRUD, cycle guard.
5. `services/knowledge/index.ts` barrel; export from `@vida/core` `index.ts`.
6. Tests: `services/knowledge/__tests__/service.test.ts` (functional + live-store) — copy the better-sqlite3
   harness from `services/habits/__tests__/habits-service.test.ts:32-64`; `migration022Knowledge` is in
   `ALL_MIGRATIONS` so a live store has the tables. **Coding note (M4):** don't shadow the Drizzle `references`
   table export with a local var named `references`.
7. §XXIX: promote to `docs/modules/knowledge/current-{spec,business-rules}.md` (BR-S1-*).

## Deviations ledger
- **D-S1-b (code-review MINOR-A fold):** `createKind` initially omitted `deleted_at`, echoing `undefined` (the
  create-returns-input-row nullable-echo class). Fixed → `deleted_at: null` (parity with `createObject`);
  regression-asserted. Also folded 3 update-path integrity tests (MINOR-C/D + detach-to-root B). SHIP.
- **D-S1-a (deliberate superset, gate-2 M1):** §3.1 authors **10** entity interfaces incl. the review-engine trio
  (`ReviewCurve`/`MethodBinding`/`ReviewEvent`), vs the 7 listed in `decomposition.md:37-39` S1 detail. Justified:
  the trio is schema-shipped (`knowledge-review.ts`) but unmirrored in `@vida/types`; the DB-11 reconcile owns the
  full entity set once (coherent shared contract, zero external importers). Their **validators + service** stay in
  S3/S4 — S1 authors types only. Not scope-creep; recorded so the code-reviewer doesn't flag it.
