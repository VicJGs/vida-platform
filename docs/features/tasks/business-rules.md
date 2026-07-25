<!-- Business Rules — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · task.ts · intake -->

# Business Rules — Tasks  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **TK-1 — Encrypted content.** `title`, `description`, and tag associations are `[E]` (client-side, ZK-1); status/priority/difficulty/dates/estimates are plaintext config. `[FACT: ADR-002 L1472-1473, L1483; task.ts @encrypted]`
- **TK-2 — At-most-one parent module.** A task sets **at most one** of `project_id` / `milestone_id` / `course_id` / `contact_id` (mutually exclusive); a `milestone_id` implies its parent project. A task with none is a **standalone** task (first-class). `[INTENT G2; FACT: ADR-002 nullable FKs]`
- **TK-3 — Sub-tasks are one level; parent rolls up (M4), never force-completes.** A task may have children (`parent_task_id`) but children may not have their own children (single level). The parent's `{done,total}` display is the ADR-011 **M4** weighted rollup `progress = Σ(child.progress × weight)/Σ weight` (nesting weight = a per-child col, default NULL = equal-weight); it **derives on read** (M3 — no stored progress column), and completing a parent does **not** auto-complete children, and vice-versa. `[INTENT G3; ADR-011 M3/M4]`
- **TK-4 — Cascade delete.** Deleting a task deletes its sub-tasks and its `task_time_logs` (`ON DELETE CASCADE`); parent-module deletion `SET NULL`s the link, never deletes the task. `[FACT: ADR-002 L1471, L1466-1470, L1513]`
- **TK-5 — Time is one ledger, written by a Session effect.** `actual_minutes` is the **auto-sum** of the task's `task_time_logs.duration_minutes`. The start/stop timer and any bound pomodoro run is a **`sessions` sub-type** (ADR-004 S1), and it writes the ledger via the **`log_time`** S4 effect (R2 — a documented handler, never a direct client write) idempotent via R1 (`effect_event_id`/`applied_effects`); `attach_pomodoro` (S4) binds the pomodoro run. Nothing else mutates `actual_minutes`. A task may **opt out** of time tracking (no logs, no rollup). The `task_time_logs`↔session-extension reconciliation is `[DEFERRED — build]`. `[INTENT G4; FACT: ADR-002 task_time_logs; ADR-004 S1/S4/R1/R2]`
- **TK-6 — Completion is a status + a timestamp, and an effect producer.** A task is complete iff `status='completed'`; on that transition `completed_at` is set (⚠ INTENDED). Re-opening clears it. `updated_at` is not a completion signal. The completion is the `binding_mode='event-trigger'` (M2) that advances the task measure, and it fires the ADR-004 §3.2.2 **S4** effects — `award_xp` (completion points), `contribute_purpose_metric` (if the task contributes to a purpose), `surface_journal`, `surface_calendar`, `emit_measurement_signal` — each via R2, idempotent via R1. ADR-012 **generalizes** the `award_xp` slot → **`grant_currency(XP)`** (E2 — a distinct layer, not an S4 rename). `[INTENT G5; ADR-004 S4/R1/R2; ADR-011 M2; ADR-012 E2]`
- **TK-7 — Obligations regenerate.** A task with `kind='obligation'` (⚠ INTENDED) carries a recurrence rule; completing it **spawns the next occurrence** with the next `due_date`. Only obligations recur — standard tasks never do. `[INTENT G8]`
- **TK-8 — Shared tags, single vocabulary.** Tasks tag through the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`, ADR-006 SP1), registering `entity_type='task'` in the open registry (SP2), not a private list; inline `tasks.tags` is the As-is floor, retired. `[INTENT G7; ADR-006 SP1/SP2]`
- **TK-9 — Aggregation reads via the R7 seam, never owns.** The aggregated view reads parent-module data through the **R7** read seam (documented list/query API — provider fan-out, the same seam the cross-module `views` ride via V4); Tasks never reads another module's tables directly (§6). `[INTENT G2; FACT: core §6; INTENT R7; ADR-007 V4]`
- **TK-10 — Local-first.** Every create/edit/complete/timer action succeeds locally first; multi-device reconciles LWW on structured columns. `[FACT: LF-2; ADR-003]`
- **TK-11 — The task is a pursuable (measurable).** A task carries `measurement_kind` CHECK ∈ `quantitative·milestone·rate·qualitative` (natural = **`milestone`**) + `binding_mode` CHECK ∈ `manual·derived-pull·event-trigger` (ADR-011 M1/M2). It has **no** bespoke `target_type` (pure add), stores **no** progress column (progress derives — M3, TK-3), and is **not** an M5 queryable-measure source (tasks aren't in the M5 applies-to set); it contributes UP to a purpose via `contributions` (M4 ladder), never owning Purpose rollup tables. `[INTENT; ADR-011 M1/M2/M3/M4]`

## Validation & edge cases
- Enum CHECKs: `status`∈{not_started,in_progress,completed,on_hold,cancelled}, `priority`∈{critical,high,medium,low,none}, `difficulty`∈{trivial,easy,medium,hard,expert}. `[FACT: ADR-002 L1474-1481]`
- A running timer (`end_time IS NULL`) must be closed before its `duration_minutes` counts toward rollup (TK-5). `[INTERP: ADR-002 task_time_logs]`
- Setting two parent FKs is rejected (TK-2); orphaning a sub-task (parent deleted) is impossible — it cascades (TK-4). `[INTENT G2; FACT TK-4]`
- An obligation with no recurrence rule behaves as a standard task until a rule is set (TK-7). `[INTERP TK-7]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Task list / any view | skeleton | "no tasks" / "nothing matches this view" + create CTA | typed read error, retry | rendered view |
| Create / edit task | — | — | validation error (bad enum / two parents) surfaced inline | persisted, optimistic |
| Sub-task rollup | computing | "no sub-tasks" | child read error → show partial + flag | "x/y done" on parent |
| Timer (start/stop) | starting | no logs yet (opted out or none) | start/stop fails → revert, typed toast | running indicator; on stop a log + rollup |
| Obligation completion | — | — | recurrence-rule parse error → complete but flag (no regen) | completed + next occurrence created |
| View-builder (`views` row, V1; R5 states) | loading saved views | "no custom views — use a preset" (T4) | save fails → keep editing, typed error | named `views` row saved/pinned |

## Failure behavior (fail loud — constitution §5)
- A failed save/timer reverts the optimistic state and surfaces a typed error — never silent data loss. `[INTENT G4; FACT §5]`
- An obligation that completes but can't regenerate (bad rule) still completes, and **flags** the missing next occurrence loudly — never silently stops recurring. `[INTENT G8]`
- An aggregation source being unavailable degrades that group to an explicit empty/error state, not the whole view. `[INTERP TK-9]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
The following are **INTENDED**, not in ADR-002 §5.3 / `task.ts` today — TK-6/7/8/11 + the view-builder depend on them: `completed_at`, `scheduled_date`, recurrence rule + `kind` (`standard`/`obligation`), `measurement_kind`/`binding_mode` (M1/M2), saved-views persistence via the **`views`** primitive (ADR-007 V1 — retiring the schema-0 `task_views` build target), and migration of inline `tasks.tags` → **`entity_tags`** (SP1). All converge into one **ADR-002 amendment** in the build phase. Until then, the live invariants are TK-1..TK-5, TK-9, TK-10. `[FACT: ADR-002 §5.3; INTENT G1,G5,G6,G7,G8; ADR-011/006/007/009/004/012]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
