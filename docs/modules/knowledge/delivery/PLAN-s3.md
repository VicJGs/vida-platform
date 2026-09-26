# PLAN — mod-knowledge S3: Review engine ① — methods + curves + bindings

> §XXVI gate-1 spec. Slice S3 of 8 (`decomposition.md`). Legs: KNO-15,16,17,18,19,20.
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.

## §1. Context
S1 shipped the kind registry + object hierarchy; S2 made an object a connected, organized citizen. **S3 stands up
the generic review engine's *scheduling substrate*** — the pluggable **methods**, **curves**, and **bindings** that
say *how* and *with what cadence* a level is reviewed. It writes **no mastery** and logs **no reviews**: derive /
rollup / due / record are **S4**. S3 is a *substrate + composition* slice — it authors **no schema** (both migrations
already shipped: `022_knowledge`, `008_knowledge_review`).

**Interpretation headline — the engine homes to `foundation/review/`, not `services/knowledge/` (D1).** The
generic review engine is **cross-consumed** — flashcards (S7) + future skills/languages/education/finance/health
via compound sets — so it is **substrate**, not Knowledge-only. Grounding: the **schema already homed it to
foundation** (`schema/foundation/knowledge-review.ts`), and a **reserved stub exists** (`foundation/review/CLAUDE.md`,
empty of `.ts`). S3 **populates that stub** with `createReviewEngine`, and `createKnowledgeService` **composes** it as
an injected dep — the exact shape S2 used for `spaces`/`backlinks`. `[FACT: decomposition.md:11-19; parts/knowledge.md:6-8;
structure-data.md:38; foundation/review/CLAUDE.md; schema/foundation/knowledge-review.ts]`

**Interpretation catch — `listMethods`/`registerMethod` are NOT a new store.** They are typed wrappers over the
**one OS capability registry** (`createCapabilityRegistry`, ADR-008), keyed to the `kind='study_method'` partition
(F2/D2 — "not a parallel store"). `registerMethod` → `capabilityRegistry.register(def)`; `listMethods` →
`capabilityRegistry.list()` **filtered to `kind==='study_method'`** (the registry `list()` returns *all* kinds).
`[FACT: contract.md:28-30; parts/knowledge.md:30-31; capability/registry.ts:49-134]`

**Interpretation catch — a `study_method` capability declares an EMPTY privilege envelope.** `register()` enforces
BR-2..6: render targets ⊆ `RENDER_TARGET`, effects ⊆ `EFFECT_TYPE`, every render target owes all four terminal
states, and **effects ∪ bindings ⊆ the shipped privilege envelope** (currently only `habit_logger`'s). A study method
is not an effect-firing block; it declares `render_targets:[]`, `effects:[]`, `bindings:[]`, `terminal_states:{}` →
every loop is empty → passes trivially. `register()` forces `is_user_type:true` (correct: a user-registered method
*is* a user type). FC-02's roles (`retention`/`gathering`) ride `config_schema` and are resolved at **S7**, not S3.
`[FACT: capability/registry.ts:84-119; capability/types.ts:18-25; flashcards/contract.md:14-16]`

## §2. Business rules (S3-scoped, cited)
- **BR-S3-1 — Methods = the `kind='study_method'` partition of the one capability registry, never a parallel store.**
  `registerMethod(spec)` → `capability.register({...spec, kind:'study_method', render_targets:[], effects:[],
  bindings:[], terminal_states:{}})`; `listMethods()` → `capability.list()` filtered `kind==='study_method'`.
  `[FACT: contract.md:28-30; parts/knowledge.md:30-31 (KNO-15/16); capability/registry.ts:49-134; F2/D2]`
- **BR-S3-2 — A study_method def carries an empty privilege envelope.** `render_targets:[] / effects:[] / bindings:[]
  / terminal_states:{}` satisfy BR-2..6 (empty ⊆ shipped envelope; no terminal states owed). Roles/config are S7.
  `[FACT: capability/registry.ts:84-119; flashcards/contract.md:14-16]`
- **BR-S3-3 — Curves are personalizable; SM-2 is ONE preset (not the model).** `review_curves = {name [E],
  curve_kind (decay|review|test) FIXED→CHECK, params [E] json, is_preset}`. `defineCurve(spec)` creates a **user**
  curve (`is_preset:false`); `listCurves()` reads live curves (soft-delete filtered). `[FACT: business-rules.md
  KN-8:43-46; conventions.md:8-9; schema/foundation/knowledge-review.ts:17-27]`
- **BR-S3-4 — Bindings are polymorphic at any spine level.** `method_bindings = {method_id, curve_id?, target_type
  (area|subject|unit|topic|kind) FIXED→CHECK, target_id, daily_cap?}`. `bindMethod({targetType, targetId, methodId,
  curveId?, dailyCap?})` inserts one row; all refs are **plain TEXT, no FK** (generic anchors). `[FACT:
  schema/foundation/knowledge-review.ts:29-45; parts/knowledge.md:34 (KNO-19); business-rules.md KN-8:43-46]`
- **BR-S3-5 — `resolveDefaultMethod` is a 2-tier default in S3, never a guess (gate-1 FOLD 1).** Resolution order:
  **(1)** the kind's explicit `default_method_id` if set (the user override persisted at kind level); **(2)** else
  `null`. The engine resolver is **pure over the kind's fields**; `KnowledgeService.resolveDefaultMethod(kindId)` looks
  the kind up (rejects an unresolved kind → `ObjectKindNotFoundError`) and delegates. **The realm-driven tier is a
  forward seam, not an S3 behavior:** the docs specify realm→method *families* in prose ("memorize→spaced-rep drills",
  "understand→elaboration") — **not** capability ids — and the concrete method ids are *chosen when the methods are
  registered*, which is **S7/FC-02** (Flashcards = the memorize-realm method). Hard-coding `'spaced_rep'`/
  `'elaboration'` would invent identifiers that exist nowhere (No-Guessing) and contradict BR-S3-6. So S3 resolves
  only what is grounded — `default_method_id` — and the realm→*registered-method* match activates at S7 when methods
  self-declare their realm. Always overridable per level via `bindMethod` (KN-8). `[FACT: conventions.md:8-10;
  business-rules.md KN-4:26-29; schema/knowledge.ts objectKinds.default_method_id; flashcards/contract.md:14-16,61;
  capability/registry.ts:35-47 (only habit_logger shipped)]`
- **BR-S3-6 — `method_id` is a bare identifier with no FK; it need not pre-resolve to a registered capability.** A
  binding may reference a method the user has not (yet) registered — the schema deliberately keeps `method_id` plain
  TEXT no FK. `bindMethod` does **not** assert the method exists in the registry (a study method may be a
  shipped/future service id, e.g. Flashcards registered at S7). This is *why* the S3 resolver (BR-S3-5) cannot
  synthesize method ids: if bindings tolerate unregistered ids, the default resolver has even less license to invent
  them. `[FACT: schema/foundation/knowledge-review.ts:34,53; No-Guessing — do not add integrity the schema declines]`
- **BR-S3-7 — mastery / derive / rollup / due / record are OUT of S3 (S4).** S3 only *configures* scheduling. `quality`
  is a curve **input**, never written as mastery (fixes the Antigravity scale-conflation bug by construction — no
  mastery write path exists in S3). `review_events` is untouched (S4 appends). `[FACT: decomposition.md:66-74 (S4);
  business-rules.md KN-9:47-50]`
- **BR-S3-8 — `review_curves.params` is a `json<T>()` column → the S1 serialization seam recurs.** The M1.0 repo does
  NOT auto-serialize non-encrypted values, so the engine **stringifies `params` at the WRITE boundary and parses on
  READ** — exactly one cast per boundary, commented (S1 `key_concepts` precedent). `method_bindings`/`review_events`
  have no json columns. `[FACT: schema:24; repository.ts:125-130; [[json-t-columns-need-service-serialize-in-m10]]]`
- **BR-S3-9 — Soft-delete + M1.0 encryption seam.** `review_curves`/`method_bindings` carry `deleted_at`
  (`softDelete:true`; every `findWhere` re-applies `isNull(deleted_at)` — [[repository-findwhere-skips-softdelete-filter]]).
  `review_events` has **no** `deleted_at` (append-only — not written in S3). `[E]` fields persist via
  `encryptedFields:[]` (M1.0 pass-through; M3 target — [[m10-repos-use-empty-encryptedfields-seam]]). `[FACT:
  schema/foundation/knowledge-review.ts:26,39,56]`
- **BR-S3-10 — The engine is composed, not owned inline.** `createReviewEngine(db, deviceId, { capability })` lives in
  `foundation/review/`; it is injected as a **required** dep `review: ReviewEngine` on `KnowledgeServiceDeps` and the
  6 verbs are re-exposed by delegation (spaces/backlinks precedent). Required (not deny-safe optional): the review
  engine is core to Knowledge, and S7/flashcards needs the *same instance*. `[FACT: decomposition.md:11-19; D1;
  notes/types.ts:20-29 required-dep precedent]`

## §3. Scope

### In scope
1. **New foundation module `packages/core/src/foundation/review/`** (populates the reserved stub):
   - `types.ts` — `ReviewEngine` interface, `ReviewEngineDeps { capability: CapabilityRegistry }` (the options object;
     the factory is **positional** `createReviewEngine(db, deviceId, deps)` to match `createCapabilityRegistry(db,
     deviceId)` / `createSpacesService(db, deviceId, registry)` — gate-2 N-a), input types (`RegisterMethodInput`,
     `DefineCurveInput`, `BindMethodInput`), typed errors (`ReviewCurveNotFoundError`, `MethodBindingNotFoundError`).
   - `engine.ts` — `createReviewEngine(deps): ReviewEngine` (factory-object, hoisted closures, no `this.`):
     - `listMethods()` → `capability.list()` filter `kind==='study_method'` (KNO-15).
     - `registerMethod(spec)` → `capability.register(emptyEnvelope(spec))` (KNO-16); returns the registered
       `CapabilityDefinition` (via `capability.get(spec.id)`).
     - `listCurves()` → `curvesRepo.findWhere(isNull(deleted_at))`, `params` parsed (KNO-17).
     - `defineCurve(input)` → `curvesRepo.create({...input, params: stringify, is_preset:false, deleted_at:null})`,
       echo mapped (KNO-18). `removeCurve(id)` — soft-delete companion (guard-exists → `ReviewCurveNotFoundError`).
     - `bindMethod(input)` → `bindingsRepo.create({...})` (KNO-19). `listBindings(targetType, targetId)` — the
       write-leg read half (S2/F2 principle; also S4's `getDue` input); `unbindMethod(id)` — soft-delete companion
       (guard-exists → `MethodBindingNotFoundError`).
     - `resolveDefaultMethod(kindFields)` → pure 2-tier resolver (`default_method_id ?? null`, BR-S3-5); no
       persistence. `KnowledgeService.resolveDefaultMethod(kindId)` looks the kind up (→ `ObjectKindNotFoundError`
       on miss) + delegates. Errors are named `ReviewCurveNotFoundError`/`MethodBindingNotFoundError` in
       `foundation/review/types.ts` — no collision with the S1/S2 `Knowledge*NotFoundError` set (N2).
   - `index.ts` — barrel (`createReviewEngine`, `ReviewEngine`, `ReviewEngineDeps`, input types, errors). Also add
     `export * from './foundation/review'` to the top-level `@vida/core` `index.ts` (gate-2 N-b — for S7/app consumers;
     S3 tests import relative, so non-blocking but done in the same pass).
2. **Validators (`validators/knowledge.ts`, in-place).** Add `DefineCurveSchema` (`name` min 1, `curve_kind` =
   `ReviewCurveKindSchema` [already imported :26], `params` = `z.record(z.unknown()).nullable().optional()`),
   `RegisterMethodSchema` (`id` min 1, optional `config_schema`), `BindMethodSchema` (`targetType` =
   `MethodBindingTargetTypeSchema` [:27], `targetId` min 1, `methodId` min 1, `curveId`/`dailyCap` nullable-optional).
3. **`services/knowledge/types.ts`.** `KnowledgeServiceDeps` adds **required** `review: ReviewEngine`. Add the 6
   roster verbs + the 3 companions (`removeCurve`/`unbindMethod`/`listBindings`) to the `KnowledgeService` interface
   (S3 section), all delegating to `review`.
4. **`services/knowledge/service.ts`.** Destructure `review` from deps; re-expose the S3 verbs by delegation (thin
   pass-through — the engine owns the logic, Knowledge owns the surface). No new repos in the service (the engine owns
   `review_curves`/`method_bindings` repos).
5. **App-wiring note (documented, not built here — no app entry exists in M1.0 `@vida/core`):** the composition order
   is `createCapabilityRegistry(db, deviceId)` → `createReviewEngine(db, deviceId, {capability})` →
   `createKnowledgeService({db, deviceId, spaces, backlinks, review})`. Captured for the S7/UI wiring pass.

### Out of scope (homed later — NOT built in S3)
- **`getDue`/`dueIn`, `recordReview`, `deriveMastery`, `rollupMastery`** — the review-engine ② (S4). S3 provides
  their *config* (bindings/curves) + `listBindings` read; it computes nothing.
- **`seedPresetCurves()` — the SM-2 preset seed → S4 (gate-1 FOLD 2)**, where the SM-2 `params` shape is defined and
  consumed by the derivation math. S3 ships no preset row (it would be a dormant row whose shape S3 can neither
  interpret nor test for correctness); the KNO-15…20 roster contains no seed leg. `defineCurve`/`listCurves`/
  `removeCurve` (KNO-17/18 CRUD + read half) stay in S3.
- **Realm-driven default-method resolution** — the realm→*registered-method* match tier of KNO-20 → **S7** (when
  methods self-declare their realm at registration). S3 ships the grounded `default_method_id ?? null` tier only.
- **Measurement source / Education seams** (S5) · pages-notes/compound/lab/search (S6) · **flashcards** incl. FC-02
  method registration with roles + `config_schema` (S7) · events/journal (S8).
- **@vida/types changes** — `ReviewCurve`/`MethodBinding`/`ReviewEvent` interfaces + `REVIEW_CURVE_KIND`/
  `METHOD_BINDING_TARGET_TYPE` tuples already exist and match the schema (S1 DB-11 reconcile covered them). No
  reconcile owed. `[FACT: types/knowledge.ts:82-87,202-239]`
- **Registering shipped `study_method` capabilities** — deliberately NOT done. No method is registered by default in
  S3 (`registerMethod` exists as the seam; the shipped roster stays `habit_logger` only). Method registration +
  id-choice is S7/FC-02. `[FACT: capability/registry.ts:35-47]`
- Any schema/migration authoring; any mastery write; any `review_events` write.

## §4. Acceptance
- [ ] `foundation/review/` exists with `createReviewEngine`; the stub is populated; the barrel exports the surface.
- [ ] `registerMethod({id})` persists a `kind='study_method'` capability with an empty envelope (passes BR-2..6);
      `listMethods()` returns it and **excludes** non-`study_method` kinds (e.g. the shipped `habit_logger`).
- [ ] `defineCurve` persists `{name, curve_kind, params(json)}` with `is_preset:false`, round-trips `params` through
      stringify/parse; `listCurves` excludes soft-deleted; `removeCurve` soft-deletes (guard → `ReviewCurveNotFoundError`).
- [ ] `bindMethod({targetType,targetId,methodId,curveId?})` persists one `method_bindings` row (no-FK refs allowed);
      `listBindings(targetType,targetId)` reads it back (write→read verified on the surface); `unbindMethod` soft-deletes
      (guard → `MethodBindingNotFoundError`).
- [ ] `resolveDefaultMethod`: returns the kind's `default_method_id` when set; else `null`; rejects an unresolved
      kind (`ObjectKindNotFoundError`). **No realm→id synthesis** (the realm tier is an S7 forward seam).
- [ ] `KnowledgeService` re-exposes all 6 verbs + companions via the injected `review` dep; S1/S2 tests updated for the
      new required dep, still green.
- [ ] Verification Gate: functional unit tests + **live-store smoke** (Node 24, better-sqlite3) green — incl. a real
      `registerMethod`→`listMethods` round-trip through `createCapabilityRegistry`, a `defineCurve` params round-trip,
      a `bindMethod`→`listBindings` round-trip, and the 3 `resolveDefaultMethod` tiers; `@vida/core` typecheck 0,
      eslint 0, full suite green (no regression). `008_knowledge_review` + `005_*capability` are in `ALL_MIGRATIONS`.

## §5. Implementation prompt (build order)
1. `foundation/review/types.ts`: `ReviewEngineDeps`, `ReviewEngine`, input types, errors, `REALM_DEFAULT_METHOD` map.
2. `foundation/review/engine.ts`: `createReviewEngine` — construct `curvesRepo`/`bindingsRepo`
   (`createRepository(db, reviewCurves|methodBindings, {deviceId, softDelete:true, encryptedFields:[]})`); mappers
   `toCurve` (parse `params`) / `toBinding` (`_sync_status` cast); implement the verbs; `params` stringify on write.
3. `foundation/review/index.ts`: barrel.
4. `validators/knowledge.ts`: add `DefineCurveSchema`, `RegisterMethodSchema`, `BindMethodSchema` (in-place).
5. `services/knowledge/types.ts`: `+review: ReviewEngine` on deps; S3 method signatures on `KnowledgeService`.
6. `services/knowledge/service.ts`: destructure `review`; add the delegating S3 methods to the factory object.
7. Update the S1/S2 test harness constructor to build `capability = createCapabilityRegistry(db, DEVICE)` →
   `review = createReviewEngine(db, DEVICE, {capability})` and inject `review`; re-run S1/S2 tests green.
8. Tests: new `foundation/review/__tests__/engine.test.ts` (engine surface, live-store) + extend
   `services/knowledge/__tests__/service.test.ts` (delegation smoke). Cover every §4 box. Node 24 (`nvm use 24`).
9. §XXIX: promote to `docs/modules/knowledge/current-{spec,business-rules}.md` (BR-S3-*); refresh
   `foundation/review/CLAUDE.md` status (stub → built).

## §6. /adr-check
- **ADR-005 (generic review engine):** ✅ S3 builds the substrate ADR-005 reserves — pluggable methods/curves,
  method_id → capability registry, append-only events (untouched in S3). SM-2 = one preset, not the model.
- **ADR-008 (capability registry):** ✅ methods are a `kind='study_method'` partition of the ONE registry (F2/D2),
  registered through `createCapabilityRegistry` with an empty envelope — no parallel store.
- **ADR-002 (no-FK, polymorphic):** ✅ `method_id`/`curve_id`/`target_id`/`object_id` all plain TEXT, no FK.
- **ADR-018 (foundation substrate homes):** ✅ the engine populates the reserved `foundation/review/` stub, not a
  knowledge-only file — the schema already homed it there.
- **No new ADR:** S3 realizes decisions ADR-005/008 already made; D1 (foundation home) is grounded above, and the
  gate-1 critic should confirm it (decomposition.md:145).

## Deviations ledger
> Gate-1 (independent critic) verdict **REVISE → 3 folds applied before Approval 1**. The critic VERIFIED the spine:
> empty-envelope `register()` trace (BR-2..6 all pass), no-FK ruling (BR-S3-6), `json<T>` params seam (BR-S3-8),
> `foundation/review/` home (D1), injected-dep composition, roster completeness, `@vida/types` no-reconcile, migrations.
- **FOLD 1 (No-Guessing violation — centerpiece resolver).** `resolveDefaultMethod` hard-coded `'spaced_rep'`/
  `'elaboration'` as method ids; the docs specify only prose *families*, the ids are chosen at S7/FC-02 registration,
  and it self-contradicted BR-S3-6. → Collapsed to a **2-tier** resolver (`default_method_id ?? null`); the
  realm→registered-method tier is homed forward to S7 (KNO-20 stays accountable, not dropped). BR-S3-5/6, §3.1,
  §3-out-of-scope, §4 box updated.
- **FOLD 2 (scope beyond roster).** `seedPresetCurves()` is not a KNO-15…20 leg; the SM-2 `params` shape is defined and
  consumed by S4's derivation → seeding in S3 = a dormant, guess-shaped row. → Deferred to S4; removed BR-S3-3b, the
  §3.1 bullet, §4 box, and out-of-scope now records it. `defineCurve`/`listCurves`/`removeCurve` stay.
- **FOLD 3 (citation).** BR-S3-3b mis-cited `service.ts:129-132` (actual `seedDefaultKinds` = `service.ts:139-144`);
  resolved by FOLD 2's removal of BR-S3-3b.
- **NIT N2 folded** — error-naming non-collision noted in §3.1. **N1/N3 folded** into BR-S3-5 (line range `8-10`;
  S7-id rationale promoted into the rule body).
