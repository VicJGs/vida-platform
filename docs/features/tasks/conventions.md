<!-- Conventions — features/tasks · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · life-os tasks · intake -->

# Conventions — Tasks  (level: Feature)

## How to build here
- **Aggregate through the parent FKs + integration points, never direct table reads.** To show a project's/course's/contact's tasks, query by FK and read the parent's data via its contract — never `SELECT` another module's tables (TK-9, §6). `[INTENT G2; FACT core §6]`
- **Enforce ≤1 parent at write time.** A task sets at most one of `project_id`/`milestone_id`/`course_id`/`contact_id`; a milestone implies its project (TK-2). `[INTENT G2]`
- **Sub-tasks are one level.** Do not allow a child to have children; show parent progress as a rollup, don't cascade completion (TK-3). `[INTENT G3]`
- **Time is one ledger.** `actual_minutes` is always `SUM(task_time_logs.duration_minutes)` — recompute on timer stop and on pomodoro-session close; never set `actual_minutes` by hand. Honor the per-task opt-out (TK-5). `[INTENT G4]`
- **Completion sets `completed_at`.** On `status→completed` set the timestamp; on reopen clear it. Don't use `updated_at` as a completion signal (TK-6). `[INTENT G5]`
- **Obligations recur, standard tasks don't.** Only `kind='obligation'` carries a recurrence rule; completing one spawns the next occurrence. Behavior recurrence is a Habit/Routine, not a task (TK-7). `[INTENT G8]`
- **Views are saved configs.** A view = {layout + grouping + filter + sort + fields + style}; build the renderers off one config schema so any layout composes with any grouping/filter (G1). `[INTENT G1]`
- **Tag via the shared system.** Use `tags`/`page_tags`, not an inline per-task list (TK-8). `[INTENT G7]`
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
- **Never** reintroduce an inline per-task tag list — use shared tags (TK-8). `[INTENT G7]`
- **Never** read another module's tables to build the aggregated view — go through integration points (TK-9). `[FACT: §6]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
