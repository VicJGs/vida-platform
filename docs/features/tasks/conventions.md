<!-- Conventions — features/tasks · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · life-os tasks · intake -->

# Conventions — Tasks  (level: Feature)

## How to build here
- **Aggregate through the parent FKs + the R7 read seam, never direct table reads.** To show a project's/course's/contact's tasks, query by FK and read the parent's data via its documented list/query API (the **R7** seam — the same one the aggregated `views` ride via V4) — never `SELECT` another module's tables (TK-9, §6). `[INTENT G2; FACT core §6; INTENT R7; ADR-007 V4]`
- **Enforce ≤1 parent at write time.** A task sets at most one of `project_id`/`milestone_id`/`course_id`/`contact_id`; a milestone implies its project (TK-2). `[INTENT G2]`
- **Sub-tasks are one level; the rollup is M4.** Do not allow a child to have children; show parent progress as the ADR-011 **M4** weighted rollup (default equal-weight), derived on read (M3 — no stored progress column); don't cascade completion (TK-3). `[INTENT G3; ADR-011 M3/M4]`
- **Time is one ledger, written by a Session effect.** `actual_minutes` is always `SUM(task_time_logs.duration_minutes)` — but the write is the ADR-004 **`log_time`** S4 effect (R2/R1) fired by a **`sessions` sub-type** (S1) the timer/pomodoro opens (`attach_pomodoro` binds it); never set `actual_minutes` by hand, never write the ledger directly. Honor the per-task opt-out (TK-5). `[INTENT G4; ADR-004 S1/S4/R1/R2]`
- **Measurability: name the axes, not a bespoke type.** The task carries `measurement_kind` (`milestone`) + `binding_mode` (`event-trigger`), never a bespoke goal-type column (ADR-011 M1/M2). `[INTENT; ADR-011 M1/M2]`
- **Completion feeds the economy through Gamification.** On completion, fire the `award_xp` S4 effect (R2/R1) — which ADR-012 generalizes → **`grant_currency(XP)`** (E2) → the Gamification-owned `consequence_ledger` (E3); never write XP/points directly. `[INTENT; ADR-004 S4; ADR-012 E2/E3]`
- **Completion sets `completed_at`.** On `status→completed` set the timestamp; on reopen clear it. Don't use `updated_at` as a completion signal (TK-6). `[INTENT G5]`
- **Obligations recur, standard tasks don't.** Only `kind='obligation'` carries a recurrence rule; completing one spawns the next occurrence. Behavior recurrence is a Habit/Routine, not a task (TK-7). `[INTENT G8]`
- **Views are first-class `views` rows, not a bespoke store.** A saved view = a **`views`** row (filter × layout × grouping, ADR-007 V1); build the 12 layouts as selectable renderers off one config schema so any layout composes with any grouping/filter — do NOT build a `task_views` table (G1). `[INTENT G1; ADR-007 V1]`
- **A preset = a `views` config bound to `kind`.** A preset (T4) = a saved `views` config + per-type defaults, bound to the module's `kind` discriminator (`standard`/`obligation`); the preset never owns its own type discriminator. `[INTENT; ADR-009 T4]`
- **Tag via `entity_tags`.** Use the shared **`entity_tags`** primitive (`entity_type='task'`, SP1/SP2), not an inline per-task list and not `page_tags` (TK-8). `[INTENT G7; ADR-006 SP1/SP2]`
- **Notes via `pages`.** A task's notes are a linked `pages` row (`entity_type='task'`), never an inline column. `[FACT: ADR-002 §5.2; CLAUDE.md Conventions]`

## Naming & layout
- `kind` discriminator values are `standard` / `obligation` (⚠ INTENDED); the `obligation` class is the module's single recurrence exception. `[INTENT G8]`
- Platform-wide conventions: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates `YYYY-MM-DD`, time in **minutes** (INTEGER), soft delete, `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`
- Enums: string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core` (never TS `enum`). `[FACT: packages/types/src/CLAUDE.md]`

## Local landmines / "never do"
- **Never** add behavior recurrence to standard tasks — that's Habits/Routines (TK-7). `[INTENT G8]`
- **Never** hand-edit `actual_minutes` — it derives from the time-log ledger (TK-5). `[INTENT G4]`
- **Never** set more than one parent FK (TK-2). `[INTENT G2]`
- **Never** force-complete children when a parent completes (TK-3). `[INTENT G3]`
- **Never** reintroduce an inline per-task tag list or name `page_tags` forward — use `entity_tags` (TK-8). `[INTENT G7; ADR-006 SP1]`
- **Never** read another module's tables to build the aggregated view — go through the R7 read seam (TK-9). `[FACT: §6; INTENT R7]`
- **Never** write the time ledger or XP directly — the timer/pomodoro is a `sessions` sub-type firing `log_time`/`award_xp` S4 effects (R2/R1); Gamification owns the currency/ledger (ADR-004 S4; ADR-012 E2/E3). `[INTENT]`
- **Never** add a stored `progress` column or advertise `progress(task)` as an M5 measure — task progress derives (M3/M4); tasks are not an M5 source, and contribute to purposes via `contributions` (M4), never owning Purpose rollup tables (M7). `[INTENT; ADR-011 M3/M4/M5/M7]`
- **Never** build a `task_views` table — a saved view is a `views` row (ADR-007 V1). `[INTENT; ADR-007 V1]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
