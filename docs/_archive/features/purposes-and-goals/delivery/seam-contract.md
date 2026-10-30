# mod-purposes-and-goals ① — Seam Contract

> Entity Delivery Flow (v1) front matter, Step 2. The precise service surface + composition seams the per-slice
> PLANs implement against. Signatures are the TARGET shape (ratified at each slice's §XXVI gate); return types are
> Drizzle **Row** types at M1 ([[drizzle-row-not-assignable-to-vida-types-interface]]), reconciled to @vida/types
> interfaces as DB-11 (S1). Grounded in `contract.md` + `interpretation.md`.

## Factory + deps

```ts
export function createPurposesService(deps: PurposesServiceDeps): PurposesService

export interface PurposesServiceDeps {
  db: DrizzleDb
  deviceId: string
  // REQUIRED from S8 — the entity_tags + entity_links WRITE surface (PG-18).
  spaces: SpacesService
  // REQUIRED from S8 — the `pages` surface for standalone notes (PG-18).
  notes: NotesService
  // ⊘ SUPERSEDED at S8 build — NOT a dep. S8 is write-ONLY (no association-read method on the surface), so
  //   registry validation lives INSIDE the composed spaces/notes services (each holds its own registry; spaces
  //   `assertRegistered`, notes `createPage` validates entity_type). `value`/`purpose`/`target`/`dream`/
  //   `purpose_metric_value` are already seeded in `_registry.ts:13,50-53` (DB-4) → no `register()`, no per-layer
  //   registry dep. (If S9 adds an association-READ lane like projects' resolver, it pulls `registry` first-consumer.)
  // registry: TaggableTypeRegistry   // ← dropped, see above
  // REQUIRED from S9 — Journal provider registration (summary(date)) + the DueProvider lane (dueIn).
  journal: JournalRegistry
  // REQUIRED from S7 — the ADR-004 session seam (honours PG-13 FACT: reviews fire as `review` SESSIONS).
  //   `registry.register` persists the `review` sub-type (SS-5 owning-module registration); `service.createSession`
  //   writes the session row. mod-sessions is built+Done → the FACT is wired at M1, not hedged (g1 finding 2).
  //   Two foundation handles bundled, mirroring `effects?: { rail; registry }` (g1 finding 1 — `createSession`
  //   lives on SessionsService `service.ts:119`, NOT SessionRegistry which has only register/get/list `registry.ts:44`).
  sessions: { registry: SessionRegistry; service: SessionsService }
  // Deny-safe from S5 — the ADR-011 §3.6 measurement-source READ seam (consumed first by the S5 rollup for
  //   cross-module contributors; also by S6 derived-pull). ABSENT/empty at M1 ⇒ every cross-module contributor +
  //   `derived-pull` resolves `null` (unmeasured, excluded from rollup) — honest M1, zero-signature swap at M2.
  measurementSources?: MeasurementSourceRegistry
  // Deny-safe from S9 — the AR-7 effect rail (emit-only producer). DORMANT at M1 ⇒ no-op.
  effects?: { rail: EffectRail; registry: EffectRegistry }
}
```

## Repositories (S1)

| Table                   | softDelete  | encryptedFields (M1.0) | Note                                  |
| ----------------------- | :---------: | :--------------------: | ------------------------------------- |
| `purposes`              |   `true`    |          `[]`          | has `deleted_at`                      |
| `targets`               |   `true`    |          `[]`          | has `deleted_at`                      |
| `dreams`                |   `true`    |          `[]`          | has `deleted_at`                      |
| `values`                |   `true`    |          `[]`          | has `deleted_at` (DB-3)               |
| `contributions`         |   `true`    |          `[]`          | has `deleted_at` (DB-3)               |
| `purpose_reviews`       |   `true`    |          `[]`          | has `deleted_at` (DB-3)               |
| `plan_steps`            |   `true`    |          `[]`          | has `deleted_at` (DB-3)               |
| `purpose_metrics`       | **`false`** |          `[]`          | **no `deleted_at`** `purposes.ts:106` |
| `purpose_metric_values` | **`false`** |          `[]`          | ledger, no `deleted_at` `:124`        |
| `target_reviews`        | **`false`** |          `[]`          | ledger, no `deleted_at` `:141`        |

## Service surface (by slice)

```ts
export interface PurposesService {
  // ---- S1: spine CRUD -------------------------------------------------------
  createValue(i): Promise<ValueRow>;   updateValue(id, p): Promise<ValueRow>;   archiveValue(id): Promise<void>
  createPurpose(i): Promise<PurposeRow>; updatePurpose(id, p): Promise<PurposeRow>; archivePurpose(id): Promise<void>
  createTarget(i): Promise<TargetRow>;  updateTarget(id, p): Promise<TargetRow>;  archiveTarget(id): Promise<void>
  getValue/getPurpose/getTarget(id): Promise<Row | null>
  listValues(): ...; listPurposes(): ...; listTargets(purposeId?): ...   // active only (explicit isNull(deleted_at))

  // ---- S2: dreams -----------------------------------------------------------
  createDream(i): Promise<DreamRow>; updateDream(id, p): Promise<DreamRow>; archiveDream(id): Promise<void>
  getDream(id); listDreams(purposeId?)

  // ---- S3: metrics + value ledger ------------------------------------------
  createMetric(i); updateMetric(id, p); getMetric(id); listMetrics(purposeId)
  deleteMetric(id): Promise<void>   // SHIPS M1 (g1 finding 7): purpose_metrics has no deleted_at → hardDelete;
                                    //   two-hop: also hard-delete its purpose_metric_values ledger (no-FK, app-cascade)
  recordMetricValue(metricId, value, { source, context_notes? }): Promise<PurposeMetricValueRow>
  getMetricCurrent(metricId): Promise<{ value: number | null; source }>   // calculation_method over the ledger

  // ---- S4: contributions edge ----------------------------------------------
  linkContribution(goal: {type,id}, contributor: {type,id}, { weight, notes? }): Promise<ContributionRow>
  //   throws InvalidContributor if goal.type ∉ CONTRIBUTION_GOAL_TYPE (purpose.ts:5) OR
  //   contributor.type ∉ CONTRIBUTION_CONTRIBUTOR_TYPE (purpose.ts:9-17) — TWO-sided guard (g1 finding 5, PG-10)
  unlinkContribution(id): Promise<void>
  reweightContribution(id, weight): Promise<ContributionRow>
  listContributions(goal: {type,id}): Promise<ContributionRow[]>

  // ---- S5: measurability core ----------------------------------------------
  progress(entity: {type:'target'|'dream', id}): Promise<ProgressView>       // leaf via normalize()
  computeProgress(goal: {type:'purpose'|'target', id}): Promise<ProgressView> // rollup over contributions + children

  // ---- S6: bindings ---------------------------------------------------------
  bind(target: {type,id}, { binding_mode, ref? }): Promise<TargetRow>        // throws CyclicBinding
  // derived-pull resolution is internal to progress()/computeProgress()

  // ---- S7: reviews + plan_steps --------------------------------------------
  openTargetReview(targetId, i): Promise<TargetReviewRow>
  openPurposeReview(purposeId, i): Promise<PurposeReviewRow>
  listTargetReviews(targetId); listPurposeReviews(purposeId)
  addPlanStep(owner: {type:'task'|'target', id}, i); togglePlanStep(id); listPlanSteps(owner)

  // ---- S9: provider (registered, not called by consumers) ------------------
  summary(date): Promise<SectionData>     // registered via journal.register — goals/targets/reviews-due + deltas
  dueIn(range): Promise<DueItem[]>        // the CANONICAL DueItem (services/sessions/types.ts:225); registered as a
                                          //   DueProvider.fetch lane (types.ts:235, SS-7) — g1 finding 8, no bespoke shape
}

export interface ProgressView { value: number | null; derived: boolean; partial: boolean; unmeasured?: boolean }
// DueItem / DueProvider are the shared platform contracts — imported from services/sessions/types.ts, NOT redefined.
```

## Composition seams (exact)

1. **Rollup (S5)** — `computeProgress(goal)`:
   - `listContributions(goal)` → for each, resolve the contributor's progress:
     - in-module contributor (`target`/`dream`) → `progress({type,id})` directly;
     - cross-module contributor (`habit`/`routine`/`project`/`task`/`finance_target`/`check_in`) → `measurementSources?.query(key)` (the deny-safe seam is **introduced + first-consumed at S5**, g1 finding 4; absent/empty ⇒ `null`, excluded from rollup — honest "unmeasured" at M1).
   - `rollup(children.map(c => ({ progress: c.progressFrac, weight: c.contribution_percentage })))` (`engine.ts:38`; null children excluded `engine.ts:44`).
   - `resolveProgress(stored, () => rolled)` — stored override slot wins when non-null (`engine.ts:56`).
   - `toPct()` boundary at the edge (0–100 store/override ↔ [0,1] engine), the Projects precedent (`projects/service.ts:457`).
2. **Leaf progress (S5)** — `progress({type:'target'})` → `normalize(NormalizeInput)` from the target's
   `measurement_kind`:
   - `quantitative` — **targets carry NO `baseline`/`is_higher_better` column** (those live on `purpose_metrics` only, `purposes.ts:119-120`; g1 finding 3). A target-leaf uses the schema-intended simple ratio: when BOTH `current_value` and `target_value` are set, `normalize({kind:'quantitative', current: current_value, baseline: 0, target: target_value, isHigherBetter: true})` → `clamp(current/target)`; **if `current_value` (or `target_value`) is NULL ⇒ `null` (unmeasured, NEVER `0`** — do not coerce `?? 0`, that would violate PG-3; g2 finding 4). **Direction-aware / baselined** quantitative measurement is modeled via a linked `purpose_metric` (S3), not target columns — the schema's deliberate split (rich measures = metrics; targets = simple goal value).
   - `milestone` — `done`/`n_done:n` (from status/linked deliverables); `rate` — the rate value; `qualitative` — `rating`/`scaleMax` → `null` when unset (never 0, `engine.ts:29`).
   - Dream leaf = override slot (`progress_percentage`) or `null` (dreams carry no `measurement_kind`).
3. **Bindings (S6)** — `bind` builds the `Binding[]` graph (both `derived-pull` + `event-trigger` edges) and calls
   `assertAcyclic` (`engine.ts:65`); a cycle throws `MeasurementCycle` → surfaced as `CyclicBinding`.
4. **Reviews (S7)** — persist the ledger row; **always** honour PG-13: `sessions.registry.register(reviewDef)`
   (idempotent — `review` sub-type, `owner_module:'purposes'`, `effects:[]`, `lifecycle:{transitions:[{from:'scheduled',to:'completed',event:'complete'}]}`, `permissions:{allowed_effects:[]}` — empty ⊆ shipped envelope, BR-4) once, then `sessions.service.createSession({sub_type:'review', …})`. The ledger + the session row both persist at M1; the live Scheduler firing is the only M2 piece.
5. **Tags/links/pages (S8)** — `spaces.tagEntity` / `entity_links` WRITE ([[spaces-junctions-split-read-write-tagentity-blind-inserts]]); `notes` for `pages`; `registry` adds `value`+`dream` entity_types.
6. **Provider + fan-out (S9)** — `journal.register('purposes', { summary })` + register a **`DueProvider`**
   (`services/sessions/types.ts:235`, `fetch(range): Promise<DueItem[]>`) into the shared due-work lane (SS-7),
   symmetric to the summary provider; emit-only `effects?` fan-out (dormant guard `if (!effects) return`,
   post-commit failure-isolated, the Projects S9 pattern `projects/service.ts:68`).

## Typed errors (contract.md:49-57)

| Error                                    | When                                                     | Throw vs record                                                                        |
| ---------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PurposeNotFound` / `TargetNotFound` / … | id miss on update/get                                    | throw (async, after findById)                                                          |
| `CyclicBinding`                          | `bind` would create a cycle                              | **throw** at author time (PG-8)                                                        |
| `InvalidContributor`                     | contribution to a non-pursuable / out-of-vocabulary type | **throw** (PG-10)                                                                      |
| `UnmeasuredQualitative`                  | qualitative with no scale/rating                         | **record** — surface `unmeasured:true`, never `0` (PG-3)                               |
| `SourceUnavailable`                      | `derived-pull` source outage                             | **record** — last-known + flag, never fabricated (PG-6)                                |
| `EffectApplyFailed`                      | `event-trigger` write fails                              | **record** — measurable unchanged + flagged; idempotent key guards double-apply (PG-7) |
| `ProviderEmitFailed`                     | `summary`/`dueIn` throws                                 | **isolate** — other providers + goal unaffected (PG-14)                                |

## DB-11 reconcile (S1)

Amend in `packages/types/src/project.ts` (interfaces colocated there `:120-264`), reconcile-and-extend in place
([[db4-types-may-be-colocated-grep-name-before-net-new]]): `Target.purpose_id`→nullable; `target_type`→
`measurement_kind` + add `binding_mode`/`success_criteria`/`measurement_method`; `PurposeMetric` += `is_higher_better`/
`baseline_value`; `PurposeMetricValue` += `source`/`context_notes`; `Purpose` += `value_id` + `progress`→nullable;
widen `Dream` (absorb BucketListItem) + retire `BucketListItem`; add `Value`/`PurposeReview`/`PlanStep`/`Contribution`;
retire `PurposeHabit`/`PurposeRoutine`/`PurposeProject` → `Contribution`. Interface-only (mirror); service returns Row types at M1.
