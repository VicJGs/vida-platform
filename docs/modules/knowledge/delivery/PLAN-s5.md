# PLAN — mod-knowledge S5: Measurement source + Education seams

> §XXVI gate-1 spec. Slice S5 of 8 (`decomposition.md`). Legs: KNO-25,26,27,42.
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.
> **This slice authors no schema.** It exposes the KN-10 cross-module mastery-source contract to Education and homes
> two forward-dep signals + the mismatch discipline as explicit deny-safe seams.

## §1. Context

S4 shipped mastery derivation (`deriveMastery` at the leaf, `rollupMastery` up the `parent_object_id` spine). **S5
exposes that as a cross-module SOURCE.** KN-10 (`business-rules.md:51-55`, `intake:215-221`): *Knowledge mastery is an
Education measurement source, compounded from three signals — (1) object mastery + (2) assessment results + (3)
pace-vs-syllabus. Knowledge exposes the source; Education owns the Program-level rollup + the syllabus-as-calendar
entity.* Two of the three signals depend on Education entities that **are not built** (assessments, syllabus-as-
calendar) → they are deny-safe `null` in M1.0 (No-Guessing), exactly like the pattern S4 reserved for S5.

**Interpretation headline #1 — the contract is the async METHOD `getMasterySource`, NOT a scalar registry entry.**
`decomposition.md:77-78` suggests advertising via `createMeasurementSourceRegistry.advertise(key, resolver)` "the M5
seam habits/S4 used". Two grounded corrections:
- **No module has ever called `advertise`** (grep-clean across `packages/core/src`; S4 used the *pure* `rollup`/
  `normalize` free functions; gamification is a `query`-only *consumer* via an optional dep,
  `services/gamification/service.ts:278,456`). So there is no precedent to copy — S5 would be the first advertiser.
- **The registry API cannot carry this data.** `MeasurementSourceResolver = () => number | null` is **synchronous and
  scalar** (`source-registry.ts:11`); mastery is **async** (DB-backed `rollupMastery`) and **per-subject** (a struct,
  keyed by `subjectRef`). A sync nullary scalar resolver structurally cannot express an async per-subject 3-signal
  struct. The registry (ratified at xs-measurement #33, ADR-011 §3.8) is out of scope to change here.
- Therefore the KN-10 exposure is the **service method** `getMasterySource(subjectRef)` on `KnowledgeService`
  (the Books→Education cross-module partition pattern, `intake:215`: Education injects the provider and calls it) —
  **not** a scalar `measurement.advertise`. The scalar registry is the vehicle for *global derived-pull scalars*
  (`net_worth`, `streak`); per-subject struct mastery flows via the method. `[FACT: source-registry.ts:11 (sync
  scalar); parts/knowledge.md:40 (KNO-25 = `getMasterySource(subjectRef)` method); contract.md:53-56; business-rules.md
  KN-10:51-55; ADR-011 §3.8 (registry ratified, not S5-owned)]`

**Interpretation headline #2 — two signals are `null` by construction, and that IS KNO-42.** `assessmentResults`
(KNO-27) and `paceVsSyllabus` (KNO-26) require Education's **assessments** and **syllabus-as-calendar** entities, which
do not exist. M1.0 returns `null` for both (unmeasured, never fabricated). KNO-42 ("flag a cross-module measurement
mismatch, never guess") is realized in M1.0 as this **deny-safe null discipline**: a signal that cannot be measured
across the module boundary is `null` (the flag), never a coerced number. Actual signal-vs-signal mismatch detection
(comparing three present signals) is latent until the other two exist — homed as a documented seam, not built.
`[FACT: decomposition.md:79-81; parts/knowledge.md:41-42 (KNO-26/27 INTERPRETATION, forward dep); intake:216-221;
measurement/engine.ts:29-31 (null = unmeasured, never 0)]`

**Interpretation catch — `objectMastery` composes S4, no new machinery.** The one measurable signal is `objectMastery`
= `rollupMastery(subjectRef)` (S4, already shipped). `getMasterySource` is a thin composition + two explicit nulls;
it adds **no new dep** (no `measurement` registry injection — the advertise is not realizable, see #1). `[FACT:
service.ts:383 rollupMastery; decomposition.md:77 objectMastery]`

**Interpretation headline #3 — "Subject" here is the spine `knowledge_object`, NOT the `subject` container.** S2
introduced `knowledge_containers.container_type='subject'` (Module ⊃ Area ⊃ Subject **org** grouping, membership via
`entity_tags`, KN-7) — a DIFFERENT entity from the mastery spine. The KN-10 rollup runs the **object** spine:
`structure-data.md:28-30` — *"All of `Subject`/`Unit`/`Topic`/kinds are `knowledge_objects` chained by
`parent_object_id`… Mastery derives at the leaf and rolls UP the spine: kind → Topic → Unit → Subject."* So
`subjectRef` = the Subject-level **`knowledge_object`** id, and `rollupMastery(subjectRef)` (which walks
`parent_object_id`, `service.ts:389`) is the correct computation. It is **not** the `subject` container and **not** a
tag-membership aggregation — calling `rollupMastery` on a container id would find no `parent_object_id` children and
mis-read as a leaf/null. `[FACT: structure-data.md:28-30; schema/knowledge.ts:50 (parent_object_id = THE hierarchy),
:80-83 (containers = separate org table); service.ts:383-401 (rollupMastery walks parent_object_id)]`

**Interpretation headline #4 — Subject/Unit/Topic are POSITIONAL, not typed → the ref is trusted, and that proves
KNO-42's latency.** A `knowledge_object`'s `kind_id` points at `object_kinds` whose seeds are **topic / concept /
definition** (`structure-data.md` object_kinds row; S1 seed) — there is **no "Subject"/"Unit" kind**; a Subject is
simply an object at the top of a `parent_object_id` chain (positional). Therefore Knowledge **cannot validate** that a
caller-supplied `subjectRef` is genuinely Subject-level (no level attribute to check against). The contract **trusts
the caller's ref** (Education passes a Subject-level object id — the Books→Education provider pattern, `intake:215`).
This is *why* the KNO-42 "cross-module level/ref mismatch" check is **not realizable in M1.0** — it folds into the same
forward-dep bucket as KNO-26/27, not a silent gap. `[FACT: structure-data.md:28-30 (positional spine, seeds
topic/concept/definition); schema/knowledge.ts:44-50 (kind_id + parent_object_id, no level column); intake:215]`

## §2. Business rules (S5-scoped, cited)

- **BR-S5-1 — `getMasterySource(subjectRef)` is the KN-10 cross-module provider method.** Returns
  `{objectMastery, assessmentResults, paceVsSyllabus}` for a **Subject-level `knowledge_object`** — `subjectRef` = the
  knowledge **object** id on the `parent_object_id` spine, explicitly **NOT** the `container_type='subject'` container
  (headline #3). `objectMastery` = `rollupMastery(subjectRef)` (0–100 | null), which walks the object spine down
  (kind → Topic → Unit) and rolls up. Knowledge exposes the source; Education (unbuilt) owns the Program-level rollup.
  `[FACT: parts/knowledge.md:40 (KNO-25); contract.md:53-56; business-rules.md KN-10:51-55; structure-data.md:28-30
  (Subject = knowledge_object on the spine); service.ts:383-401]`
- **BR-S5-2 — `assessmentResults` (KNO-27) is a deny-safe `null` seam.** Education's assessments entity is not built;
  the signal is `null` (unmeasured), never fabricated. **Visibility (F3):** there is no logger seam at the
  `services/knowledge` layer (grep-clean — no service takes a logger dep), so the seam is documented via the return
  **type** (`number | null`) + a cited code comment, NOT a `log()` call (No-Guessing — do not claim a mechanism that
  isn't there). `[FACT: decomposition.md:80; parts/knowledge.md:42 (forward dep on Education assessments);
  intake:216-217; measurement/engine.ts:29-31 (null = unmeasured, never 0)]`
- **BR-S5-3 — `paceVsSyllabus` (KNO-26) is a deny-safe `null` seam.** Education's syllabus-as-calendar entity is not
  built; the signal is `null` (unmeasured), never fabricated (No-Guessing — never invent a schedule to measure pace
  against). Same visibility stance as BR-S5-2 (type + comment, no logger seam). `[FACT: decomposition.md:79-80;
  parts/knowledge.md:41; intake:217-221; structure-data.md:48-50 (syllabus = Education-owned forward dep)]`
- **BR-S5-4 — KNO-42: cross-module measurement unavailability is `null`, never guessed; mismatch-detection is
  provably latent.** M1.0 realizes KNO-42 as the deny-safe null discipline: any signal not measurable across the
  boundary is `null` (the flag), never coerced. Both richer mismatch reads are **unrealizable in M1.0, grounded**: (a)
  *signal-vs-signal* disagreement needs ≥2 present signals — only `objectMastery` exists (KNO-26/27 null); (b)
  *level/ref* mismatch needs a level attribute to validate `subjectRef` against — none exists (Subject/Unit/Topic are
  positional, headline #4). Both fold into the KNO-26/27 forward-dep bucket. `[FACT: parts/knowledge.md (KNO-42);
  structure-data.md:28-30 (positional spine); measurement/engine.ts:29-31]`
- **BR-S5-5 — an unresolved `subjectRef` is rejected, not fabricated.** `getMasterySource` reuses `rollupMastery`'s
  existing guard → `KnowledgeObjectNotFoundError` on a missing object (consistent with S4; a bad ref must not silently
  return an all-null struct that reads as "unmeasured"). Note the boundary of this guard (headline #4): it proves
  *existence*, not *Subject-level-ness* — the latter is trusted from the caller (positional spine, no level attribute).
  `[FACT: service.ts:384 assertObjectExists; BR-S4-4; structure-data.md:28-30]`
- **BR-S5-6 — no scalar `measurement.advertise`; no new dep; no schema.** The measurement source-registry
  `advertise`/`query` is NOT used (headline #1: sync/scalar vs async/per-subject/struct; no consumer). `Knowledge
  ServiceDeps` is unchanged. No migration. `[FACT: source-registry.ts:11; gamification precedent = consumer only;
  decomposition.md (S5 = no 🔨 schema)]`

## §3. Scope

### In scope
1. **`services/knowledge/types.ts`** — a `MasterySource` return type (`objectMastery`/`assessmentResults`/
   `paceVsSyllabus`: `number | null`) added to `KnowledgeService`; `getMasterySource(subjectRef: string):
   Promise<MasterySource>` on the interface.
2. **`services/knowledge/service.ts`** — implement `getMasterySource`: guard + `objectMastery =
   await rollupMastery(subjectRef)`; `assessmentResults = null` / `paceVsSyllabus = null` as the two deny-safe seams
   (a shared `SEAM_UNAVAILABLE` named constant/comment so the two nulls are self-documenting, not magic). Extend the
   factory return object.
3. **§XXIX currency** — promote `getMasterySource` + BR-S5-* into `current-{spec,business-rules}.md`.

### Out of scope (homed later — NOT built in S5)
- **The `paceVsSyllabus` computation** (KNO-26) — needs Education's syllabus-as-calendar entity. Forward dep;
  returns `null` now, computed when Education's measurement design pass lands (`intake:217-221`).
- **The `assessmentResults` computation** (KNO-27) — needs Education's assessments entity. Forward dep; `null` now.
- **Signal-vs-signal mismatch detection** (the richer read of KNO-42) — latent until KNO-26/27 exist.
- **Education's Program-level rollup + the syllabus entity** — Education-owned (KN-10); Knowledge never writes them.
- **The scalar `measurement.advertise` hookup** — not realizable with the ratified sync/scalar registry for
  async/per-subject/struct mastery, and no consumer exists (headline #1). Not force-fit.
- **Event fan-out** (`mastery.changed`) = S8. **Any schema/migration; any `@vida/types` change** (`getMasterySource`
  returns a service-layer shape).

## §4. Acceptance
- [ ] `getMasterySource(subjectRef)` returns `{objectMastery, assessmentResults, paceVsSyllabus}`; `objectMastery`
      equals `rollupMastery(subjectRef)` for the same object (measured tree ⇒ 0–100; all-unmeasured ⇒ null).
- [ ] `assessmentResults` and `paceVsSyllabus` are **always `null`** in M1.0 (deny-safe seams) — pinned by test; a
      grep confirms no fabricated/placeholder numeric ever assigned to either.
- [ ] An unresolved `subjectRef` throws `KnowledgeObjectNotFoundError` (BR-S5-5), not an all-null struct.
- [ ] No `measurement` source-registry `advertise`/`query` call is added (grep-clean); `KnowledgeServiceDeps`
      unchanged; no new schema/migration; `@vida/types` unchanged.
- [ ] Verification Gate: live-store (Node 24) — `getMasterySource` over a measured 3-level subject tree returns a
      **concrete** rolled-up `objectMastery` (assert the number, e.g. the S4 `=90` fixture shape — NOT `x===
      rollupMastery(x)`, which is tautological; NIT-1) + `null`/`null`; over an unmeasured subject returns all-null;
      unresolved ref throws. `@vida/core` typecheck 0, eslint 0, full suite green (no regression); S1–S4 tests still green.

## §5. Implementation prompt (build order)
1. `services/knowledge/types.ts`: add `export interface MasterySource { objectMastery: number | null;
   assessmentResults: number | null; paceVsSyllabus: number | null }` (a service-layer shape, not `@vida/types`); add
   `getMasterySource(subjectRef: string): Promise<MasterySource>` to `KnowledgeService`, with a doc-comment on the param
   — *"the Subject-level `knowledge_object` id on the `parent_object_id` spine (NOT the `container_type='subject'`
   container); trusted from the caller — Subject-level-ness is positional, unvalidatable (headline #3/#4)."* (NIT-2).
2. `services/knowledge/service.ts`: implement `getMasterySource` — `const objectMastery = await
   rollupMastery(subjectRef)` (its guard covers BR-S5-5); return `{ objectMastery, assessmentResults: null,
   paceVsSyllabus: null }` with a `// SEAM (KNO-26/27): Education assessments + syllabus-as-calendar entities are
   unbuilt → null, never fabricated (BR-S5-2/3/4). No logger seam at this layer → type + comment is the visibility.`
   comment. Add `getMasterySource` to the factory return.
3. Tests: `services/knowledge/__tests__/service.test.ts` — measured-tree case (objectMastery = rollup, other two
   null), all-unmeasured case (all null), unresolved-ref throws. Node 24.
4. §XXIX: promote to `current-{spec,business-rules}.md` (BR-KN-S5-*); note S5 shipped in the header + slice tracker.
   **Intent-coverage reclassification (NIT-1):** record that KNO-25 ships as **🔨 BUILT** (a method composing S4's
   `rollupMastery`), NOT 🧩 COMPOSED as `decomposition.md:133` provisionally listed (the measurement source-registry is
   not bound — headline #1); KNO-26/27 stay ⏸ DEFERRED-SEAM; KNO-42 = BUILT (null discipline). Keep the 56-leg
   partition honest.

## §6. /adr-check
- **ADR-011 (measurability):** ✅ mastery source = the derive-on-read rollup exposed cross-module; unmeasured = null,
  never fabricated (`engine.ts:29-31`). The scalar source-registry stays untouched (headline #1) — its ratified API
  is not changed. No new source advertised (per-subject struct is not a scalar measure).
- **ADR-005 (review engine) / ADR-002 (no-FK, derive-not-store):** ✅ no stored mastery; no FK; method composition only.
- **KN-10 cross-module contract:** ✅ Knowledge exposes the source method; Education owns the Program rollup + syllabus
  entity (forward dep, deny-safe null). No Education write from Knowledge.
- **No new ADR:** S5 realizes an already-decided cross-module contract (KN-10). The `advertise`-vs-method resolution is
  grounded above (a mechanical constraint of the ratified registry), not a new architectural decision.

## Deviations ledger
- **Interpretation resolution (grounded, for the gate to confirm):** the decomposition's "advertise via the M5 seam"
  is not realizable — the registry resolver is sync/scalar, mastery is async/per-subject/struct, and no consumer
  exists. Resolved to the doc-literal `getMasterySource` method (KNO-25's actual signature) + the scalar registry
  homed as a not-applicable seam. This is a mechanical grounding, not a Victor-intent question.
- **Gate-1 (/critique) verdict REVISE → folded, each grounded on the documentation (Victor: "ground it on the
  documentation"):**
  - **F1** — disambiguated "Subject": the mastery spine Subject›Unit›Topic is all `knowledge_objects` via
    `parent_object_id` (`structure-data.md:28-30`), NOT the `container_type='subject'` container (S2 org table). Added
    headline #3 + re-grounded BR-S5-1; `rollupMastery(subjectRef)` confirmed the correct walk, container reading ruled
    out.
  - **F2** — proved KNO-42's latency instead of asserting it: Subject/Unit/Topic are positional (no level attribute;
    `object_kinds` seeds are topic/concept/definition, `structure-data.md`), so level/ref-mismatch is unvalidatable
    and signal-vs-signal needs ≥2 present signals — both fold into the forward-dep bucket. Added headline #4 + rewrote
    BR-S5-4 + bounded BR-S5-5's guard.
  - **F3** — removed the unbacked "`log()`-visible" claim: no logger seam exists at `services/knowledge` (grep-clean),
    so visibility = return type + cited comment; wording fixed in BR-S5-2/3 + §5.2.
  - **NIT-1** — KNO-25 reclassified 🧩→🔨 in the §XXIX step (§5.4). **NIT-2** — `subjectRef` doc-comment in §5.1.
- **Preflight PASSED** — all layers specified; barrel-collision grep CLEAN (`MasterySource`/`getMasterySource` unused);
  guard path verified transitive (`getMasterySource → rollupMastery → assertObjectExists`, `service.ts:158-159,384`).
- **Gate-2 (/critique) verdict SHIP → 2 NITs folded; the one suspect claim VERIFIED, not over-claimed.** The
  "no logger seam" claim (BR-S5-2) was grep-verified true (`services/*` uses no logger) — the F3 fold is grounded, not
  an over-correction. **NIT-1** — measured-tree test asserts a concrete rolled-up value (S4 `=90` fixture shape), not
  the tautological `x===rollupMastery(x)` (§4). **NIT-2** — reclassify KNO-25 🧩→🔨 in `decomposition.md:133` itself
  (dated one-liner), not only in the §XXIX currency note, so the frozen coverage artifact stays in sync (§5.4).
