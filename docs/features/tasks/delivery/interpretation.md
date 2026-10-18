<!-- Interpretation Layer — features/tasks · Entity Delivery Flow ① · Step 1 -->
<!-- Makes the implicit explicit before decomposing. Every claim [FACT: path:line] or [INTERP]. -->
<!-- Sources: aspect corpus (business-rules/contract/structure-data/conventions/identity) ·
     backend-intent/parts/tasks.md (TAS-01…38) · schema/tasks.ts · migrations/015_tasks.ts ·
     @vida/types/task.ts · validators/task.ts · services/tasks/CLAUDE.md · routines substrate map (shared foundations) -->

# Interpretation — Tasks (① backend service)

> **Entity in one line:** the OS-wide task primitive + its time ledger — an **aggregator** (5 parent refs, fans out to
> read parent-module data) **and an effect producer** (completion fires the S4 catalogue). Schema is built (migration 015,
> richer than `@vida/types`); service tier is 0 code. **Pulled ahead of mod-routines (Victor, 2026-10-14): routines drives
> task-type steps, so Tasks ships first.**

---

## 1. DEPENDENCIES — what the service binds to

### 1a. Persistence floor (BUILT — bind, don't author)
- **2 tables, migration 015, registered** `[FACT: migrations/015_tasks.ts; runner.ts:74; schema/index.ts]`:
  - `tasks` — **5 parent refs** (`project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id`), all **plain TEXT, no FK**;
    `status`/`priority`/`difficulty` (CHECK enums), `due_date`/`scheduled_date` (YYYY-MM-DD), `estimated_minutes`,
    `actual_minutes` (derived, never hand-set), `completed_at`, `kind` (standard/obligation), `recurrence_rule` (RRULE),
    `measurement_kind` NN DEFAULT `'milestone'`, `binding_mode` nullable (`NULL ⇒ derive`), `nesting_weight` (M4 per-child, NULL ⇒ equal), `deleted_at`. `[FACT: schema/tasks.ts:44-81]`
  - `task_time_logs` — `task_id` (no FK), `start_time`, `end_time` (NULL = running), `duration_minutes`; **NO `deleted_at`** (ledger, hard-deletes with the task). `[FACT: schema/tasks.ts:84-95]`
- **The schema already authored every INTENDED col** — unlike routines, tasks' reframe cols (completed_at/scheduled_date/kind/recurrence_rule/axes/nesting_weight) are **in the DDL**. The service builds straight onto them. `[FACT: schema/tasks.ts:27-29 header]`
- **No hard FK** — referential integrity + TK-4 cascade (delete→sub-tasks+time_logs) / parent-delete SET NULL are the **app/sync layer's**. `[FACT: schema/tasks.ts:20 header; business-rules.md:12 (TK-4)]`

### 1b. Composed substrates (via contract — NEVER reach into their tables, §6). Signatures from the routines substrate map (same foundations).
- **Sessions (ADR-004) — BUILT.** The timer is a `sessions` sub-type: `sessions.createSession(input)` to open, transition to close.
  A task-timer run + bound pomodoro are session runs. `[FACT: contract.md:16; services/sessions/service.ts:177; TAS-12,13]`
- **Effect-rail (ADR-004 S4 / R1-R2) — BUILT.** `effects.rail.applyEffect(event)`, idempotent by `effect_event_id`, handler co-writes via the passed tx. The documented effect types tasks produces: `log_time` (additive), `attach_pomodoro` (intra_realm), `award_xp` (additive), `contribute_purpose_metric` (keyed), `surface_journal` (projection), `emit_measurement_signal` (keyed). **Tasks is a PRODUCER — it never writes the ledger/XP/metric directly.** `[FACT: foundation/effects/service.ts:29; types.ts:20; TAS-16,17,19,20]`
  - ⚠ **`surface_calendar` (TK-6/TAS-19) is NOT in the built `EFFECT_CLASS_OF` map** (which lists surface_notification/journal/emit_measurement_signal/…, not surface_calendar). → gate decision D1: calendar is a **read-seam over `due_date`/`scheduled_date` + `dueIn`**, not an effect to emit — do not invent a `surface_calendar` effect type. `[FACT: foundation/effects/types.ts:20 (from substrate map); contract.md:29]`
- **Measurement (ADR-011) — BUILT, pure.** Task is a pursuable: `measurement_kind='milestone'` × `binding_mode='event-trigger'` (completion). `progress` **derives on read** (M3 — no stored col); the **M4 sub-task rollup** = `rollup(children)` weighted by `nesting_weight`. Tasks advertises **NO** M5 source (guard, C1). `[FACT: foundation/measurement/engine.ts:38 (rollup); TAS-10,25,26]`
- **Spaces (ADR-006) — BUILT.** `createSpacesService(db, deviceId, registry)` (positional); `tagEntity(tagId,'task',id)`; register `'task'` in the TaggableTypeRegistry (already in `_registry.ts`). `[FACT: foundation/spaces/service.ts:63; TAS-27]`
- **Views (ADR-007) — the `views` primitive** is Spaces/Views-owned; `saveView`/`listViews` ride it. *(Historical: this line also listed `reorderViews`/`pinView`; resolved at S8 — nav placement of views is Preferences-OWNED, ADR-007 §3.5 / XCU-21, see PLAN-S8 §Resolved.)* **Full V1 anatomy is the deferred ADR-007 pass** — tasks cites-as-consumed. `[FACT: contract.md:19; TAS-28; rerun C8]`
- **Notes — BUILT.** `notes.ensureEntityNote(pageType,'task',id,seed)` for task notes. `[FACT: services/notes/service.ts:72; TAS-31]`
- **Tag filter semantic (S8, the one INTERPRETATION of the slice).** `views.filter.tags` = membership **incl. nested**
  `[FACT: ADR-007:57; ADR-006:75-76,102]`; the docs fix only the single-root-tag case (a Space's contents) and never
  state how several tags combine ⇒ a list of memberships is their **UNION** (the contents of several Spaces)
  `[INTERPRETATION — PLAN-S8 flow step 4]`; an intersection combinator is a predicate for the deferred 007 DSL pass.
- **Purpose (M7)** — `contribute_purpose_metric` effect carries the UP-contribution via `contributions`; guard: no apex/rollup tables. `[FACT: TAS-26]`
- **R7 aggregation read seam** — `getAggregatedTasks` groups tasks by parent and resolves parent **labels** via each parent module's documented list/query API (projects/relationships BUILT; learning/languages per availability). **Never a direct cross-module table read**; per-source degradation (TAS-32). `[FACT: business-rules.md:17 (TK-9); contract.md:27-29]`

### 1c. Type/validator reconcile owed (DB-11 — S1)
- `@vida/types/task.ts`: `Task` still carries `tags: string[]` (→ drop, now `entity_tags`) and is **missing 7 cols** (`scheduled_date`, `completed_at`, `kind`, `recurrence_rule`, `measurement_kind`, `binding_mode`, `nesting_weight`); `TaskTimeLog` missing `updated_at`. `[FACT: @vida/types/task.ts:26-56; schema/tasks.ts:31-33 header]`
- `validators/task.ts` is **clean** (imports only `TASK_DIFFICULTY`/`TASK_KIND`, both live) — no retired-enum trap (unlike routines). Add `Status`/`Priority`/`measurement`/`binding` z.enum validators as needed. `[FACT: validators/task.ts:1-5]`
- ⚠ Rebuild `@vida/types` dist before `@vida/core` typecheck after a src edit. [[editing-vida-types-needs-dist-rebuild-before-core-typecheck]]

---

## 2. NEEDS — the TAS surface, grouped
- **CRUD + parent guard** — createTask/updateTask (≤1 parent, `MultipleParentError`) / softDeleteTask (cascade) / listTasks(filter) / completeTask(+completed_at) / reopenTask. `[FACT: TAS-01..07,34]`
- **Sub-tasks + rollup** — addSubtask (single-level, TK-3) / getSubtasks / getRollup→{done,total} (M4 derived, no stored progress). `[FACT: TAS-08,09,10,11]`
- **Time tracking** — startTimer (`TimerAlreadyRunningError`) / stopTimer (idempotent) via a sessions sub-type; `actual_minutes` = SUM of logs via the `log_time` effect; setTimeTrackingEnabled opt-out. `[FACT: TAS-12..18]`
- **Completion effect fan-out** — on status→completed emit the S4 catalogue (award_xp, contribute_purpose_metric, surface_journal, emit_measurement_signal) via the rail. `[FACT: TAS-06,19,20,26]`
- **Obligations** — setRecurrence (obligations only) / regenerate-next-on-complete / `RecurrenceRegenError` (complete-but-flag). `[FACT: TAS-21,22,23,24]`
- **Measurability** — expose/validate the pursuable axes; the task measure advances on the event-trigger completion. `[FACT: TAS-25]`
- **Aggregation** — getAggregatedTasks(grouping) via the R7 fan-out; per-group degradation. `[FACT: TAS-05,32]`
- **Cross-cutting** — tags (entity_tags), notes (pages), views (saveView/listViews/…). `[FACT: TAS-27,28,31]`
- **Typed errors** — `MultipleParentError` · `TimerAlreadyRunningError` · `RecurrenceRegenError` + per-group aggregation errors. `[FACT: contract.md:35-38]`

---

## 3. ORGANIZATION `[INTERP, sibling pattern]`
- `createTasksService(deps)` factory; `deps = { db, deviceId, spaces, notes, registry, sessions, effects?, measurementSources?, providers?: AggregationProviderPort }`.
- Repos over `tasks` + `task_time_logs` (generic Repository, `encryptedFields:[]` M1.0). [[m10-repos-use-empty-encryptedfields-seam]]
- Thin-write / thick-derive again: rollup + actual_minutes + aggregation are **derivations**; completion is a **producer** (emit, don't write consumers).
- **Slice preview (for Step 2):** S1 CRUD+parent-guard+DB-11 · S2 sub-tasks+M4 rollup · S3 completion+effect fan-out · S4 timer+log_time+actual_minutes · S5 obligations+recurrence · S6 measurability axes+contribution · S7 aggregation R7 fan-out · S8 tags+notes+views · S9 Journal summary + DueProvider closer. **Gate decides.**

---

## 4. IMPLICIT RULES — the backend traps the gate must catch
1. **≤1 parent, enforced at write** — createTask/updateTask reject two parent FKs (`MultipleParentError`); `milestone_id` implies its project. `[FACT: business-rules.md:10 (TK-2); TAS-34]`
2. **App-layer cascade (no FK)** — delete task → delete sub-tasks + time_logs (hard-delete the ledger, no `deleted_at`); a parent-module delete **SET NULLs** the link, never deletes the task. `[FACT: business-rules.md:12 (TK-4); schema/tasks.ts:92]`
3. **`actual_minutes` has ONE write path** — the `log_time` S4 effect summing closed logs; never hand-set, honors the opt-out. A running log (`end_time IS NULL`) must close before it counts. `[FACT: business-rules.md:13 (TK-5); TAS-15]`
4. **Completion is status + timestamp + producer** — set `completed_at` on status→completed (clear on reopen); `updated_at` is NOT a completion signal; emit effects, **never write XP/ledger/metric directly**. `[FACT: business-rules.md:14 (TK-6)]`
5. **Sub-task rollup derives (M3) — NO stored progress column** — `getRollup` computes `Σ(child×weight)/Σweight` on read via `measurement.rollup`; completing a parent never force-completes children (and vice-versa). `[FACT: business-rules.md:11 (TK-3); TAS-10,11]`
6. **Only obligations recur** — a `recurrence_rule` on a `standard` task is invalid; regeneration spawns the next occurrence on completion; bad rule → complete + `RecurrenceRegenError`, never silently stop. `[FACT: business-rules.md:15 (TK-7); TAS-22,23]`
7. **Aggregation reads via R7, never tables** — `getAggregatedTasks` resolves parent labels through each parent module's documented API; an unavailable source degrades that **group** only (not the whole view). `[FACT: business-rules.md:17 (TK-9); TAS-32]`
8. ⚠ **`surface_calendar` is not a built effect type (D1)** — calendar surfacing is a read-seam over `due_date`/`scheduled_date`/`dueIn`, not an emitted effect. Don't invent the effect type. `[FACT: substrate map EFFECT_CLASS_OF; contract.md:29]`
9. ⚠ **`task_time_logs` ↔ session-extension reconciliation (D2)** — whether `log_time` writes `task_time_logs` or the ADR-004 session extension subsumes it is a build-phase structural call (TAS-18, `[DEFERRED — build]`). Keep `task_time_logs` as the ledger; do NOT retire it. Resolve jointly with the Sessions contract at the timer slice. `[FACT: TAS-18; rerun C4]`
10. **Repo gotchas (all apply):** `create()` returns the input row (backfill NN-defaults: status/priority/kind/measurement_kind/sort_order) [[repository-create-returns-input-row-not-db-defaults]]; `findWhere` skips the soft-delete filter [[repository-findwhere-skips-softdelete-filter]]; Drizzle Row ≠ `@vida/types` interface [[drizzle-row-not-assignable-to-vida-types-interface]]; M1.0 empty `[E]` seam [[m10-repos-use-empty-encryptedfields-seam]].
10b. **`tags` drop is a breaking type change** — dropping `Task.tags` ripples to any current consumer; grep before the DB-11 edit.

---

## 5. Decisions for the Decomposition Gate (Victor — Approval 1)
- **D1 — `surface_calendar` is NOT an effect; calendar = read-seam.** The effect-rail has no `surface_calendar` type; completion emits award_xp/contribute_purpose_metric/surface_journal/emit_measurement_signal only. Calendar surfacing rides `due_date`/`scheduled_date` + `dueIn`. → **recommend: approve** (grounded in the built rail). *Verify against `foundation/effects/types.ts` at the completion slice before relying on it.*
- **D2 — `task_time_logs` ↔ session-extension (TAS-18):** keep `task_time_logs` as the time ledger; `log_time` writes it; the session run references the task. Resolve the exact write-ownership jointly with the Sessions contract **at the timer slice (S4)**, not now. → **recommend: approve the deferral; decide concretely at S4.**
- **D3 — Aggregation providers are deny-safe per source.** `getAggregatedTasks` composes a `providers?` port; built sources (projects, relationships) resolve labels, absent/unbuilt ones (languages?) degrade that group to empty/error (TAS-32). → **recommend: approve.**
- **Measurement CHECK defaults** (`milestone` × nullable `binding_mode`) + `nesting_weight` are already in the schema — **verify-only**, no decision. `[FACT: schema/tasks.ts:67-69]`
- **Out of ① scope (② UI / P6, ADR-020):** the 12 layouts, view-builder chrome, board drag, running-timer indicator, optimistic apply/revert. Full V1 view anatomy = deferred ADR-007 pass. `[FACT: backend-intent/parts/tasks.md:5]`
- **Routines seam** — ensure S1/S3/S5 expose a clean `createTask`(+recurrence)/`completeTask`/`getTask`/`listTasks` surface routines' task-step driver will consume (the whole reason Tasks is first).
