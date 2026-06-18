<!-- Business Rules — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · task.ts · intake -->

# Business Rules — Tasks  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **TK-1 — Encrypted content.** `title`, `description`, and tag associations are `[E]` (client-side, ZK-1); status/priority/difficulty/dates/estimates are plaintext config. `[FACT: ADR-002 L1472-1473, L1483; task.ts @encrypted]`
- **TK-2 — At-most-one parent module.** A task sets **at most one** of `project_id` / `milestone_id` / `course_id` / `contact_id` (mutually exclusive); a `milestone_id` implies its parent project. A task with none is a **standalone** task (first-class). `[INTENT G2; FACT: ADR-002 nullable FKs]`
- **TK-3 — Sub-tasks are one level; parent rolls up, never force-completes.** A task may have children (`parent_task_id`) but children may not have their own children (single level). The parent displays a **progress rollup** from its children; completing a parent does **not** auto-complete children, and vice-versa. `[INTENT G3]`
- **TK-4 — Cascade delete.** Deleting a task deletes its sub-tasks and its `task_time_logs` (`ON DELETE CASCADE`); parent-module deletion `SET NULL`s the link, never deletes the task. `[FACT: ADR-002 L1471, L1466-1470, L1513]`
- **TK-5 — Time is one ledger.** `actual_minutes` is the **auto-sum** of the task's `task_time_logs.duration_minutes`. The start/stop timer and any pomodoro focus session bound to the task both write `task_time_logs`; nothing else mutates `actual_minutes`. A task may **opt out** of time tracking (no logs, no rollup). `[INTENT G4; FACT: ADR-002 task_time_logs; §5.2 pomodoro]`
- **TK-6 — Completion is a status + a timestamp.** A task is complete iff `status='completed'`; on that transition `completed_at` is set (⚠ INTENDED). Re-opening clears it. `updated_at` is not a completion signal. `[INTENT G5]`
- **TK-7 — Obligations regenerate.** A task with `kind='obligation'` (⚠ INTENDED) carries a recurrence rule; completing it **spawns the next occurrence** with the next `due_date`. Only obligations recur — standard tasks never do. `[INTENT G8]`
- **TK-8 — Shared tags, single vocabulary.** Tasks tag through the shared `tags`/`page_tags`-style system (one cross-app vocabulary, §3), not a private list. `[INTENT G7]`
- **TK-9 — Aggregation reads, never owns.** The aggregated view reads parent-module data through documented integration points (the FKs + their read APIs); Tasks never reads another module's tables directly (§6). `[INTENT G2; FACT: core §6]`
- **TK-10 — Local-first.** Every create/edit/complete/timer action succeeds locally first; multi-device reconciles LWW on structured columns. `[FACT: LF-2; ADR-003]`

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
| View-builder | loading saved views | "no custom views — use a preset" | save fails → keep editing, typed error | named view saved/pinned |

## Failure behavior (fail loud — constitution §5)
- A failed save/timer reverts the optimistic state and surfaces a typed error — never silent data loss. `[INTENT G4; FACT §5]`
- An obligation that completes but can't regenerate (bad rule) still completes, and **flags** the missing next occurrence loudly — never silently stops recurring. `[INTENT G8]`
- An aggregation source being unavailable degrades that group to an explicit empty/error state, not the whole view. `[INTERP TK-9]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
The following are **INTENDED**, not in ADR-002 §5.3 / `task.ts` today — TK-6/7/8 + view-builder depend on them: `completed_at`, `scheduled_date`, recurrence rule + `kind` (`standard`/`obligation`), saved-views persistence (`task_views`), and migration of inline `tasks.tags` → shared tags. All converge into one **ADR-002 amendment** in the build phase. Until then, the live invariants are TK-1..TK-5, TK-9, TK-10. `[FACT: ADR-002 §5.3; INTENT G1,G5,G6,G7,G8]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
