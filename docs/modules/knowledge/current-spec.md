# Current Spec — Knowledge (module)

> §XXIX currency. The shipped `createKnowledgeService` contract + persistence model. Updated per slice.
> Status: **S1–S8 shipped — ① COMPLETE**. Home: `packages/core/src/services/knowledge/` + the review engine at
> `packages/core/src/foundation/review/` (D1) + the flashcards sub-service at `packages/core/src/services/flashcards/`
> (S7, `createFlashcardsService`). Types: `@vida/types/knowledge.ts` (10 entity interfaces mirror
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

## S5 surface — measurement source + Education seams (KNO-25/26/27/42)
The KN-10 cross-module contract: Knowledge exposes a mastery SOURCE; Education owns the Program-level rollup + the
syllabus-as-calendar entity. Composes S4's `rollupMastery` for the one measurable signal; **no new dep, no schema,
no `@vida/types` change.** The scalar `measurement` source-registry is NOT bound (sync/scalar API can't carry
async/per-subject/struct mastery, and no consumer exists) — the exposure is the service method.
```
getMasterySource(subjectRef): Promise<MasterySource>   // subjectRef = Subject-level knowledge_object id (NOT the
                                                        // container_type='subject' container); trusted from caller
                                                        // (Subject/Unit/Topic are positional, no level attribute)
```
`MasterySource = {objectMastery, assessmentResults, paceVsSyllabus: number|null}` (service-layer shape).
`objectMastery` = `rollupMastery(subjectRef)`; `assessmentResults` (KNO-27) + `paceVsSyllabus` (KNO-26) are deny-safe
`null` (Education entities unbuilt; No-Guessing). Unresolved ref → `KnowledgeObjectNotFoundError` (guard via
`rollupMastery`). **Intent-coverage:** KNO-25 ships 🔨 BUILT (method composing S4), not 🧩 COMPOSED — the measurement
registry is not bound; KNO-26/27 stay ⏸ DEFERRED-SEAM; KNO-42 = BUILT (null discipline).

## S6 surface — pages-notes + compound sets + lab + AI/search/ingestion seams (KNO-28,31,32,33,34,35,36,37,43)
`KnowledgeServiceDeps` adds `notes: NotesService` (REQUIRED — `openObjectNote`) + `ai?: AiService` / `ingestion?:
IngestionGuard` (OPTIONAL deny-safe). **No schema, no new dep, no `@vida/types` change** — `compound_sets` +
`knowledge_lab_entries` already ship in `022_knowledge`; `CompoundSet`/`KnowledgeLabEntry` interfaces authored at S1.
```
openObjectNote(objectId): Promise<PageRow>                          // ensureEntityNote('note','knowledge_object',id,{title}); idempotent; guards object; seed.title→content (not title col)
buildCompoundSet(consumerModule, spec?, name?): Promise<CompoundSet> // is_default:false; spec JSON-serialized (opaque, not re-parsed on read)
applyDefaultCompoundSet(consumerModule): Promise<CompoundSet>       // anti-lost idempotent default (is_default:true)
listCompoundSets(consumerModule): Promise<CompoundSet[]>            // consumer-scoped; soft-del filtered
assistCompoundSet(consumerModule, req): Promise<AiAssistResult>     // optional ai; deny-safe (AiDenied→ai-unavailable); caller supplies AiRequest
createLabEntry({hypothesis, data_refs?}): Promise<KnowledgeLabEntry> // data_refs json boundary
concludeLabEntry(id, conclusion): Promise<KnowledgeLabEntry>        // guards exists
promoteToObject(entryId, {kind_id, parent_object_id?}): Promise<KnowledgeObject> // concluded+un-promoted; create-then-stamp promoted_object_id; lab.concluded event=S8
listLabEntries(): Promise<KnowledgeLabEntry[]>                      // soft-del filtered; data_refs parsed
searchKnowledge(query): Promise<KnowledgeSearchResult>             // {status:'search-unavailable'} (DB-8 seam)
autoPopulate(act): Promise<AutoPopulateResult>                     // optional ingestion; permitted→parser-unavailable, !permitted→refused, absent→ingestion-unavailable
```
Service-layer result types (not `@vida/types` — the `MasterySource` precedent): `CompoundSetSpec` (opaque structured),
`AiAssistResult` (`ready`/`ai-unavailable`), `KnowledgeSearchResult` (`search-unavailable`), `AutoPopulateResult`
(`refused`/`parser-unavailable`/`ingestion-unavailable`). New errors: `LabEntryNotFoundError`,
`LabEntryNotConcludedError`, `LabEntryAlreadyPromotedError`. New validators: `BuildCompoundSetSchema`,
`CreateLabEntrySchema`, `ConcludeLabEntrySchema`, `PromoteToObjectSchema`. `spec` = opaque JSON string at rest
(@vida/types `CompoundSet.spec: string`, not re-parsed); `data_refs` = `json<string[]>` (parsed on read, key_concepts
precedent). Idempotency: `openObjectNote` (via `ensureEntityNote`), `applyDefaultCompoundSet` (read-DB-first).

## Verification (S1 + S2 + S3 + S4 + S5 + S6)
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
terminates + guard + deriveMastery delegation. **S5 (+3):** `getMasterySource` — measured 3-level subject tree ⇒
concrete `objectMastery=90` + both Education signals null (not tautological, NIT-1) · all-unmeasured subject ⇒ all-null
· unresolved ref ⇒ `KnowledgeObjectNotFoundError`. **S6 (+21):** openObjectNote — pages row keyed on
knowledge_object (type=note) + title-in-content + idempotent + object-guard · buildCompoundSet spec JSON round-trip +
null-spec + is_default:false · applyDefaultCompoundSet anti-lost idempotent (one default, same set) · listCompoundSets
consumer-scoped · assistCompoundSet no-ai/AiDenied→ai-unavailable + success→ready(content) · lab create (data_refs
round-trip) + conclude + guard · promoteToObject (title/desc/stamp) + not-concluded + already-promoted guards ·
listLabEntries · searchKnowledge→search-unavailable · autoPopulate no-dep/permitted→parser-unavailable/denied→refused
(reason+disclosure passthrough) · sync_queue enqueue (compound set + lab entry). Full `@vida/core` suite green
(**1413**), typecheck 0, eslint 0, gitleaks clean (Node 24, better-sqlite3 ABI).

## S7 surface — Flashcards sub-service (`services/flashcards`, FC-01…12)
The ADR-005 reference study-method service over Knowledge's generic engine. `createFlashcardsService({db, deviceId,
review, spaces, backlinks, sessions, sessionRegistry})`. **No schema, no new dep, no `@vida/types` change** (the
`flashcards` table + `Flashcard` interface ship from `022_knowledge`/S1).
```
registerFlashcards(): Promise<void>            // FC-02 call-once: study_method capability (roles in config_schema) + 'review' sub-type (empty envelope); idempotent
createCard/updateCard/getCard/listCards/deleteCard  // FC-01/05/12; card_type + cloze validated (InvalidCardType/MalformedCloze); media json boundary; soft-delete
tagCard/linkCard/listCardLinks                 // FC-11 via spaces/backlinks (entity_type='flashcard'); tagCard guards the tag resolves
generateCards({sourceRef, items}): Flashcard[] // FC-04/08 create + link source (provenance); decoupled (caller supplies content); dangling-safe
startReview(cardIds): Session                  // FC-03 create a 'review' session (ad_hoc/in_progress) + attach cards
completeReview(sessionId, [{cardId, objectId, quality}]): ReviewEvent[]  // FC-03/06 one review_event/card (direct recordReview, object-keyed) + complete; ReviewEmitFailed on failure
dueCards([{cardId, objectId}], at?): Flashcard[]  // FC-07/09 excludes suspended + unbound-object (CardNotBound) cards; includes due (review.dueIn)
```
Card→engine model (headline #1): a card reviews a `knowledge_object`; binding lives on the object (no card-level
target); reviewed `objectId` supplied explicitly per card. Emit-only (FC-6). `CardNotBound` = an exclusion condition
(not a thrown error, `contract.md:36`). Errors: `InvalidCardType`/`MalformedCloze`/`ReviewEmitFailed`/
`GenerateSourceUnreadable`(deferred read-variant)/`FlashcardNotFoundError`. Validators: `CreateCardSchema`/
`UpdateCardSchema`/`GenerateCardsSchema`. Constants: `FLASHCARDS_METHOD_ID='flashcards'`, `REVIEW_SESSION_SUB_TYPE=
'review'`, `FLASHCARD_ENTITY_TYPE='flashcard'`. Deferred: XP/Journal-on-drill (foundation-envelope widening) · the
read-source `generateCards` variant · FC-10 durable retry (ADR-003/M4).

## Verification (S7)
Live-store (Node 24), **11 flashcards tests** (`services/flashcards/__tests__`): card CRUD + faithful echo + media JSON
round-trip · InvalidCardType · cloze mask (MalformedCloze / ok) · listCards type+suspended filter + soft-delete +
FlashcardNotFoundError · registration (study_method roles + idempotent) · startReview+completeReview one-event-per-card
(object-keyed) + session completed · ReviewEmitFailed (throwing-review stub) · dueCards (bound+due included, unbound
CardNotBound excluded, suspended excluded) · tagCard guard (TagNotFound) + tag/link round-trip + card-guard ·
generateCards + dangling source · sync_queue enqueue. Full `@vida/core` suite green (**1424**), typecheck 0, eslint 0,
gitleaks clean.

## S8 surface — event fan-out + Journal contribution (KNO-38/39/40)
Knowledge becomes an **emit-only producer** via two mechanisms, **both dormant in M1** (no consumer handler
registered). `KnowledgeServiceDeps` adds an OPTIONAL `effects?: { rail, registry }` (the checkins/habits port; SHAPE
inlined — `checkins` already exports `EffectsPort` and this barrel is `export *`, so a second named export collides).
**No schema, no new required dep, no `@vida/types` change.**
```ts
recordReview(input): Promise<ReviewEvent>   // WRAPPED (was the bare engine ref): post-commit fan-out —
                                            //   review.recorded → [emit_measurement_signal, award_xp] (unconditional)
                                            //   mastery.changed → [emit_measurement_signal] (iff ev.quality != null)
getDayKnowledgeDigest(date): Promise<{objectsCreated, reviewsRecorded}>  // UTC-day window; count() (soft-del auto)
```
New file `services/knowledge/journal.ts` (barrel-exported): `createKnowledgeJournalContribution(svc)` +
`registerKnowledgeJournal(registry, svc)` — a `module:'knowledge'`/`sectionKey:'summary'` contribution;
`summary(date)` = the dated digest, empty-safe (`state:'empty'` on an idle day), `dataPoints` `objects_created`+
`reviews_recorded`. **PUSH vs PULL split (ADR-004 §3.2.5:84):** `review.recorded`/`mastery.changed` PUSH onto the
rail (keyed/additive consumers — measurement/gamification); `object.created`/`lab.concluded` PUSH nothing — the
Journal is pull-aggregated (the registry digest). Grain = the `review_event.id` (exactly-once per review; distinct
reviews each fire, a replay dedups). Emit-only: post-commit, failure-isolated (a handler throw never rolls back the
persisted event), dormant-guarded (`registry.resolve` before `applyEffect`). Flashcards' direct
`review.recordReview` deliberately fires nothing in M1 (BR-KN-S7-5).

## Verification (S8)
Live-store (Node 24), **9 tests** (`__tests__/knowledge-s8-events.test.ts`): dormant no-op (no effects) · push fires
review.recorded→[measurement,xp] + mastery.changed→[measurement] once each (non-null quality) · TWO distinct reviews
each fire award_xp (grain proof) · same-event replay dedups (`applied:false`, handler once) · throwing-handler failure
isolation (event still persists) · createObject+promoteToObject push ZERO rail effects (pull-only) · null-quality
review fires review.recorded but NOT mastery.changed · dated digest (UTC-day, 2 today/1 yesterday → 2+1) · journal
contribution success/empty + registry placement. Full `@vida/core` suite green (**1433**), typecheck 0, eslint 0,
gitleaks clean.

## ① COMPLETE
All 8 slices shipped. Next: PR the `mod-knowledge-rebuild` branch. ② `fe-knowledge` (LIF-188) = separate P6.
