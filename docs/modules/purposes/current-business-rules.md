# Purposes & Goals — Current Business Rules (as-built)

> §XXIX living doc — the enforced invariants of `createPurposesService`, kept current with the code. Promoted from
> each slice's IMPLEMENTATION-PLAN. Derived from the PG-1..PG-20 corpus invariants + ADR-011. **As of: S7.**

## S1 — Spine CRUD + DB-11 reconcile

- **BR-PG-S1-1** — The spine joints are optional: `targets.purpose_id` and `purposes.value_id` are nullable, no FK
  (SR-003 relaxed, PG-9). A standalone target (no purpose) and a standalone purpose (no value) are valid.
- **BR-PG-S1-2** — `purposes.progress` and `targets.current_value` are **override slots**: an omitted value persists
  `NULL` (⇒ derive on read, PG-4), **never coerced to `0`**. An explicit numeric value is the user's override.
- **BR-PG-S1-3** — NN-default columns are backfilled in the create input (create echoes the input row, not SQL
  defaults): purposes `status='in_progress'`/`is_primary=false`/`sort_order=0`; targets
  `measurement_kind='quantitative'`/`status='not_started'`/`priority='medium'`/`sort_order=0`; values `sort_order=0`.
- **BR-PG-S1-4** — `targets.measurement_kind` is the SOLID/ABSTRACT discriminator (replaces the retired v1
  `target_type`); it is NN with default `'quantitative'`. `binding_mode` is nullable (NULL ⇒ derive, ADR-011 M2).
- **BR-PG-S1-5** — `review_frequency` is nullable; the schema `DEFAULT 'weekly'` never applies under the create-echo
  write path (every key is in the INSERT), so an omitted value persists `NULL`.
- **BR-PG-S1-6** — Archive = **soft delete** (`deleted_at`) on all 3 spine tables; `getX` returns `null` for a
  soft-deleted row and `listX` excludes it. History is preserved (PG-19). Cross-entity deletion propagation
  (purpose→target SET NULL; cascades) is **homed to S9**.
- **BR-PG-S1-7** — `listTargets(purposeId?)` returns active targets; `undefined` ⇒ all active, a value ⇒ scoped to
  that purpose (JS-filtered over `findAll()`, which applies the soft-delete filter — the `findWhere`-skip trap is avoided).
- **BR-PG-S1-8** — Update is async and rejects an unknown id with the typed `*NotFoundError`; an empty patch returns
  the existing row unchanged (no wasted `updated_at`/sync bump); an explicit `null` in a patch clears the column
  (distinguished from an omitted key by `stripUndefined`).
- **BR-PG-S1-9** — M1.0 encryption seam: all repos use `encryptedFields: []` (the `[E]` title/description/vision/why/
  name/unit/success_criteria fields pass through; real field-level encryption is M3).
- **BR-PG-S1-10** — DB-11 @vida/types reconcile (mirror-only): the retired symbols (`BucketListItem`,
  `PurposeHabit`/`PurposeRoutine`/`PurposeProject`, `TARGET_TYPE`/`TargetType`/`TargetTypeSchema`) have zero live
  consumers; `contributions` (weighted polymorphic edge) supersedes the three bare junctions, and `dreams` absorbs
  `bucket_list_items`. The service returns Row types; the interfaces are the mirror (not consumed at M1).

## S2 — Dreams (single aspiration; absorbs bucket_list_items, PG-16)

- **BR-PG-S2-1** — `dreams` is the single aspiration entity (the retired `bucket_list_items` collapsed in): one
  table carries category/status/priority/imagery/steps/location/progress/target/project — no separate bucket-list
  table. "Bucket List" is a Space over `dreams` (a tag + Gallery view), not service machinery.
- **BR-PG-S2-2** — `dreams.steps` is a plain TEXT column holding a JSON string (`[{id,text,completed}]`), **never
  `json<T>()`** — the service `JSON.stringify`s on write; the Row read returns the raw string (the consumer parses).
  Update distinguishes an omitted `steps` (untouched) from an explicit `null` (clear) from a value (reserialize).
- **BR-PG-S2-3** — Backfills: `status='dream'`, `priority='medium'` (NN defaults). `category` is nullable — its DB
  `DEFAULT 'other'` never fires under create-echo, so an omit persists `NULL` (the S1 `review_frequency` family).
- **BR-PG-S2-4** — `dreams.progress_percentage` is a nullable **override slot** (⇒ derive, PG-4), never `0`; no
  `measurement_kind` on dreams (the widen list omits it — a dream's progress is an override or a rollup, S5).
- **BR-PG-S2-5** — `estimated_cost` is INTEGER cents; `dreams` has `deleted_at` → soft delete; `listDreams(purposeId?)`
  scopes active dreams by purpose (JS-filter over `findAll()`); `DreamNotFoundError` on an unknown id.

## S3 — Metrics + value ledger (PG-15)

- **BR-PG-S3-1** — `purpose_metrics` and `purpose_metric_values` carry **no `deleted_at`** → `softDelete:false` (every
  delete is hard). `createMetric` backfills `calculation_method='latest'` (NN default); `is_higher_better`/`baseline_value`
  nullable (PG-15 direction).
- **BR-PG-S3-2** — `getMetricCurrent` resolves a metric's current value **derive-by-default** (PG-4/PG-17): the
  `current_value` override slot wins when non-null (`override:true, source:'manual'`); otherwise it derives from the
  value ledger via `calculation_method` (`sum`/`average`/`latest`/`max`/`min`/`count`). An **empty ledger ⇒ `value:null`
  (unmeasured), never `0`**.
- **BR-PG-S3-3** — Derived provenance: `source='manual'` iff **every contributing ledger point** is manual, else
  `'auto'`. For `'latest'` the contributing set is the single most-recent point (greatest `recorded_at`, tie → later
  `created_at`); for the aggregates it is all the metric's points.
- **BR-PG-S3-4** — `recordMetricValue(metricId, value, {source?, context_notes?, recorded_at?})` appends a hard ledger
  row; it rejects an unknown `metricId` with `MetricNotFoundError`. `source` backfills `'manual'`; `recorded_at` defaults
  to now (Unix ms) when omitted.
- **BR-PG-S3-5** — `deleteMetric` is a **two-hop app-layer cascade** (no FK, PG-19 locally): it hard-deletes the
  metric's `purpose_metric_values` ledger rows first (found by `metric_id`), then the metric — no orphaned points.

## S4 — Contributions edge (weighted polymorphic goal-edge, PG-10)

- **BR-PG-S4-1** — `linkContribution(goal, contributor, {weight, notes?})` creates a `contributions` row holding the
  **weight ONLY** (`contribution_percentage`, 0–100) — **never a copied progress value** (PG-10). The contributor's
  live progress is read through a measure at rollup time (S5), never stored here.
- **BR-PG-S4-2** — Two-sided `InvalidContributor` guard: BOTH ends must be in vocabulary — `goal.type` ∈
  `CONTRIBUTION_GOAL_TYPE` (`purpose`|`target`) AND `contributor.type` ∈ `CONTRIBUTION_CONTRIBUTOR_TYPE`
  (`habit`|`routine`|`project`|`task`|`dream`|`finance_target`|`check_in`). An out-of-vocabulary ref is a **typed
  domain error** (`InvalidContributor`), not a ZodError.
- **BR-PG-S4-3** — `contributions` carries `deleted_at` → `softDelete:true`; `unlinkContribution` soft-deletes;
  `listContributions(goal)` reads the active edges for a goal via `findWhere` with an **explicit** `isNull(deleted_at)`
  (findWhere skips the soft-delete filter). `reweightContribution` updates only the weight. `ContributionNotFoundError`
  on an unknown id.

## S5 — Measurability core (derive-on-read; composes foundation/measurement)

- **BR-PG-S5-1** — `progress(entity)` is the LEAF. A **target** leaf = `normalize()` by `measurement_kind`:
  `quantitative` ⇒ `clamp(current_value/target_value)` with **baseline 0, higher-better** (the schema split — targets
  carry no baseline/direction column, those live on metrics; null current/target ⇒ unmeasured); `milestone` ⇒
  `status==='completed' ? 1 : 0`; `rate` ⇒ `clamp(current_value)` (null ⇒ unmeasured); `qualitative` ⇒ **null**
  (no rating/scale column on targets ⇒ unmeasured at M1, **never 0**, PG-3). A **dream** leaf = its
  `progress_percentage` override slot or null (no `measurement_kind` ⇒ no derive).
- **BR-PG-S5-2** — All rollup/normalize math is in **[0,1]** (the engine's unit); the stored/override columns
  (`purposes.progress`, `dreams.progress_percentage`, 0–100) are converted only at the `PurposeProgressView` edge
  (`toPct` out / `fromPct` when a child view feeds a parent rollup). `measurementSources.query` returns [0,1] directly.
- **BR-PG-S5-3** — `computeProgress(purpose)` = the `purposes.progress` override (0–100, `derived:false`) when set;
  else a **two-channel** rollup (build-phase resolution, ADR-011 §3.8 — the docs don't fix cross-channel mixing):
  **Channel A** = in-module LEAVES (spine-targets via `purpose_id` each `computeProgress(target)` + `purpose_metrics`
  each `metricLeaf01`), equal-weight peers; **Channel B** = direct CONTRIBUTIONS, weighted by `contribution_percentage`.
  Each channel rolls up on its own scale, then the two channel-results combine **equal-weight**. This keeps
  `contribution_percentage` meaningful *within* B and stops a weight-1 in-module leaf drowning under a weight-60
  contribution. Targets + metrics feed a purpose via the direct `purpose_id` channel (PG-5 "contributor→target→purpose";
  `target`/`purpose_metric` ∉ contributor vocabulary, so never via contributions). A `purpose_metric` leaf is
  **direction-aware** (it carries `baseline_value` + `is_higher_better`, unlike a target), reading its current value
  via `getMetricCurrent`. `partial` reflects the raw leaves (a channel that excluded a null child), not the two channels.
- **BR-PG-S5-4** — `computeProgress(target)` = its **leaf** (measurement override) when measured; else the `rollup` of
  **its contributions**. Leaf/override wins over contributions (PG-4). A target never contributes to a target → no cycle.
- **BR-PG-S5-5** — Unmeasured children (null progress) are **excluded** from a rollup (the engine drops null-progress
  children) so an un-rated goal never drags a parent to 0 (PG-3); `partial:true` flags that some child was excluded.
  An all-unmeasured / empty set ⇒ `value:null, unmeasured:true` (never 0).
- **BR-PG-S5-6** — A **dream** contributor resolves in-module (its override slot); a **cross-module** contributor
  (`habit`/`routine`/`project`/`task`/`finance_target`/`check_in`) resolves through the deny-safe `measurementSources`
  seam keyed `${contributor_type}:${contributor_id}` — **empty at M1 ⇒ null (unmeasured, excluded)**; real sources are
  advertised by their modules at M2 (zero-signature swap). A deleted dream contributor degrades to null, never throws.
- **BR-PG-S5-7** — The mixed-weight math is **delegated to the built `rollup` engine** (`weight == null || 0 ⇒ 1`,
  `engine.ts:48`) — composed, never reinterpreted. `progress`/`computeProgress` reject an unknown id with the typed
  `*NotFoundError`.

## S6 — Bindings + DAG guard + derived-pull

- **BR-PG-S6-1** — `bind(target, { binding_mode, ref? })` declares a target's `binding_mode` (ADR-011 §3.5).
  A non-manual mode (`derived-pull`/`event-trigger`) **requires** a `ref` (ZodError otherwise) and records it as the
  target's **`measurement_method`** = `${ref.type}:${ref.id}` (the PG-11/PG-15 restored column is the binding
  source key — structure-data.md "binding_mode (+ ref)"; no dedicated column, ADR-011 §3.7 leaves storage to
  build-phase). `manual` clears both (`binding_mode='manual'`, `measurement_method=null`). A missing target →
  `TargetNotFoundError`. Returns the updated `TargetRow`.
- **BR-PG-S6-2** — **Bindings are acyclic (PG-8, ADR-011 §3.7), rejected at author time.** Before persisting a
  non-manual binding, the service composes the built `assertAcyclic` (`engine.ts:65`) over the **binding graph**:
  every OTHER non-manual bound target's edge (reconstructed `source=parse(measurement_method) → target`) + the
  proposed edge (`source=ref → target` — the source feeds the measurable in BOTH modes). A cycle (2-node or any
  N-node chain accumulated across calls) throws `CyclicBinding` (wrapping the engine's `MeasurementCycle`) and does
  **not** save. `contributions` are **not** in this graph — the contributor vocabulary excludes `target`/`purpose`,
  so a contribution can never be an outgoing edge from a binding node and cannot close a binding cycle (seam-contract
  §3 = binding edges only). Re-binding a target **replaces** its own edge (self excluded), so a legitimate re-bind or
  linear chain is never a false positive.
- **BR-PG-S6-3** — **`derived-pull` reads the measurement-source seam (§3.6), overriding the stored value.** A
  `binding_mode==='derived-pull'` target's leaf resolves via `measurementSources?.query(measurement_method)` **before**
  the `measurement_kind` switch — so it overrides any stored `current_value` (PG-6). The seam returns a [0,1] fraction
  directly (BR-PG-S5-2). **Empty registry at M1 ⇒ `null`** (honest unmeasured, never coerced to `0` — PG-3); real
  sources advertised by Finance/Habits/Health **at M2** (zero-signature swap). A derived-pull leaf feeds `progress`
  AND the `computeProgress` rollup identically.
- **BR-PG-S6-4** — **`SourceUnavailable` is record-not-throw (PG-6):** a source outage degrades the measurable to
  `null` (last-known + flag, never fabricated). At M1 `query()` cannot distinguish "unadvertised" from "outage" (both
  ⇒ `null`), so the error type is a **dormant seam** — defined now for a zero-signature M2 swap when real sources add
  the outage mechanism (`source-registry.ts:8`, runtime-deferred).
- **BR-PG-S6-5** — **`measurement_method` is bind-managed on a non-manual target.** Because it doubles as the binding
  source ref, `createTarget`/`updateTarget` **reject** a direct write to `measurement_method` while a binding is live
  (`BindingRefManaged`) — this prevents silent ref corruption AND a smuggled ref bypassing the S6-2 DAG guard. On a
  `manual`/unbound target it stays free "how it is measured" text (its PG-11 role). Clear the binding (`bind → manual`)
  to free the column.
- **BR-PG-S6-6** — The `event-trigger` **write** path is **dormant at M1** (emit-only; the ref persists but no rail
  write fires) — the live INT-2 rail write is M2 (`effects?` port, interpretation §E). S6 ships the descriptor + the
  ref + the DAG guard; the firing is deferred.

## S7 — Reviews + plan_steps + the `sessions` port

- **BR-PG-S7-1** — **`sessions: { registry; service }` is a REQUIRED dep** (not deny-safe). PG-13 is a corpus FACT —
  reviews fire as `review` SESSIONS (ADR-004), and mod-sessions is built, so the FACT is wired at M1 (g1 #1/#2;
  interpretation F-2). Two handles are bundled: `registry.register` persists the sub-type, `service.createSession`
  writes the session row (`createSession` lives on SessionsService, not SessionRegistry).
- **BR-PG-S7-2** — **`openTargetReview`** records the `target_reviews` ledger (progress_rating 1-10 · reflection ·
  next_actions · reviewed_at; `softDelete:false` — the ledger has **no `deleted_at`**, create omits it), then (a)
  registers the `review` sub-type idempotently, (b) **computes `next_review_date`** from the target's
  `review_frequency` and updates the target, (c) fires a scheduled `review` session. A missing target →
  `TargetNotFoundError` **before any write**.
- **BR-PG-S7-3** — **`openPurposeReview`** records the `purpose_reviews` alignment/fulfillment ledger (PG-12 —
  `still_aligned` REQUIRED · alignment_notes · overall_progress · key_achievements · obstacles_faced ·
  adjustments_needed · renewed_commitment · fulfillment_rating · clarity_rating · reviewed_at; `softDelete:true`),
  registers `review`, fires a scheduled `review` session. **No `next_review_date`** — purposes carry no
  `review_frequency` column (the schema asymmetry). `PurposeNotFoundError` before any write.
- **BR-PG-S7-4** — **The `review` sub-type def** is the seam-contract transcription (`owner_module:'purposes'`,
  `effects:[]`, `lifecycle:{scheduled→completed}`, `permissions:{allowed_effects:[]}` — empty ⊆ shipped envelope,
  BR-4; `default_purpose:'review'`). `review` is a **SHARED canonical `SessionSubType`** (flashcards also registers
  it with a different `owner_module`/lifecycle); the registry is **first-wins/idempotent keyed by `sub_type`**, so
  `registerReview` catches `DuplicateSubType` → no-op. `createSession` enforces sub-type **presence** only
  (`registry.get`), never the lifecycle — so the cross-module def divergence is **inert at M1** (purposes only
  creates `scheduled` rows, drives no transition; the live transition engine is M2).
- **BR-PG-S7-5** — **The review session is `status:'scheduled'`, `scheduling_mode:'planned'`**, no extension
  (review ∉ focus/study), no attach (the seam-contract is register + createSession; the target linkage is the ledger
  `target_id` + `next_review_date` that dueIn reads at S9). The live **Scheduler firing/completion is the only M2
  piece** (interpretation §E); at M1 one scheduled session is created per `openReview` (dedup/completion is the M2
  scheduler — an accepted M1 simplification).
- **BR-PG-S7-6** — **`next_review_date` = the UTC anchor date (from `reviewed_at` ms) + one `review_frequency`
  step**, via an inline helper (**no date-fns** — the finance `addSteps` precedent): day-based (daily/weekly/
  biweekly) add days; month-based (monthly/quarterly/yearly) add months and **clamp the day** to the target month's
  last day (Jan 31 +1mo → Feb 28, never a rollover). A NULL `review_frequency` leaves `next_review_date` unchanged.
- **BR-PG-S7-7** — **`plan_steps` is a doc checklist (PG-11), not a tracked entity.** `addPlanStep(owner:{task|
  target}, …)` appends (`is_completed:false`); `togglePlanStep` flips completion and **stamps/clears `completed_at`**
  in sync; `listPlanSteps(owner)` returns active steps (`findWhere` + explicit `isNull(deleted_at)`, since findWhere
  skips the soft-delete filter). A toggle on a missing id → `PlanStepNotFoundError`.

## S8 — tags · links · pages (compose SpacesService + NotesService)

- **BR-PG-S8-1** — **All tag/link/page writes delegate THROUGH the composed `spaces`/`notes` services — the module
  never touches `entity_tags`/`entity_links`/`pages` directly** (the read/write split, SP1/SP4). `tagEntity`/
  `untagEntity`/`linkEntity`/`unlinkEntity` are thin SCOPED wrappers over `spaces.tagEntity`/`untagEntity`/
  `createLink`/`removeLink` (arg-reordered to spaces' `(tagId, entityType, entityId)` / `(pageId, entityType,
  entityId, context)`); each delegated write is idempotent (resolve-then-revive / resolve-then-soft-delete, BR-14/15).
- **BR-PG-S8-2** — **No `registry` dep (write-only slice).** `spaces`/`notes` self-validate `entity_type` against the
  taggable-type registry they are constructed with (`spaces.assertRegistered`; `notes.createPage` validates too). The
  purposes entity_types (`value`/`purpose`/`target`/`dream`/`purpose_metric_value`) are **already seeded** in the
  shared `ENTITY_TYPES` (`_registry.ts:13,50-53`, DB-4) → no `register()` call, no per-layer registry. The
  seam-contract's "registry REQUIRED" line is superseded here (write-only; if S9 adds an association-READ lane it pulls
  `registry` first-consumer). An unregistered type passed to a wrapper surfaces `spaces`' `UnknownEntityType` (BR-2) —
  the write-through preserves validation, proven by test.
- **BR-PG-S8-3** — **Two typed entity-type unions, grounded in PG-18.** `PurposeTagLinkType =
  value|purpose|target|dream|purpose_metric_value` governs tag/link (the full PG-18 target set, incl. the
  `purpose_metric_value` ledger row). `PurposeNoteType = value|purpose|target|dream` governs `ensureEntityNote` — a
  `purpose_metric_value` ledger row has **no title**, so it is a tag/link target only, never a standalone-note subject.
- **BR-PG-S8-4** — **`ensureEntityNote` find-or-creates a TITLED standalone note** (`type:'note'`, **no new
  PAGE_TYPE**). It uses `notes.getPagesForEntity` + `notes.createPage` (NOT `notes.ensureEntityNote`, which seeds the
  `content` column not `title` — `notes/service.ts:171-175`); the title seed is the owned entity's own `title` (`name`
  for `value`), a client-side read of OWNED data (in-contract, not cross-module). Idempotent: a second call returns the
  SAME page (find-first by `type:'note'` + entity), never a duplicate. Guards the owner exists with its own
  `*NotFoundError` (`ValueNotFoundError`/`PurposeNotFoundError`/`TargetNotFoundError`/`DreamNotFoundError`) — the
  projects `getProjectPage` guard precedent.
- **BR-PG-S8-5** — **Standalone general notes beyond the owned find-or-create are the FE's to manage** via
  `NotesService` directly (the entity_types are registered). The Bucket List **Space** over `dreams`, the vision-board/
  Gallery view, and the neural graph are **② `fe-purposes`/Spaces-view** concerns (`contract.md:40-41`), not ① S8; the
  Journal/due aggregation is S9.

## S9 — provider (Journal summary + DueProvider) + emit-only fan-out + PG-19 deletion (the ① closer)

- **BR-PG-S9-1** — **Purposes registers as a PROVIDER (PG-14), naming no consumer.** `registerPurposesJournal(registry,
  svc)` registers a `summary(date)` `JournalContribution` (`sectionKey:'summary'`); `registerPurposesDueProvider(sessions,
  svc)` registers a `DueProvider` into the sessions SS-7 lane. Both registry handles are PARAMS to the standalone
  helpers (`journal.ts`), NOT service deps — the projects precedent; avoids an unused `journal` dep (the S8 registry-drop
  parallel). The summary is PULL (the Journals registry calls it at render, ADR-004 §3.2.5), never a rail push.
- **BR-PG-S9-2** — **`getDayPurposesDigest(date) = {activePurposes, reviewsDue}` is COUNTS only.** `activePurposes` =
  live purposes whose `status` ∉ `{completed, cancelled}`; `reviewsDue` = targets with `next_review_date == date`. "What
  changed" deltas come from **Journal snapshots**, never a stored propagation (PG-14, `business-rules.md:48`). `summary`
  state = `success` iff `activePurposes + reviewsDue > 0`, else `empty`; reuses the `TerminalState` canon BY TYPE.
- **BR-PG-S9-3** — **`dueIn(range)` surfaces TARGET reviews only, as canonical `DueItem`s.** Targets whose
  `next_review_date` (a `YYYY-MM-DD`) parsed at **UTC-midnight** falls in `[range.start, range.end]` (Unix ms, both ends
  inclusive). Purposes carry no `next_review_date` column → purpose-level reviews are not surfaced (schema-forced, not a
  choice). `est_minutes = 15` (documented default — no review-duration field); **`urgency = 0`** (the ranking algorithm
  is deferred to M1.2 platform-wide, `sessions/service.ts:705`; `hard_deadline` carries the proximity signal).
- **BR-PG-S9-4** — **Completion fan-out is EMIT-ONLY + dormant at M1 (C-E2).** `updateTarget`/`updatePurpose` fire
  `emit_measurement_signal` (ONLY — never `award_xp`/`grant_currency`; gamification's rule turns the signal into XP) on a
  status→`completed` **transition** (`existing.status !== 'completed' && patch.status === 'completed'`), keyed by the
  entity id (transition `target.completed`/`purpose.completed`). `if (!effects) return` (no rail wired ⇒ no-op);
  `registry.resolve` skip-if-no-handler (avoids `NoEffectHandler` on the keyed type); post-commit try/catch
  failure-isolated (the completion stands, PG-14). Re-saving an already-completed entity does NOT re-fire.
- **BR-PG-S9-5** — **PG-19 deletion is app-layer (no FK), composite-keyed, and respects optionality.** `archivePurpose`:
  child `targets.purpose_id` **SET NULL** (survive standalone, SR-003) — not cascade-deleted; soft-cascade `contributions`
  (both legs) + `purpose_reviews`; **hard** two-hop `purpose_metrics` → `purpose_metric_values` by **reusing S3
  `deleteMetric`**; then soft-delete. The surviving targets keep their own `target_reviews`. `archiveTarget`: soft-cascade
  `contributions` (both legs) + **hard**-cascade `target_reviews` (no `deleted_at`); soft-delete. `archiveValue`: **SET
  NULL** `purposes.value_id` on child purposes (survive); soft-delete. `archiveDream`: contributor-side `contributions`
  only (a dream is never a GOAL); soft-delete.
- **BR-PG-S9-6** — **`cascadeContributionsFor(type, id)` keys on the COMPOSITE `(type, id)` leg** — both
  `(goal_type, goal_id)` and `(contributor_type, contributor_id)` — because `goal_id`/`contributor_id` are polymorphic
  bare TEXT (an id alone could collide across types). Each sweep filters `isNull(deleted_at)` explicitly (findWhere
  skips the soft-delete filter) and dedups by id. Empty-leg queries are harmless: a `purpose`/`target` is a GOAL only
  (contributor-leg matches nothing); a `dream` is a CONTRIBUTOR only (goal-leg matches nothing) — vocab
  `CONTRIBUTION_GOAL_TYPE={purpose,target}` / `CONTRIBUTION_CONTRIBUTOR_TYPE={habit,routine,project,task,dream,finance_target,check_in}`.
