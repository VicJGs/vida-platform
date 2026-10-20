<!-- Forward spec — Tasks ① S6 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- REWRITTEN after grounding: the push-gate framing was wrong (contradicted the shipped Projects convention);
     binding_mode is a READ-side feed-path selector, not a completion-emission gate. See §"Grounding correction". -->

# PLAN S6 — Measurability axes + contribution

> Slice-map S6. TAS-25 (measurability axes), TAS-26 (Task→Purpose contribution + C1/C2 guards).
> Doc-resolved from ADR-011 §3.1/§3.2/§3.4/§3.5 + xcut-measurement XCU-08/09/11/15 + the **shipped Projects
> precedent** (`services/projects/service.ts`) — NOT a design decision. Closes with the live-store Verification Gate.

## Grounding correction (what this rewrite fixed — No-Guessing)
An earlier draft gated the completion emission by `binding_mode` ("`emit_measurement_signal` fires only when
event-trigger"). That is **wrong** and contradicts the live convention:
- `[FACT: services/projects/service.ts:72-81]` — Projects emits `emit_measurement_signal` **unconditionally** on the
  completed transition; it does **not** gate by `binding_mode`. Tasks S3 already matches this (`service.ts:159-169`).
- `[FACT: services/projects/service.ts:465-530]` — `binding_mode` is consumed on the **READ** side: stored override
  wins → `derived-pull` reads a measurement-source → else the derived leaf. This is the "progress derives via
  binding_mode" of `contract.md:25` + `TK-11` (M3/M4), and the `progress()` pursuable contract XCU-08/BR-8.
So S6 = the **read-side** `progress()` resolver (the Projects `getDeliverableProgress` analogue, adapted to tasks) +
the C1/C2 guards. S6 does **not** touch S3's emission.

## What is already built (do NOT re-assert — the grounding floor)
- **Axes exist + validated.** `measurement_kind` (NN DEFAULT `'milestone'`) + `binding_mode` (nullable) are columns
  (migration 015) and enum-validated at the service boundary (`BR-TK-S1-6`). `[FACT: migrations/015_tasks.ts:67-69; service.ts:187,218]`
- **Completion emits the catalogue.** S3 `fanOutCompletion` emits `[award_xp, contribute_purpose_metric,
  emit_measurement_signal]` unconditionally on the not-completed→completed transition, deny-safe/dormant, bare (no
  payload) — matching the Projects/Habits convention. `[FACT: service.ts:151-169, 350; BR-TK-S3-3; projects/service.ts:72]`
- **Sub-task aggregate derives.** `getRollup(parentId)` → `{done,total,progress}` via the M4 weighted `rollup()`; **returns
  `progress:null` for a leaf (no children)** — so a leaf task's OWN measure is exposed nowhere yet. `[FACT: service.ts:328-338]`

## The gap S6 closes (grounded, net-new)
Tasks is a **pursuable** (`measurement_kind` applies-to names "Tasks (incl. sub-tasks)") and **owes a `progress()`
implementation** `[FACT: xcut-measurement XCU-08/BR-8 "each module IMPLEMENTS it"; ADR-011 §3.4]`. Today it implements
only the sub-task AGGREGATE (`getRollup`), not a task's own `progress()` honoring its axes. S6 implements that.

## Scope (what's in ① vs deferred)
- **In (net-new):** (1) `getTaskProgress(id): number | null` — the pursuable `progress()` contract, a read-side
  derivation honoring `measurement_kind` + `binding_mode` (Projects model); (2) the pure `resolveBindingMode` +
  `deriveTaskLeaf` helpers it composes; (3) the **C1** (no measurement-source advertise) + **C2** (no M7 table) guards,
  test-proven. **No change to `completeTask`/`fanOutCompletion`** (S3's emission is already convention-correct).
- **Deferred — each checked against its homing doc, NOT manufactured:**
  - **Value-bearing measures** (quantitative/rate/qualitative with current/baseline/target/rating inputs) — these are
    **not a tasks concern**: a task's only measurable leaf is completion-as-`milestone` `[FACT: BR-TK-S2-4]`, and the
    value-input columns are homed to **value-bearing entities per DB-4** (targets/metrics/health/finance), not tasks
    `[FACT: xcut-measurement XCU-15 "columns owed per-module DB-4 … home: per-module DB-4"]`. Out-of-scope by ownership.
  - **`derived-pull` source read + the `measurementSources` dep** — tasks has **no task↔source binding** in M1 (Projects
    writes one as an `entity_links` row via `spaces.createLink`, `service.ts:404-416`; tasks wires no such op). With no
    binding to read there is nothing to query, so a `derived-pull` task resolves to `null` and S6 adds **no**
    `measurementSources` dep. The binding-write op + the source read (which then adds `measurementSources`) are a future
    slice `[FACT: xcut-measurement XCU-13 "binding STORAGE deferred (build-phase)"; projects/service.ts:403-416]`.
  - **Live `contribute_purpose_metric` / `emit_measurement_signal` handlers + `contributions` write** — **verified
    dormant**: a grep of every `register()` site shows **no production handler** for either effect anywhere; habits
    `service.ts:401` treats `contribute_purpose_metric` as "dormant (no handler)" identically. The `contributions` CRUD
    is **MOD-purposes-owned** `[FACT: xcut-measurement XCU-12 "table + CRUD homed to MOD-purposes"]`; the cross-module
    consumer handler is a later first-consumer-pull, not a tasks deliverable.
  - **A manual stored-progress override slot** — tasks has **no `progress` column** (C6; unlike `deliverables.progress`),
    so a `manual` task has no stored value to read → `null` (see M-read below). Adding the column is the ADR-002
    amendment / build-phase `[FACT: xcut-measurement XCU-16 "nullable override-slot amendment … DEFERRED — DB-4/build"]`.

## Operations (one added read method)
```ts
getTaskProgress(id: Id): Promise<number | null>   // the pursuable progress() contract (XCU-08/BR-8), derived-on-read
```
Added to `TasksService`. Extends the seam-contract's terse S6 line ("progress derives") with the concrete method —
within its intent, grounded in the Projects `getDeliverableProgress` precedent + XCU-08. (The cross-module
*aggregation* read `getTaskRollup({entityType,entityId})` that Projects consumes is **S7**, not S6 — kept distinct.)

## Operation flow + invariants

### M-read — `getTaskProgress` resolves a task's own [0,1]|null honoring the axes (TAS-25; Projects model)
**Not-found:** `getTaskProgress(id)` on a missing/soft-deleted id ⇒ `TaskNotFoundError` (NOT `null` — `null` is the
*unmeasured* signal, BR-2, and must never be overloaded with *not-found*; mirrors `completeTask` + Projects
`getDeliverableProgress`/`service.ts:526-528`).

Faithful to the Projects resolver `projects/service.ts:465-530`, where (a) a **stored override** wins
(`resolveProgress` / XCU-04), (b) `binding_mode` branches **only on `derived-pull`**, (c) else a **derived leaf**.
Tasks has **no override column** (C6), so step (a) never applies in M1 — a (found) task **always derives**:
- **(parent, has sub-tasks)** ⇒ the M4 rollup (reuse `getRollup`'s `progress`) — a container's measure is its children,
  regardless of `binding_mode` (mirrors Projects' tasks-rollup-first, `projects/service.ts:465-468`).
- **(childless, `binding_mode='derived-pull'`)** ⇒ **`null`** (never fabricated, BR-2). A `derived-pull` measure is fed
  by a bound source, **not** by completion — so it must NOT fall through to the milestone leaf. The source *read* needs a
  task↔source binding store (Projects writes one as an `entity_links` row via `spaces.createLink`,
  `projects/service.ts:404-416`); tasks wires **neither the binding nor a `measurementSources` dep** in M1, so there is
  no source to query → `null` directly. This is `binding_mode`'s one testable M1 branch. **S6 does NOT add
  `measurementSources` to the deps** (no binding to read yet — YAGNI; it lands with the binding-write slice).
- **(childless, else — `event-trigger` / `manual` / NULL-natural)** ⇒ the leaf
  `deriveTaskLeaf(task) = normalize({ kind:'milestone', done: status==='completed' })`.
  `[FACT: BR-TK-S2-4 "a task's only measurable leaf signal is completion (binary milestone)"; engine.ts:23-25]`
- **`manual` is inert in M1 (grounded, not a special-case):** without an override column a `manual` task has no stored
  value, so it derives like any other — the Projects override-slot behavior with the slot absent. Once the override
  column lands (XCU-16, ADR-002 amendment / build-phase), `resolveProgress` gives a stored `manual` value precedence;
  M1 cannot, and does **not** fabricate a separate `manual⇒null` rule. `resolveBindingMode(task) = task.binding_mode ?? 'event-trigger'`
  `[FACT: migrations/015_tasks.ts:21 "NULL ⇒ derive-natural"] ∘ [FACT: delivery/interpretation.md:33 "binding_mode='event-trigger' (completion)"]`.
- **`measurement_kind` note:** a task's leaf is `milestone` for ALL declared kinds — a task carries no value inputs for
  quantitative/rate/qualitative (those home to value-bearing entities, XCU-15); the declared kind governs how the value
  composes UP a ladder (contributions/M4), the leaf is completion. No fabricated non-milestone leaf.

### TAS-26 — the UP-contribution is already emitted (S3); S6 adds only the guards
- `contribute_purpose_metric` keeps firing on completion exactly as S3 built it (unconditional, bare, dormant — the
  event-trigger edge, ADR-011 §3.5 / XCU-09). S6 does **not** modify it. The "if the task contributes to a purpose"
  resolution + the weighted `contributions` write are the (dormant, Purpose-owned) handler's job (XCU-12).
- **C1 (no M5 source) — guard, by construction + test-proven.** Tasks is absent from the measurement-source applies-to
  set (Finance/Habits/Health/Projects); `progress(task)` is **not** advertised. S6 gives tasks **no
  `MeasurementSourceRegistry` handle** in its deps, so it is *structurally incapable* of calling `advertise` — C1 holds
  by construction, not just by discipline. `getTaskProgress` is a plain read, not an advertised source.
  `[FACT: ADR-011 §3.6; xcut-measurement XCU-06/07; parts/tasks.md:36 C1; TasksServiceDeps has no measurementSources]`
- **C2 (no M7 tables) — guard, proven-by-absence.** Tasks owns no Purpose-apex rollup tables
  (`values`/`contributions`/`purpose_reviews`/`plan_steps` — all Purpose-domain, §3.8). S6 adds no table, no migration.
  `[FACT: ADR-011 §3.8; xcut-measurement XCU-12; parts/tasks.md:36 C2]`

## Types / validators
- **No `@vida/types` change, no migration, no new enum, no new typed error.** `getTaskProgress` is a read.
- `resolveBindingMode` / `deriveTaskLeaf` are module-local pure helpers (like `nextOccurrence`). `getTaskProgress`
  returns `number | null` (the `[0,1]` pursuable progress, matching the engine's `normalize`/`rollup` return + BR-8).
- **No change to `TasksServiceDeps`** (it is `{db, deviceId, effects?, sessions?}` today). S6 adds no dep —
  `getTaskProgress` needs only `db` (via the existing `tasksRepo`/`getRollup`) + the pure engine. `measurementSources`
  lands later with the derived-pull binding-read slice, not here.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, real measurement engine)
1. `getTaskProgress` on a **leaf** task, `binding_mode` unset (NULL-natural): not completed ⇒ `0`; completed ⇒ `1`
   (milestone leaf via the engine).
2. `getTaskProgress` on a **parent** (has sub-tasks), NULL-natural: equals the M4 `getRollup().progress` (1 completed of
   2 ⇒ `0.5` equal-weight; reflects `nesting_weight`).
3. `getTaskProgress` on a **childless `binding_mode='derived-pull'`** task ⇒ **`null`** (no bound source, never
   fabricated — BR-2; does NOT fall through to the completion leaf). **The one testable M1 branch where the axis governs
   the read.**
4. `getTaskProgress` on a **childless `binding_mode='manual'`** task ⇒ the milestone leaf (`0`/`1` by completion) — i.e.
   it **derives like any other** (no override column in M1; manual is inert until XCU-16 lands). Documents the known M1
   limitation rather than fabricating a `manual⇒null` rule.
5. `getTaskProgress` on a `binding_mode='event-trigger'` (explicit) leaf ⇒ same as NULL-natural (1); a **parent** that is
   `derived-pull` still returns the sub-task rollup (container rollup wins, Projects-faithful).
6. A task with no children and status `in_progress` ⇒ `0` (milestone not done); `cancelled` ⇒ `0` (not completed).
7. **(C1)** by construction — `createTasksService` accepts no `MeasurementSourceRegistry`, so it cannot advertise.
   Prove it: build the service + run `registerTasksTimer` passing a spy `MeasurementSourceRegistry` whose `advertise`
   throws, and assert it is **never called** (advertise-count 0); a fresh registry's `has('task'/'progress')` stays false.
8. **(C2 / regression)** `getTaskProgress` is a pure read — writes nothing; `completeTask` is unchanged by S6 (its S3
   emission + S5 regen behavior still pass — re-run the key S3/S5 assertions as a guard that S6 was purely additive).
9. **(unit)** `deriveTaskLeaf`: `done:true⇒1`, `done:false⇒0`; `resolveBindingMode`: NULL⇒`'event-trigger'`, explicit
   values pass through.
10. **(not-found)** `getTaskProgress` on a missing id, and on a soft-deleted task ⇒ `TaskNotFoundError` (never `null`).

## Out of scope
Value-bearing per-kind measures + their columns (XCU-15, DB-4/build) · task↔source binding storage + live `derived-pull`
(XCU-13, build) · the live measurement/purpose handlers + `contributions` write (XCU-12, MOD-purposes/first-consumer) ·
a manual stored-progress override column (XCU-16, ADR-002 amendment) · cross-module aggregation `getTaskRollup` /
`getAggregatedTasks` (S7) · tags/notes/views (S8) · Journal summary + DueProvider (S9).
