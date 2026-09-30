# PLAN — mod-knowledge S4: Review engine ② — due + record + derive + rollup

> §XXVI gate-1 spec. Slice S4 of 8 (`decomposition.md`). Legs: KNO-21,22,23,24.
> No-Guessing: every rule is `[FACT: src]` / `[INTENT: rule]` / `[UNKNOWN]`. Branch `mod-knowledge-rebuild`.
> **Correction note (this slice was mis-scoped once):** mastery is a MEASUREMENT derived via `foundation/measurement`
> (ADR-011), NOT a bespoke SM-2→0-100 formula. SM-2 is the scheduling (review-curve) axis of `getDue`; mastery is a
> separate derive-on-read axis. "Tune the curve, not the number" originates in **KN-9** (`business-rules.md:47-50`);
> ADR-011:48 *cites* it and owns the derive-by-default override-slot mechanism. Non-linear curve internals are
> ADR-011:76 build-phase; M1.0 uses the engine's basic `normalize`/`rollup`/`resolveProgress`.

## §1. Context
S3 shipped the scheduling substrate (methods · curves · bindings). **S4 activates it**: log review outcomes, provide
the due-queue, and derive+roll-up mastery. It composes TWO shipped substrates — the S3 review engine (its
`review_events`/`method_bindings`/`review_curves` tables) + `foundation/measurement` (ADR-011: the pure
`normalize`/`rollup`/`resolveProgress` free functions, imported not injected — the gamification `assertAcyclic`
precedent, `services/gamification/service.ts:20`). It authors **no schema**.

**Interpretation headline — mastery is derived-on-read, never stored (measurement BR-4 / KN-9).** `knowledge_objects.
mastery_level` is an **override slot** (`NULL ⇒ derive`); `recordReview` appends an event and does **NOT** write
mastery. A read derives it via `resolveProgress(stored, derive)`. This is the "derive-not-store" house rule
(ADR-011:48 cites "knowledge KN-9/10 'tune the curve, not the number'"; SS-12 "analytics derived, never stored").
`[FACT: ADR-011 §3.2:48; measurement/current-business-rules.md BR-4; business-rules.md KN-9:47-50; schema/
knowledge.ts:57 mastery_level nullable no-default]`

**Interpretation headline — mastery axis ≠ scheduling axis.** SM-2 is the **review curve** driving `getDue`
(when to review next). **Mastery** is a separate measurement derived under the bound curve via the measurement
engine. `quality (0–5)` is an INPUT to both, **never** stored as `mastery_level (0–100)` — conflating them is the
Antigravity scale bug the decomposition flags. `[FACT: decomposition.md:69-71; REVIEW_CURVE_KIND=decay|review|test]`

**Interpretation catch — engine-generic vs knowledge-specific split.** `recordReview`/`getDue`/`deriveMastery`
operate on the generic `review_events`+bindings keyed by a generic `object_id` → they live in the **engine**
(`foundation/review`, extending `createReviewEngine`). `rollupMastery` walks `knowledge_objects.parent_object_id`
(a Knowledge-owned table the generic engine must not know) → it lives in the **knowledge service**, composing
`review.deriveMastery` + `measurement.rollup`. `[FACT: decomposition.md:66-74; D1 (engine=generic, cross-consumed);
structure-data.md:35 parent_object_id]`

## §2. Business rules (S4-scoped, cited)
- **BR-S4-1 — `recordReview` appends an immutable event; mastery is NOT written.** `recordReview({objectId,
  methodId, quality?})` → one `review_events` row (`reviewed_at` = now-ms; `quality` nullable per signal). No
  `mastery_level` write (derive-on-read, BR-S4-3). `review_events` has no `deleted_at` (append-only ledger).
  `[FACT: contract.md:33-35; schema knowledge-review.ts:48-62; decomposition.md:68]`
- **BR-S4-2 — `getDue(range,{level?})`/`dueIn` is the due-queue provider.** Iterates live `method_bindings`
  (optionally filtered by `level`=target_type), and for each bound target computes due-ness from its `review_events`
  + the bound **review** curve; returns the targets due within `range`. Read-only; the Scheduler + flashcards (SS-7)
  consume it. **M1.0 due rule (named):** a target is due if `now ≥ latestReviewedAt + (curve.params.interval_days ??
  DEFAULT_INTERVAL_DAYS) · DAY_MS`; an **unbound or never-reviewed** target ⇒ due now (surfaced explicitly, never a
  crash). Curve-accurate SM-2 interval progression = build-phase (ADR-011:76). `[FACT: contract.md:33;
  parts/knowledge.md:36 (KNO-21); flashcards/business-rules.md FC-9]`
- **BR-S4-3 — `deriveMastery(objectId)` is a pure derive-on-read at the leaf (the `derive()` itself).** COMPUTED from
  the object's `review_events` under the bound curve. **M1.0 reduction (named — this is the build-phase-resolvable
  `derive()` internal, ADR-011:76):** `measurement.normalize` is a SINGLE-value function, so reduce the object's
  events to ONE `NormalizeInput` = the **latest non-null `quality`** → `normalize({kind:'qualitative', rating:
  latestQuality, scaleMax: 5})` → `[0,1]`, bridged to 0–100 (BR-S4-5); **`null` when there is no non-null quality**
  (unmeasured — NEVER coerced to 0, `measurement/engine.ts:29-31`). Multi-event recency-weighting / decay curves =
  build-phase (ADR-011:76). `quality` is the normalize INPUT, never returned as mastery (the Antigravity conflation).
  The engine is **generic** → it derives from `review_events` only; it does **NOT** read `knowledge_objects.
  mastery_level`. **The override slot** (`mastery_level` set ⇒ `resolveProgress` returns it, `NULL ⇒ derive`,
  ADR-011 §3.2) is honored at the read point where mastery becomes writable — **inert in M1.0** (no mastery write
  path: S1 blocks the user, the column stays null), so it is documented-not-dead, not built here (YAGNI).
  `[FACT: business-rules.md KN-9:47-50; conventions.md:9-10; ADR-011 §3.2:48 (override slot); measurement/
  engine.ts:14-33 (normalize modes); schema/knowledge.ts:57 (mastery_level nullable no-default)]`
- **BR-S4-4 — `rollupMastery(objectId)` rolls UP the `parent_object_id` spine via `measurement.rollup`.** A node's
  mastery = `rollup(children.map(deriveMastery|rollup))` (weighted; excludes null-progress children — an unmeasured
  child can't drag a parent down, measurement engine.ts:41-44). Walks `kind → Topic → Unit → Subject` within the
  object tree; the Subject→Education mapping is S5 (`getMasterySource`), not S4. The recursion carries a **visited-set
  backstop** (NIT-B): S1 guards `parent_object_id` acyclicity at CREATE-time only, so a corrupted/synced row must not
  infinite-loop the walk. `[FACT: decomposition.md:72-74; structure-data.md:29-31; measurement/engine.ts rollup:38-53;
  business-rules.md KN-9:47-50, KN-3:22-25]`
- **BR-S4-5 — Scale bridge 0–100 ↔ [0,1].** The measurement engine works in `[0,1]`; `mastery_level` is INTEGER
  0–100 (`conventions.md:31`). One localized bridge: `deriveMastery` returns the 0–100 read value (round(×100));
  the engine composition stays in `[0,1]` internally. `[FACT: conventions.md:31; measurement/engine.ts clamp01]`
- **BR-S4-6 — No new injected dep; measurement composed by import — S4 is the FIRST service consumer.** The pure
  `normalize`/`rollup`/`resolveProgress` are imported from `foundation/measurement` (stateless free functions). The
  precedent is NARROW: `services/gamification/service.ts:20` imports `assertAcyclic` (import-not-inject) — but **no
  service composes `rollup`/`resolveProgress`/`normalize` yet**, so S4 is the first consumer
  ([[first-runtime-consumer-surfaces-latent-barrel-defects]]); the Verification Gate must therefore exercise the
  composition + the `[0,1]↔0-100` bridge LIVE, not just typecheck. The measurement source-REGISTRY (`query`/
  `advertise`) is the S5 seam, NOT S4. `[FACT: services/gamification/service.ts:20 (assertAcyclic import only);
  measurement/index.ts; decomposition.md:73 "import the free functions"]`
- **BR-S4-7 — Soft-delete / append-only respected.** Reads over `method_bindings`/`knowledge_objects` hand-append
  `isNull(deleted_at)` (findWhere skips it); `review_events` is append-only (no soft-delete). `encryptedFields:[]`
  M1.0. `[FACT: [[repository-findwhere-skips-softdelete-filter]]; schema knowledge-review.ts:56]`

## §3. Scope

### In scope
1. **`foundation/review` engine — new generic verbs (`engine.ts` + `types.ts` + barrel):**
   - `recordReview({objectId, methodId, quality?})` → `eventsRepo.create(...)` (new `review_events` repo; `reviewed_at`
     = `Date.now()`); returns the `ReviewEvent`.
   - `getDue(range, {level?})` / `dueIn(...)` → iterate bindings (+optional `target_type` filter), compute due from
     each target's events + bound review-curve; return the due targets. `range` = `{from, to}` (ms).
   - `deriveMastery(objectId)` → `resolveProgress(null, () => normalize(<review history>))` scaled to 0–100, `null`
     when no events. Reads the object's binding→curve (its own tables) + events. Generic on `object_id`.
   - New typed error(s) as needed (`ReviewEventInvalid`? only if a real failure path — else reuse). Input schemas
     `RecordReviewSchema` + a `DueRange` type in `validators/knowledge.ts`.
2. **`services/knowledge` — `rollupMastery` + delegation:**
   - `rollupMastery(objectId)` → load child objects (`objectsRepo.findWhere(eq(parent_object_id), isNull(deleted_at))`),
     recurse/derive each, `measurement.rollup(children)` → the node's derived 0–100 (or null). Guards the object
     (`KnowledgeObjectNotFoundError`).
   - Re-expose `recordReview`/`getDue`/`dueIn`/`deriveMastery` by bare method reference (engine delegation, S3 pattern).
3. **`@vida/types`** — no change (`ReviewEvent` exists; `getDue`/mastery return service-layer shapes). Confirm.

### Out of scope (homed later — NOT built in S4)
- **`getMasterySource(subjectRef)` → 3-signal Education source** (KNO-25) + Subject/container-level mapping = **S5**
  (the measurement source-registry `advertise`/`query` seam).
- **Non-linear decay/interval curve internals, the qualitative status-ladder, the DAG perf-envelope** = build-phase
  (ADR-011:76 / measurement CLAUDE.md "basic normalization only"). M1.0 ships the basic engine composition.
- **Event fan-out** (`review.recorded`/`mastery.changed` → Gamification/Journal/Education) = **S8**. `recordReview`
  appends only; it does not emit in S4.
- **Flashcards `recordReview` emission / `review_session` run** (FC-06) = **S7**.
- Any schema/migration; any `mastery_level` write (derive-on-read only); any SM-2 state column (none exists — the
  event log is the source of truth, replayed on read).

## §4. Acceptance
- [ ] `recordReview` appends a `review_events` row (`reviewed_at` set, `quality` stored) and writes **no**
      `mastery_level`; the append is co-transactional (sync_queue enqueue on `review_events`).
- [ ] `getDue({from,to})` returns targets whose next-review (from events + bound curve) falls in range; `{level:'topic'}`
      filters by `target_type`; an unbound/never-reviewed target's due-ness is handled explicitly (not a crash).
- [ ] `deriveMastery(objectId)`: **null-boundary pinned** — no non-null `quality` ⇒ `null` (unmeasured, not 0); ≥1
      non-null `quality` ⇒ a 0–100 value (latest-non-null-quality reduction, M1.0); `quality` is the input, never
      returned as mastery.
- [ ] **First-consumer live check:** the `normalize`/`rollup`/`resolveProgress` composition + the `[0,1]↔0–100`
      bridge run against the real engine in the live-store gate (S4 = first service consumer — latent-defect surface).
- [ ] `rollupMastery(objectId)`: a parent with measured children returns `measurement.rollup` of them (weighted,
      nulls excluded); an all-null/childless node returns the leaf derive (or null); guards an unresolved object.
- [ ] No `mastery_level` write path exists anywhere in S4 (grep-clean); no new schema; `@vida/types` unchanged.
- [ ] Verification Gate: live-store (Node 24) — recordReview→deriveMastery round-trip (null→value), getDue window,
      rollup over a 3-level object tree (leaf→Topic→Unit), null-child exclusion, append-only (no deleted_at write).
      `@vida/core` typecheck 0, eslint 0, full suite green (no regression); S3 tests still green.

## §5. Implementation prompt (build order)
1. `validators/knowledge.ts`: `RecordReviewSchema` ({objectId, methodId, quality?}) + a `DueRange` shape.
2. `foundation/review/types.ts`: add `recordReview`/`getDue`/`dueIn`/`deriveMastery` to `ReviewEngine`; input types;
   `toReviewEvent` mapper needs (append-only, `_sync_status` cast).
3. `foundation/review/engine.ts`: `eventsRepo = createRepository(db, reviewEvents, {deviceId, encryptedFields:[]})`
   (NO `softDelete` — append-only, no `deleted_at` col); implement the three generic verbs; import `normalize` from
   `../measurement`. **`deriveMastery` reduction (M1.0):** pick the latest non-null-`quality` event → `normalize({kind:
   'qualitative', rating, scaleMax:5})` → `[0,1]` → round×100; `null` if no non-null quality. **`getDue`:** `now ≥
   latestReviewedAt + (curve.params.interval_days ?? DEFAULT_INTERVAL_DAYS)·DAY_MS`; unbound/never-reviewed ⇒ due now.
   Bridge `[0,1]↔0–100` in one localized helper.
4. `services/knowledge/types.ts` + `service.ts`: add `rollupMastery` (walk `parent_object_id` with a **visited-set**,
   compose `review.deriveMastery` + `measurement.rollup` imported from `../../foundation/measurement`); delegate the 3
   engine verbs by bare reference; extend the factory return.
5. Tests: extend `foundation/review/__tests__/engine.test.ts` (record/getDue/deriveMastery, live-store) + a
   `rollupMastery` tree test in `services/knowledge/__tests__/service.test.ts`. Node 24.
6. §XXIX: promote to `current-{spec,business-rules}.md` (BR-KN-S4-*); refresh `foundation/review/CLAUDE.md`.

## §6. /adr-check
- **ADR-011 (measurability):** ✅ mastery = derive-on-read via `normalize`/`rollup`/`resolveProgress`; `mastery_level`
  is a nullable override slot; non-linear internals left to build-phase (§3.8/:76). No source-registry use (S5).
- **ADR-005 (review engine):** ✅ emit→derive; the engine owns scheduling/review-log/mastery; SM-2 = one review curve.
- **ADR-002 (no-FK, derive-not-store):** ✅ no FK; no stored mastery counter; `review_events` append-only.
- **No new ADR:** S4 realizes ADR-005 + ADR-011 as already decided; the engine-vs-service split is grounded above.
  (The earlier impulse to author an ADR for a "mastery formula" was a drift — there is no formula to decide; the
  engine + curve params own it, internals build-phase.)

## Deviations ledger
- **Pre-gate correction (drift caught by Victor):** an initial read framed the mastery 0–100 mapping as an open
  design decision needing intent + an ADR. That was wrong — the docs resolve it: mastery is derived-on-read via
  `foundation/measurement`, curve-parameterized ("tune the curve, not the number" — KN-9, cited by ADR-011:48),
  internals build-phase (ADR-011:76). This PLAN is re-grounded on that model. No Victor decision required.
- **Gate-1 (independent critic) verdict REVISE → 3 folds + 3 NITs applied; core re-grounding VERIFIED correct
  (no residual invention, no over-correction).**
  - **F1** — `measurement.normalize` is single-value, not array; "normalize over the review history" was an
    unnamed placeholder. Named the M1.0 reduction (latest non-null quality → qualitative scaleMax 5; null when none);
    multi-event weighting stays build-phase (BR-S4-3, §5.3, §4).
  - **F2** — provenance fix: "tune the curve, not the number" originates in KN-9 (`business-rules.md:47-50`);
    ADR-011:48 cites it + owns the override-slot mechanism (correction note, BR-S4-3).
  - **F3** — narrowed the gamification precedent to import-not-inject (`assertAcyclic` only); S4 is the FIRST service
    consumer of `rollup`/`resolveProgress`/`normalize` → live-gate the composition + bridge (BR-S4-6, §4).
  - **NIT-A** — named the M1.0 due rule (BR-S4-2, §5.3). **NIT-B** — visited-set backstop in the rollup walk
    (BR-S4-4, §5.4). **NIT-C** — `deriveMastery` = pure derive (engine can't read `mastery_level`); override slot
    inert-not-dead in M1.0 (BR-S4-3).
- _(preflight + gate-2 folds appended before Approval 2.)_
