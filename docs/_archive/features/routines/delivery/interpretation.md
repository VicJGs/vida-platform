<!-- Interpretation Layer — features/routines · Entity Delivery Flow ① RECOVERY (entity-rescope) · Step 2 -->
<!-- Makes the implicit explicit before reconciliation. Every claim [FACT: path:line] · [INTERP] · [UNKNOWN]. -->
<!-- Sources: the GATED corpus (delivery/documentation-gate.md — aspect docs read THROUGH its §A supersession map) ·
     intake §C–§E · backend-intent ROU-01…33 · schema/routines.ts + mig 018 + db-4-routines spec · the BUILT code
     (services/routines/*, as-built S1–S3) · the shipped substrates (tasks · sessions · habits · spaces · notes ·
     effects · measurement · journals · preferences). Paths are relative to packages/core/src unless stated. -->

# Interpretation — Routines (① backend service) · re-scope refresh 2026-10-21

> **Entity in one line:** a cross-module **orchestrator**. It is a named, ordered, recurring sequence of polymorphic steps,
> and each step **drives** a real entity elsewhere. The service composes and derives. It owns three tables, and the only
> completion record it writes is its own **step-occurrence ledger**.
>
> **What changed vs the 2026-10-14 version (Approval-1 record).** That version was written with "0 service code" and "Tasks
> not built". Both are now false: as-built S1–S3 exist, and mod-tasks shipped. This refresh rebases on the built floor, folds in
> the Documentation Gate (A1–A11; U1 resolved from ADR-004), and resolves U2–U5. **D1–D3 are unchanged** (§5).

---

## 1. DEPENDENCIES

### 1a. Persistence floor — BUILT (bind, don't author)
- **3 tables, migration 018:** `routines` · `routine_step` · `routine_completions` `[FACT: db/schema/routines.ts:47-108]`.
  - **No FK.** Cascade is the app layer's `[FACT: :18-19,96]`.
  - **Ledger:** `UNIQUE(routine_step_id, completed_date)`, no `deleted_at` `[FACT: :103,106]`.
  - **No policy columns** `[FACT: :62]`.
  - **`progress`** is a nullable override slot `[FACT: :59]`.
  - **`step_type`** is OPEN vocab, no CHECK `[FACT: :76]`.
- **Entity registry seed:** `'routine'` + `'routine_step'` are in `ENTITY_TYPES` `[FACT: db/schema/_registry.ts:45-46]`. The
  `TaggableTypeRegistry` seeds from `ENTITY_TYPES` `[FACT: foundation/spaces/registry.ts:4-16]`, so both are **pre-seeded**.
  D2's registration is already satisfied, and no `registry` dep or `register()` call is needed (the Tasks precedent:
  "'task' is pre-seeded … no `registry` dep" `[FACT: services/tasks/types.ts:55-57]`).
- **Types/validators: reconciled (DB-11, as-built S1)** `[FACT: packages/types/src/routine.ts:1-13; validators/routine.ts]`.
- **Repository:** generic, `encryptedFields: []` (the M1.0 dormant `[E]` seam). `create()` echoes the input row; `findWhere`
  skips the soft-delete filter `[FACT: services/routines/service.ts:79-83; db/repository.ts]`.

### 1b. Composed substrates — signatures VERIFIED against shipped code (consume via contract, never their tables)
| Substrate | Factory / dep shape | Methods routines composes | Notes |
|---|---|---|---|
| **Tasks — BUILT (D1: required)** | `createTasksService({db,deviceId,effects?,sessions?,providers?,spaces?,notes?,views?})` `[FACT: services/tasks/types.ts:36-65]` | `getTask` · `completeTask(id)` · `reopenTask` · `listTasks` `[FACT: :251-262]` | `completeTask` throws `TaskNotFoundError`; it **re-writes** `status`/`completed_at` on every call, but fans out **only on not-completed→completed** `[FACT: services/tasks/service.ts:446-453]`. On an obligation it may throw `RecurrenceRegenError` **after** the completion is durable (TAS-23) `[FACT: :455-459]`. Task effects = `award_xp`, `contribute_purpose_metric`, … `[FACT: :249-251]`. Only `obligation`s recur, and each recurrence is a **new task id** `[FACT: types.ts:341-347; service.ts:464-490]` |
| **Habits — BUILT** | `createHabitsService({db,deviceId,clock?,prefs?,effects?,associations?})` `[FACT: services/habits/types.ts:40-51]` | `logCompletion(habitId, input?)` · `getHabit` · `getDayCompletionDigest` `[FACT: :135,130,175]` | `logCompletion` without `count` writes `count=1` `[FACT: services/habits/service.ts:205]`. Effects (`complete_habit_occurrence` + `contribute_purpose_metric` + `award_xp`, keyed `habit.id` + `completed:<date>`) fan out **only when `count >= target_count`** `[FACT: :46,143-153]`. A missing habit throws an **untyped** `Error('Habit not found')` `[FACT: :231]`; a future/out-of-window date throws `BackfillWindowError` `[FACT: :250-256]` |
| **Sessions — BUILT** | `createSessionsService({db,deviceId,registry:SessionRegistry,rail,entityRegistry})` `[FACT: services/sessions/service.ts:107-116]` | `createSession` · `attach(sessionId, entityType, entityId, 'type'\|'instance')` · `findOpenSessionForEntity(subType, entityType, entityId)` · `completeSession` · `transitionSession` · `registerDueProvider` · `dueIn` `[FACT: :118-175]` | `createSession` validates `sub_type` via `registry.get` → `SessionTypeNotFound` `[FACT: :284; foundation/sessions/registry.ts:123]`. The **shipped** roster is `focus` only; user-registered sub-types resolve at runtime `[FACT: registry.ts:26-47]`. **Focus is driven via `startFocus({attach})` / `completeFocus`**: a bare `createSession` has no timer row `[FACT: services/sessions/service.ts:444-469]`. `findOpenSessionForEntity` matches **`in_progress` only** `[FACT: :428]`. `completeSession` **fires declared effects before committing** status `[FACT: foundation/sessions/lifecycle.ts:110-116]`. Focus declares `attach_pomodoro` + `log_time` `[FACT: registry.ts:31]`, and an instance attachment becomes an effect target `[FACT: lifecycle.ts:72-79]` |
| **Spaces — BUILT** | `createSpacesService(db, deviceId, registry)` (positional) `[FACT: foundation/spaces/service.ts:63]` | `tagEntity` / `untagEntity(tagId, entityType, entityId)` · `createLink(pageId, entityType, entityId, context?)` `[FACT: :44-47]` | tag reads go through an `AssociationResolver` (the habits precedent `[FACT: habits/types.ts:49-50]`) |
| **Notes — BUILT** | `createNotesService(deps)` | `ensureEntityNote(pageType, entityType, entityId, seed)` `[FACT: services/notes/types.ts:73]` | idempotent find-or-create |
| **Effect rail — BUILT** | `createEffectRail(db, registry)` `[FACT: foundation/effects/service.ts:29]` | `applyEffect({subjectNaturalKey, transition, effectType, targetRef, payload?})` `[FACT: foundation/effects/types.ts:37-43]` | idempotent by `effect_event_id`. Classes: `award_xp`/`grant_currency` additive · `contribute_purpose_metric`/`emit_measurement_signal` keyed `[FACT: :20-33]`. **Fails loud:** a non-projection effect with no handler throws `NoEffectHandler` `[FACT: foundation/effects/service.ts:38-40]`. Dormancy is the **producer's** guard: `if (!effects \|\| !effects.registry.resolve(t)) return` `[FACT: services/habits/service.ts:143-144]` |
| **Measurement — BUILT (pure)** | — | `resolveProgress(stored, derive)` `[FACT: foundation/measurement/engine.ts:56]` | routines advertises **no** M5 source (guard, ROU-14) |
| **Journals — BUILT** | `JournalContribution {module, sectionKey, dataPoints, summary(date), dueIn?}` `[FACT: services/journals/types.ts:58-64]` | `createXJournalContribution` + `registerXJournal(registry, svc)` + `registerXDueProvider(sessions, svc)` (11 modules; canonical `services/tasks/journal.ts:35-58`) | `DueItem {source_module, ref_id, label, est_minutes, urgency, hard_deadline?}` `[FACT: services/sessions/types.ts:225-232]` |
| **Preferences — BUILT, no policy keys** | `PreferencesService` — routines-relevant field `push_routines` only `[FACT: services/preferences/service.ts:84]` | — | the policy store is a recorded deferred home (`schema-audit-deferred-homes.md:263-264`) → §5 R4 |
| **RRULE** | `ical.js` (ADR-001 canonical parser) | `ICAL.Recur.fromString(rule).iterator(ICAL.Time.fromDateString(ymd))` — Tasks' private `nextOccurrence` `[FACT: services/tasks/service.ts:155-173]` | dates built from calendar fields, never `toISOString()` (the g2 B1 TZ bug) |
| **Health — NOT BUILT** | no `services/health` `[FACT: ls services/]` | — | `exercise` steps → §5 R5 |

**Drive-error map (substrate throw → routine outcome):**
| Substrate throw | Routine outcome |
|---|---|
| `TaskNotFoundError` · habits `Error('Habit not found')` (untyped) · `SessionTypeNotFound` | `EntityUnavailable` (rule 15). The habit case needs a defensive match because it is untyped |
| `RecurrenceRegenError` (task completion already durable) | the step **is** done: stamp the ledger, surface the flag (TAS-23 complete-but-flag) |
| `BackfillWindowError` | rejected, no ledger stamp (the entity refused the date) |
| `NoEffectHandler` (only reachable via `completeSession`, which routines does not call, N9) | not done, no stamp |

---

## 2. NEEDS — preconditions for the service to function
- **N1 · Vault ready before any write.** Every repository write computes `computeSyncHash`, which needs libsodium loaded, so
  the composition root must `await initVault()` before the first write. Tests do this via the live-store harness
  `[FACT: memory repository-writes-need-initvault-even-in-m1; foundation precedent]`. Routines adds no new boot step.
- **N2 · Entity types registered:** satisfied by the seed (§1a). `routine_step` is also the `entity_type` a session
  attaches to (sessions validates attach against `entityRegistry.isRegistered`) `[FACT: sessions/service.ts:393]`.
- **N3 · Injected deps (D1 + seam-contract):** `db`, `deviceId`, `clock?` (built `[FACT: routines/types.ts:28]`), **`tasks: TasksService`
  (required, D1)**, `habits?`, `sessions`, `spaces`, `notes`, `effects?: {rail, registry}`, `prefs?`, plus the foundation deps the seam-contract names. The exact required-vs-optional split is reconciled at Step 4/5 against (a) the governing
  seam-contract and (b) the shipped factory convention: Tasks/Habits make foundation deps **optional + fail-loud**
  (`TasksDepNotWiredError`) `[FACT: tasks/types.ts:351-356]`. **Resolved at the Re-scope Gate (Victor): the approved seam governs, so `sessions`/`spaces`/`notes`/`registry`/`tasks` are required.** The seam-contract's **`registry` dep is not needed for REGISTRATION** (§1a seed), **but it is needed to VALIDATE `entity_type`**
  at `addStep` (R2; the sessions `entityRegistry` precedent `[FACT: sessions/service.ts:114-115,393]`), so it stays. **`measurementSources?` is
  dead** given rule 12 (no M5 source).
- **N4 · Session sub-types:** a session-driven step can only launch a sub-type the `SessionRegistry` resolves. In M1 that is
  `focus`; others throw `SessionTypeNotFound` (§1b) → §5 R5.
- **N5 · Composition-root registration is NOT this track's.** The journal contribution + due-provider + service wiring into
  `apps/web` belong to the routines **entity close** (fe-routines ②) `[FACT: docs/specs/foundation/golive-replan/process.md §4]`.
  ① ships the `register*` helpers (the 11-module convention) but does not call them.
- **N7 · Drive first, stamp second (no cross-service transaction).** Each service's repo commits on its own, so routines
  cannot share a transaction with tasks/habits/sessions. Order = drive the entity, then on success upsert the ledger. If the
  ledger write fails after a successful drive, a retry is safe (entity side idempotent per §1b; ledger upserts per (step,date)).
  The reverse order would create the "ledger done without entity" state rule 15 forbids `[INTERP from rule 1 + §1b]`.
- **N8 · Effect emission needs the producer guard.** D3's routine-level emission needs `effects: {rail, registry}` and must
  check `registry.resolve(type)` before `applyEffect`. Otherwise every call throws `NoEffectHandler` in M1 (§1b; habits precedent).
- **N9 · A focus step completes through `completeFocus`, not `completeSession`.** `completeFocus` completes the focus timer row
  only. It fires **no** effects and does **not** transition the session spine `[FACT: services/sessions/service.ts:507-531]`. So the
  completion leg is live today. `completeSession` would throw `NoEffectHandler`, because nothing registers `attach_pomodoro`
  (§1b; `log_time` is registered only by `registerTasksTimer` `[FACT: services/tasks/service.ts:112-126]`), so routines must not
  call it. **Quirk to respect:** after `completeFocus` the spine stays `in_progress`, so `findOpenSessionForEntity` still returns it.
  A re-entering focus step must read the focus row's status, not trust "open spine = running". *(Re-scope-gate correction of the
  Step-3 critique's N9, which assumed the completeSession path.)*
- **N6 · Clock:** "today" = UTC calendar day (the platform convention, `utcDay`) `[FACT: services/tasks/service.ts:178-199]`.

---

## 3. ORGANIZATION — owns · consumes · delegates
| Concern | Routines OWNS | CONSUMES (read via contract) | DELEGATES (write via owner's API) |
|---|---|---|---|
| Definition | routines + steps CRUD, order, lifecycle | — | — |
| Occurrence record | the step-occurrence ledger (`routine_completions`) incl. logged skips; planned skips (`skip_dates`) | — | — |
| Driving a step | resolving step→target, choosing the drive path | entity state (`getTask`, `getHabit`, `findOpenSessionForEntity`) | completion of the entity: `tasks.completeTask` · `habits.logCompletion` · `sessions.createSession` + `attach` + `completeSession` |
| Derivation | evaluate (policy over ledger) · progress (`resolveProgress`) · streak/rate/ranking/comparison | policy config (prefs port) | — |
| Cadence | expanding `recurrence_rule` into occurrences (`ical.js`) | — | slot placement (Scheduler, homed forward — §5 R3) |
| Rewards | — | — | routine-level `award_xp` + `contribute_purpose_metric` via `effects.rail` (D3); never writes XP/ledger |
| Tags / notes / links | — | tag reads (associations) | `spaces.tagEntity` · `notes.ensureEntityNote` · `spaces.createLink` |
| Providers | `summary(date)` · `getDueReminders(range)` · `register*` helpers | — | the registry/due lane belong to Journals/Sessions |

Shape: `createRoutinesService(deps)`, a factory-object with hoisted closures and no `this.` (the as-built S1–S3 shape; the
15-module convention). It is thin on writes and thick on composition and derivation.

---

## 4. IMPLICIT RULES (numbering kept stable from the 2026-10-14 version; ✱ = changed by this refresh)
1. ✱ **A driven step completes its entity ONCE, through the entity's API. The routine stamps its own occurrence row and never
   fires the entity's effects.** ADR-004 §3.2.4 defines "no double-count" as one XP / one habit-occurrence per event (mechanism
   §3.2.5). The ledger row is the routine's occurrence record, not a second entity completion `[FACT: documentation-gate.md U1]`.
2. **Never write XP.** Emit only; the registered handler (Gamification) writes `consequence_ledger`, idempotent via
   `effect_event_id` `[FACT: conventions.md:39-41; ROU-21]`.
3. **Derive, never cache.** Routine done/streak/analytics recompute from the ledger; `progress` stays a nullable override
   (`resolveProgress`) `[FACT: RT-14; routines.ts:59]`.
4. ✱ **Policy is configuration, not code — and entirely the USER's (S4, Victor 2026-10-22).** the shipped default = Spaces templates/presets (SP5, `docs/intake/spaces.md:183-185`); routines reads the user's policy and flags `policy_source:'undefined'` when none resolves. *(Superseded text:)*  It is read through a prefs port with a shipped default when absent (the habits
   `HabitsPrefsPort` fail-open precedent `[FACT: habits/types.ts:36-46]`). The default *values* are not stated by the docs
   except "a planned skip is neutral" (RT-8) → §5 R4.
5. ✱ **`step_type` is OPEN vocab, stored as given (no M1 registry).** Validation happens where a registry exists:
   `entity_type` against `TaggableTypeRegistry`, and a session sub-type against `SessionRegistry` at drive time → §5 R2.
6. ✱ **App-layer cascade, split by delete kind.** Archive/soft-delete of a routine or step **preserves** the ledger (RT-17;
   ROU-03; seam-contract:33). Completions hard-delete only with a hard **purge** of their step `[FACT: routines.ts:103;
   documentation-gate.md A10]`. *(The 2026-10-14 text "hard-delete completions on routine delete" is superseded.)*
7. **`findWhere` skips the soft-delete filter.** Add `isNull(deleted_at)` explicitly (as-built does) `[FACT: routines/service.ts:194-199]`.
8. **`create()` echoes the input.** Backfill NN defaults (as-built `serializeRoutine`/`serializeStep`) `[FACT: :131-158]`.
9. **`skip_dates` is plain-text JSON.** The service serializes it and parses defensively `[FACT: :52-59,146-165]`.
10. **The M1.0 `[E]` seam is empty** (`encryptedFields: []`); wiring is homed to M3/DB-5 `[FACT: ROU-32]`.
11. **Row ≠ `@vida/types` interface.** Map with the `_sync_status` union cast (as-built mappers) `[FACT: :61-75]`.
12. **Advertise no M5 source.** The streak is a READ seam Gamification pulls (D3) `[FACT: ROU-14,16]`.
13. **Provider/emit failures are isolated.** A post-commit fan-out failure never fails the write (the habits pattern
    `[FACT: habits/service.ts:151-159]`); `ProviderEmitFailed` stays isolated (ROU-30).
14. ✱ **Notes/tags target `routine_step` (+ `routine`)**: D2, pre-seeded (§1a). `routine_action` is retired.
15. ✱ *(S5c-amended: targets are task (check-offs ARE tasks) · habit · focus · any REGISTERED session sub-type; an unregistered sub-type is a borrowed leg of its owner; routines registers none.)* **The drive path is chosen by the step's target, and an unavailable target is a typed state.** A missing/deleted entity,
    or an unshipped session sub-type, → `EntityUnavailable` (RT-3 fail-loud). It never becomes a silent skip and never a
    ledger "done" `[FACT: ROU-30; contract.md:54]`.
16. ✱ **Calendar dates are `YYYY-MM-DD`** (ADR-002 §2.8). Validate the format at the boundary; build dates from calendar
    fields, never `toISOString()` of a local date (the g2 B1 TZ trap) `[FACT: ADR-002-data-model.md:119; tasks/service.ts:163-169]`.
17. ✱ **Re-complete is effect-idempotent on both sides, not write-idempotent.** The ledger upserts per (step,date) (as-built).
    On the entity side, `completeTask` re-writes but only fans out on a fresh transition, and habit effects dedup on
    `completed:<date>` (§1b). The routine adds no guard that changes these semantics, and passes `date` explicitly to
    `logCompletion` so the habit occurrence lands on the routine's occurrence date.
18. ✱ **A session step's link is an ADR-004 §3.2.1 instance attachment to the `routine_step`.** For focus that means
    `startFocus({})` + `sessions.attach(session_id,'routine_step',stepId,'instance')` *(S3-amended: `startFocus({attach})` needs a pre-existing
    `sessionId`)*, detached after completion (N9 workaround). The step reflects the session's lifecycle
    without reading `session_attachments` (§6 coupling). Re-entry finds a **running** session via `findOpenSessionForEntity`
    (in_progress only) `[FACT: sessions/service.ts:131-139,428,444-469]`. Note: the instance attachment makes the step an effect target.
19. ✱ **Routine/step notes use `pageType:'note'`.** `PAGE_TYPE` is CHECK-fixed with no routine type `[FACT: packages/types/src/note.ts:23-30]`
    (books/knowledge precedent `[FACT: services/books/service.ts:684]`).
20. ✱ **Archive/purge never touches driven entities.** Deleting a routine or step removes routines' own rows only; the habit/task/
    session it drove is untouched (single source of truth, RT-3/RT-9).
21. ✱ **The D3 emission trigger is a WRITE path, not `evaluateRoutine`.** Evaluation is a read. The routine-level `award_xp` +
    `contribute_purpose_metric` fire on the ledger write that makes the routine's evaluation reach policy-done for that date,
    keyed `subjectNaturalKey=routine.id`, `transition='completed:<date>'` (the habits key shape `[FACT: habits/service.ts:145-149]`).
    `award_xp` is additive, so an undo after done does **not** retract (the same as habits). The exact write path is pinned in the
    effects slice PLAN `[INTERP, habits precedent]`.
22. ✱ *(S5c-amended: a STANDARD task step's occurrences are Tasks `work` sessions (D3), so the Task is never completed by the routine and no reflect-forever limit exists; only OBLIGATION steps keep completeTask + the lineage limit.)* **RESOLVED in S3 (PLAN-S3):** reflect the referenced task; chain-following not owed (tasks G8 + duties D3). *Original:* **[UNKNOWN] Task step in a recurring routine.** A task step references one task id. After the first completion,
    re-driving it on later occurrences changes nothing on the task, and an obligation's next occurrence is a **new id** the step
    does not re-point to (§1b). No doc fixes whether a task step is (a) a one-shot ("done until the task is reopened"), (b) a
    follower of the obligation chain, or (c) per-occurrence. Checked: routines intake §D ("a Tasks step of type standard/duty/
    obligation"), duties intake RESOLUTION (dissolved into Tasks + Spaces), tasks TK-7. **Resolution path:** ground it at the
    run/drive slice PLAN; if the docs still don't settle it there, it is a Victor call.
23. ✱ **RESOLVED in S3 (PLAN-S3):** step done ⇔ habit done (HB-5); a run = one native tick, and a repeat run is a patch (no +1). *Original:* **[UNKNOWN] Habit tick vs habit done.** One routine run of a habit step = one `logCompletion` (`count` +1). A habit with
    `target_count > 1` is not "done" after one tick (§1b). Whether the step counts as done after one tick or only when the
    habit reaches its target is unsettled (RT-3 "the routine reflects the entity" suggests the latter). **Resolution path:**
    same as 22, grounded in HAB-07/HB-5.

---

## 5. Decisions + resolutions

### Approved decisions (Victor 2026-10-14) — unchanged
- **D1 — Build Tasks first; then `tasks: TasksService` is a REQUIRED dep** (not a deny-safe port). mod-tasks shipped (PR #145),
  so the resume condition is met. `EntityUnavailable` now applies only to genuinely missing/deleted tasks.
  `[DECISION: Victor 2026-10-14]`
- **D2 — Notes/tags/links target `routine_step` (+ `routine`)**; `routine_action` retired. Registration is satisfied by the
  `ENTITY_TYPES` seed (§1a).
- **D3 — Two-seam completion.** A step completion drives the entity (which fires ITS effects). The routine-level policy-done
  emits the routine's `award_xp` + `contribute_purpose_metric`. The streak is a READ seam (no advertise). Different subjects mean
  different `effect_event_id`s, so this is not an RT-3 double-count (documentation-gate.md §A note).

### Resolutions of the Documentation-Gate UNKNOWNs (doc/code-derived — not decisions)
- **R1 (U1) — Ledger semantics:** FACT from ADR-004 §3.2.1/§3.2.4/§3.2.5 → rules 1, 17, 18.
- **R2 (U2) — `step_type` validation:** no step-type registry exists, and none is owed in M1. The user-extensible step/session *(S5c: `step_type` names a registered session sub-type (or 'exercise'→workout, 'work'→the task's timer); otherwise the task/habit ref; a check-off step (no ref) becomes a Task.)*
  type registry is ROU-25 (Spaces/007/SP5 pass, deferred) `[FACT: db-4-routines/_index.md:33 "User-extensible step/session
  types → the Spaces/ADR-004 registry"; backend-intent ROU-25]`. M1 validates what has a registry: `entity_type` against
  `TaggableTypeRegistry`, and a session sub-type against `SessionRegistry` (at `createSession`).
  **`step_type` ↔ target `[INTERP, grounded in ROU-04 + intake §D:88-98]`:**
  - `step_type ∈ {'habit','task'}` → the target is the step's `entity_type`/`entity_id`.
  - `step_type` = a session-driven step → drive = start that session sub-type (focus: `startFocus`) + an instance attach to the
    step. `step_type` is **not always** the sub_type: intake §D maps `exercise` → a Health `workout` session `[FACT: intake/routines.md:94-98]`.
    The step's optional `entity_type`/`entity_id` = what the session is *about* **[INTERP — open]**. Its attach level is also open,
    because an instance attachment makes it an effect target (ADR-004 §3.2.4 scoping). Pinned at the run/drive slice PLAN.
  - `step_type` null + no entity → an actionable (alarm-like) step that completes in the ledger (A11).
  - Unknown or extended values → stored as-is; drive → `EntityUnavailable`.
- **R3 (U3) — Reschedule + cadence:**
  - **Cadence expansion** for `dueIn`/`summary`/evaluate is the routine's own job over `recurrence_rule`, via `ical.js` (§1b).
    No Scheduler is needed.
  - **Slot placement** (find an open, fitting slot) is the Scheduler's G5 algorithm, homed to the **M1.2 study-planner**
    `[FACT: docs/roadmap/m1.1-delivery-plan.md:247; sessions-and-scheduling/identity.md:54]`.
    By first-consumer-pull + build order (routines = M1.1.2, earlier), ROU-10's **auto-slot leg is a borrowed leg homed
    forward**.
  - **This amends the governing slice-map S6** ("asks the Sessions Scheduler for an open fitting slot" `[FACT: slice-map.md:38]`).
    The seam's `rescheduleStep(stepId, date)` already takes a caller date `[FACT: seam-contract.md:53]`. The named home issue for
    the auto-slot leg is fixed at the Re-scope Gate (golive process §3 requires a named owner, not just a milestone).
  - M1 `rescheduleStep` ships the routine-owned legs: move a missed occurrence to a caller-given date/slot, acceptance-window
    check → `OutsideAcceptanceWindow`. The auto-slot leg degrades honestly (golive process §3 borrowed legs).
- **R4 (U4) — Policy store:**
  - ⟲ SUPERSEDED (S4): no routines-side default; an unresolved policy is `policy_source:'undefined'`. *(Original:)* Read through an optional **`RoutinesPrefsPort`** that falls back to the shipped default (fail-open, "not a security gate", the
    `HabitsPrefsPort` precedent `[FACT: habits/service.ts:130-131]`).
  - ⟲ SUPERSEDED (S4): no routines-side default; an unresolved policy is `policy_source:'undefined'`. *(Original:)* **The fallback must be FLAGGED.** ROU-30 / slice-map S4: `PolicyUndefined` → "shipped default, **flagged**". `RoutineEvaluation`
    has no field for that today `[FACT: seam-contract.md:58-60]`, so this is a seam amendment for Step 4/5.
  - The Preferences-side keys are Preferences-owned, a recorded deferred home `[FACT: schema-audit-deferred-homes.md:263-264]`.
  - ⟲ **SUPERSEDED (S4):** there are no routines-side default values to set; that framing was drift. the shipped default = Spaces templates/presets (SP5, `docs/intake/spaces.md:183-185`); routines reads the user's policy and flags `policy_source:'undefined'` when none resolves. *(Original:)* **Open, small, deliberately deferred:** the shipped default *values* (completion policy, threshold, acceptance-window
    length). The docs say "ships a default" without naming values, so these are a **Victor call at the evaluate slice's PLAN**.
    The only stated default is "planned skip = neutral" (RT-8). This does not change the yardstick's shape.
- **R5 (U5) — Live drive targets in M1:** *(S5c-amended: habit · task (3a work-session occurrences / 3b obligation completeTask) · focus · ANY registered session sub-type, lifecycle-aware; unregistered → borrowed leg; routines registers no sub-type.)*
  - **habit** (HabitsService) and **task** (TasksService): live.
  - **focus** session: **live**. Start via `startFocus({})` + `attach`, complete via `completeFocus` + detach (N9, S3). Not via `completeSession`.
  - `exercise`/`workout` (no Health service; no shipped sub-type) and other session sub-types → `EntityUnavailable` until their
    owner registers them. These are borrowed legs, and their named home issues are fixed at the Re-scope Gate.

### Reconciliation inputs surfaced here (for Step 4 — not decided here)
- Factory dep split (N3): seam-contract "required" vs the shipped optional+fail-loud convention.
- Seam amendments: the `skipStep`/`planSkipDates` split (§XXVIII, as-built S3); `completeStep`'s return now distinguishes
  drive + occurrence; `rescheduleStep`'s borrowed auto-slot leg (R3).
- `RoutineEvaluation` gains the PolicyUndefined flag (R4); keep `registry` (validation), drop `measurementSources` (N3).
- UNKNOWNs 22–23 are pinned at the run/drive slice PLAN.
- Baseline F1 (drive leg missing), F2 (date format, rule 16), F4 (`setLifecycle`), F5 (deps), F6 (day helper), F7/F8 (stale prose).

---

## 6. Envision Gate — SKIP (stated, not skipped silently)
Trigger test (entity-delivery-flow §3.75): "a user affordance whose UI answer isn't obvious from a shipped surface?" This ①
renders **no surface**. The today-list, run flow, standalone page and policy UI are fe-routines ② (P6), which runs its own
Envision Gate `[FACT: slice-map.md "Envision Gate: N/A (pure backend)"; backend-intent routines.md:5]`. **Cross-plane note:** the
reconciliation sweep (Step 4) still checks the ② plane. There is no built routines surface today (`apps/web` has none), so the
② column is "not started", which is fe-routines' scope and not a ❌.

## Completion checklist
- [x] DEPENDENCIES — built floor + substrate signatures **and their throws** verified in code (incl. startFocus/completeFocus, NoEffectHandler,
      RecurrenceRegenError, BackfillWindowError, PageType), cited; drive-error map
- [x] NEEDS — vault, registry seed, deps, session sub-types, composition root (not this track), clock, drive-then-stamp ordering,
      effect producer guard, focus completes via completeFocus
- [x] ORGANIZATION — owns / consumes / delegates table
- [x] IMPLICIT RULES — 1–23 (✱ = changed), each cited; 22–23 explicit [UNKNOWN] with a resolution path
- [x] Gate UNKNOWNs U1–U5 resolved (R1–R5) or explicitly deferred with an owner (R4 values → evaluate PLAN)
- [x] D1–D3 preserved verbatim in substance · Envision SKIP stated
