# mod-purposes-and-goals ① — Interpretation Layer

> Entity Delivery Flow (v1) front matter, Step 1. The cited bridge between the intent corpus
> (`docs/features/purposes-and-goals/{identity,business-rules,contract,structure-data,conventions}.md`) + the
> governing ADR-011, and the built substrate in `@vida/core`. Every claim is `[FACT: path:line]` /
> `[INTERP]` / `[UNKNOWN]` per the No-Guessing Principle. Consumed by `slice-map.md` + `seam-contract.md`.

**Unit:** `createPurposesService` — the ① backend service tier over DB-4 `019_purposes` (6 tables) + DB-3
`007_purpose` (4 substrate tables), composing the built `foundation/measurement` engine. M1.1.2 head `#55`,
LIF-136. The **measurability capstone** — the rollup apex that ladders every MEASURED module into Values →
Purposes → Targets.

---

## A. Dependencies (what the service COMPOSES — all built, verified on `main`)

| Dep | What it provides | Signature anchor | M1 posture |
|-----|------------------|------------------|------------|
| `foundation/measurement` engine | the ADR-011 contract, **pure, no tables** | `normalize(NormalizeInput)→number\|null` `engine.ts:14`; `rollup(children[])→number\|null` `engine.ts:38`; `resolveProgress(stored, derive)→number\|null` `engine.ts:56`; `assertAcyclic(Binding[])→void` throws `MeasurementCycle` `engine.ts:65` | **REQUIRED** — compose, never rebuild (`measurement/CLAUDE.md`: "contributions → MOD-purposes") |
| `MeasurementSourceRegistry` | the §3.6 derived-pull READ seam | `advertise(key, resolver)` · `query(key)→number\|null` · `has(key)` `source-registry.ts:13-19`; unadvertised key ⇒ `null` (never fabricated) `source-registry.ts:28` | **deny-safe optional** — ships EMPTY, first-consumer-pull; absent ⇒ `derived-pull` resolves `null` (the Projects precedent `projects/types.ts:33`) |
| DB-4 schema `019_purposes` | `purposes·targets·purpose_metrics·purpose_metric_values·target_reviews·dreams` | `schema/purposes.ts:52-188`, row types `:190-203` | REQUIRED (the owned tables) |
| DB-3 schema `007_purpose` | `values·contributions·purpose_reviews·plan_steps` | `schema/foundation/purpose.ts:22-94`, row types `:96-103` | REQUIRED (the Purpose-domain substrate, already built) |
| `Repository` (encrypting CRUD) | table-agnostic create/update/find/softDelete | `db/repository.ts`; `createRepository(db, table, {deviceId, softDelete, encryptedFields:[]})` `projects/service.ts:85` | REQUIRED; M1.0 `encryptedFields:[]` seam ([[m10-repos-use-empty-encryptedfields-seam]]) |
| `SpacesService` (entity_tags + entity_links WRITE) | scoped tags + reference links on purposes/targets/dreams | precedent `projects/service.ts` S6; `[[spaces-junctions-split-read-write-tagentity-blind-inserts]]` | REQUIRED from the tags/links slice (PG-18) |
| `NotesService` (`pages` surface) | standalone notes per Value/Purpose/Target/Dream | precedent `projects/service.ts` S6 (vision/mission pages, no new PAGE_TYPE) | REQUIRED from the pages slice (PG-18) |
| Journal registry | `summary(date)` provider + the `DueProvider.fetch` lane (`dueIn`, canonical `DueItem` `sessions/types.ts:225,235`) | `registerXJournal` precedent (gamification/knowledge/projects S9) | REQUIRED from the provider slice (PG-14) |
| Sessions seam `{registry, service}` | register the `review` sub-type (`registry.register`) + write the session row (`service.createSession`) | `SessionRegistry` `registry.ts:44` (register/get/list) + `SessionsService.createSession` `service.ts:119` — two handles (g1 #1); `[[adr-004-3.2-defines-all-session-subtype-dimensions]]` | **REQUIRED** — reviews fire as `review` SESSIONS (PG-13 FACT); mod-sessions built ⇒ wired at M1 (g1 #2) |
| AR-7 effect rail | `event-trigger` bindings + emit-only fan-out | `{rail, registry}` deny-safe; `projects/service.ts:68` post-commit failure-isolated pattern | **deny-safe optional** — emit-only producer, dormant at M1 |

## B. Needs (the service surface the contract requires)

From `contract.md:10-28` the `PurposeService` must expose:
1. **Spine CRUD** — `createValue/Purpose/Target` + `update` + `archive(soft-delete)`; a target declares
   `measurement_kind` (+ optional `binding_mode`); all spine refs UP nullable (PG-9) `contract.md:12-14`.
2. **`computeProgress(purpose|target): 0..1`** — derived rollup `Σ(contributor.progress × weight)/Σ weight`,
   reading each contributor's own `progress()` (never a copied value), honoring the override slot `contract.md:16`.
3. **`progress(entity): 0..1`** — this context's implementation of the core `Pursuable` contract for
   Value/Purpose/Target/Dream `contract.md:18`.
4. **`bind(measurable, {binding_mode, ref})`** — declare `derived-pull` / `event-trigger`; reject a cycle
   (PG-8) `contract.md:20`.
5. **Contribution edge** — `link(goal, contributor, {weight, notes})` · `unlink` · `reweight` over
   first-class `contributions` `contract.md:22`.
6. **Reviews** — `openTargetReview` / `openPurposeReview`; a due review schedules as a `review` session +
   surfaces via `dueIn()` `contract.md:24`.
7. **Provider registration** — `summary(date)` + `dueIn(range)` into Journal/Calendar `contract.md:26`.
8. **Metrics** — `purpose_metrics` CRUD + `purpose_metric_values` ledger; a `quantitative` metric with
   `binding_mode=derived-pull` reads a source; provenance `source{manual,auto}` (PG-15) `business-rules.md:85-90`.
9. **Dreams** — single-aspiration CRUD (absorbed `bucket_list_items`); Bucket List = a Space over `dreams`
   (not service machinery) (PG-16) `business-rules.md:91-94`.

Typed errors (record-not-throw where the contract says so): `CyclicBinding`, `InvalidContributor`,
`UnmeasuredQualitative`, `SourceUnavailable`, `EffectApplyFailed`, `ProviderEmitFailed` `contract.md:49-57`.

## C. Organization (the service shape)

- **Factory-object, no `this.`** — `createPurposesService(deps)` returns an object literal; intra-service calls
  hoist to closures ([[factory-service-no-this-for-intra-calls]]; `projects/service.ts:58`).
- **10 repositories**, each `createRepository(db, table, {deviceId, softDelete, encryptedFields:[]})`:
  soft-delete `true` for entity tables (`purposes·targets·dreams·values·contributions·purpose_reviews·plan_steps`
  — all carry `deleted_at`); **`softDelete:false` for ledgers** (`purpose_metric_values`, `target_reviews` — no
  `deleted_at`, `schema/purposes.ts:124,141`). `purpose_metrics` has **no `deleted_at`** `:106` → `softDelete:false`.
- **Derive-on-read everywhere** — `resolveProgress(stored, derive)` is the single rollup entry; the override slots
  are `purposes.progress` (`schema/purposes.ts:65`), `targets.current_value` (`:86`), `dreams.progress_percentage`
  (`:179`) — all nullable (`NULL ⇒ derive`, `business-rules.md:30-33`). Return a `ProgressView {value, derived,
  partial, unmeasured?}` struct (Projects precedent `projects/service.ts:281`).
- **Deny-safe optional ports** — `measurementSources?`, `sessions?`, `effects?` guarded `if (!port) …` (M1 default);
  REQUIRED ports (`spaces`, `notes`, journal registry) wired once the slice needs them.
- **@vida/types reconcile (DB-11)** — the enums already exist (`MEASUREMENT_KIND`/`BINDING_MODE`
  `measurement.ts:1-11`; `CONTRIBUTION_*`/`PLAN_STEP_OWNER_TYPE`/`METRIC_VALUE_SOURCE` `purpose.ts:1-28`); the
  interfaces are the v2 floor in `project.ts:120-264` and return **Row types** at M1 ([[drizzle-row-not-assignable-to-vida-types-interface]]) with the interface reconcile sequenced as its own slice.

## D. Implicit rules (doc-sourced, non-obvious)

1. **`qualitative` with no scale = `null` (unmeasured), NEVER `0`.** The engine already enforces this
   (`engine.ts:30` returns `null`; `rollup` *excludes* null children `engine.ts:44`) — so an un-rated goal cannot
   drag a parent down (ADR-011 §3.1 L44; PG-3). Surfacing it is `UnmeasuredQualitative` `contract.md:52`.
2. **Ladder weight IS `contributions.contribution_percentage`** (0–100 int, `foundation/purpose.ts:41`) — no
   separate weight column; `NULL`/`0` ⇒ equal-weight (ADR-011 §3.3 L54).
3. **`contributions` holds ONLY the weight, never a copied progress value** (`foundation/purpose.ts:8`; PG-10,
   `conventions.md`). `computeProgress` reads each contributor's live `progress()` through a measure, never a stored copy.
4. **Progress is derived-on-read, never stored-and-propagated** — deltas come from Journals snapshots, not a
   propagation table (ADR-011 §3.8 L74; PG-17). No denormalized counters.
5. **Deletion respects optionality (PG-19)** — deleting a Purpose **SET NULLs** its Targets' `purpose_id`
   (they survive standalone), while `contributions·target_reviews·purpose_reviews·purpose_metric_values` cascade
   with their owner; all via **app-layer** logic (no hard FK — `schema/purposes.ts:9`) `business-rules.md:103-106`.
6. **Bindings acyclic across BOTH edge types** — a `derived-pull` A→B and `event-trigger` B→A together form a
   cycle; `assertAcyclic` already counts both (`engine.ts:65`; ADR-011 §3.7). Reject at author time.
7. **`measurement_kind`/`binding_mode` live on `targets` ONLY** within this module — NOT on `purposes` (rollup
   apex) nor `dreams` (the widen list omits the pair) `schema/purposes.ts:18-20`. Purpose/Dream `progress` is
   pure rollup/override.
8. **`plan_steps` is a DOC layer, not a tracked entity** (PG-11) — ordered checklist on a task/target; a step
   needing real tracking graduates to a sub-task (not this service's job) `foundation/purpose.ts:77`.

## E. M1 / M2 boundary

**Ships at M1 (this build):**
- Full CRUD for all 10 tables + the derived rollup (`computeProgress`/`progress`/`ProgressView`).
- `contributions` edge (link/unlink/reweight) + `InvalidContributor` guard against the
  `CONTRIBUTION_CONTRIBUTOR_TYPE` vocabulary `purpose.ts:5-7`.
- `bind` + `assertAcyclic` cycle rejection (the pure guard is built; wiring is M1).
- `derived-pull` resolution **through** the source registry — but with the registry **empty** at M1, every
  `derived-pull` resolves `null` (unmeasured) honestly `source-registry.ts:28` (real sources advertised by
  Finance/Habits/Health **at M2** — first-consumer-pull).
- Journal `summary(date)` provider registration (PG-14).
- Reviews CRUD (`target_reviews`/`purpose_reviews` ledgers) + `openTargetReview`/`openPurposeReview`.
- `encryptedFields:[]` M1.0 seam (real `[E]` encryption = M3, `schema/purposes.ts:33`).

**Deferred to M2 (deny-safe seams, zero-signature swap):**
- Real measurement sources (net_worth ← Finance, streak ← Habits, body_weight ← Health) — advertised by those
  modules; the pull path is built, the sources are absent (ADR-011 §3.6; `measurement/CLAUDE.md`).
- `event-trigger` **write** fan-out onto a LIVE rail — emit-only/dormant at M1 (`if (!effects) return`).
- Review **scheduling** as live `review` sessions on the Scheduler — see F-2 (the `dueIn` surface vs the
  review-as-session write).

## F. Open questions (resolved against docs where possible — per Victor, "check the documentation first")

- **F-1 — `progress` units: 0–1 (engine) vs 0–100 (columns)?** `purposes.progress`/`target current_value` and
  `contribution_percentage` are integers; the engine works in `[0,1]`. **RESOLVED by precedent:** Projects uses a
  `toPct()` boundary — store/override in 0–100, compute in `[0,1]`, convert at the edge (`projects/service.ts:457`).
  Follow it exactly. `[INTERP from FACT]`
- **F-1b — quantitative `target` leaf has no baseline/direction column (g1 #3). — RESOLVED.** `targets` carries
  `target_value`+`current_value` but **no `baseline_value`/`is_higher_better`** (`schema/purposes.ts:74-103`); those
  live only on `purpose_metrics` (`:119-120`). This is the schema's deliberate split: a **target** leaf is a simple
  ratio when both values are set — `normalize({kind:'quantitative', current: current_value, baseline: 0, target:
  target_value, isHigherBetter: true})` = `clamp(current/target)`; a NULL `current_value`/`target_value` ⇒ `null`
  (unmeasured, **never `?? 0`** — PG-3, g2 #4); **rich direction-aware/baselined** quantitative measurement is
  modeled via a linked `purpose_metric` (S3). `[RESOLVED: FACT schema split]`
- **F-2 — Do reviews create `review` SESSIONS at M1? — RESOLVED: YES, honouring the corpus FACT.** PG-13 is a
  corpus `[FACT: ADR-004 SS-1]` — "reviews fire as `review` SESSIONS, not a bespoke reminder" (`business-rules.md:77-80`,
  `contract.md:24`). My first draft demoted this to a deny-safe *optional* port (an `[INTERP]` overriding a `[FACT]`
  — the g1 #2 catch). **Correction:** `mod-sessions` is built + Done, so the FACT-honouring posture is a **REQUIRED
  `sessions:{registry,service}` port** wired at M1 — S7 registers the `review` sub-type (`registry.register`; SS-5
  owning-module registration — `SHIPPED_SESSION_TYPES=['focus']` only `registry.ts:26-42`; a `review` def with
  `effects:[]` passes BR-4 ⊆-envelope) then writes the session row (`service.createSession` `service.ts:119`). The
  ledgers + the session row both persist at M1; **only the live Scheduler *firing*** (notification/surfacing) is
  M2. No downgrade of the FACT. `[RESOLVED: FACT PG-13/SS-1 honoured; mechanism FACT registry.ts:26-42 + SS-5]`
- **F-3 — Does `computeProgress` need the measurement-source seam for contributor progress? — RESOLVED.**
  PG-7/conventions forbid reaching into other modules' tables. A cross-module contributor's progress comes through
  the `measurementSources?` seam (`query(key)`; absent/empty ⇒ `null`, excluded from rollup — honestly "unmeasured"
  at M1); in-module contributors (`target`/`dream` → purpose) resolve directly via `progress()`. The seam is
  **introduced + first-consumed at S5** (not S6 as first drafted — g1 #4 fixed the hidden back-edge); S6's
  `derived-pull` reuses the same port. `[RESOLVED: INTERP grounded; seam home corrected to S5]`
- **F-4 — DB-11 reconcile scope: amend-in-place in `project.ts` or new `purpose.ts` interfaces file?** The enums
  are split (`measurement.ts` + `purpose.ts`); the interfaces are in `project.ts:120-264`. [[db4-types-may-be-colocated-grep-name-before-net-new]]
  says reconcile-and-extend in place, don't double-export. **LEAN:** amend the interfaces where they live; add the
  4 missing ones (`Value`/`PurposeReview`/`PlanStep`/`Contribution`) colocated; return Row types from the service
  at M1 regardless. `[INTERP]`
- **F-5 — Is `is_achieved`/alignment-trend analytics in M1 scope?** `schema/purposes.ts:100` marks `is_achieved`
  as derived (no column). **RESOLVED:** derived-on-read, no stored counter (PG-17); compute in the read path, no
  separate slice. `[FACT]`

---

### Envision Gate (EDF §3.75) — N/A
Pure-backend service tier; no user-facing rendered surface (the faces are ② `fe-purposes`, separate P6). The
§3.75 one-question test (does this introduce a novel user-facing interaction pattern?) = **NO** → Envision does
not fire. Applied as a doc test, not a decision ([[envision-gate-firing-is-a-doc-test-not-a-human-decision]]).
