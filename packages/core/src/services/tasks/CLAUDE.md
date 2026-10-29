# services/tasks — per-module business logic

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is

Tasks, sub-tasks, time logs, cross-module FK links; measurement + effect emission

## Owning ADR / context

tasks context

## Pattern

Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status

**① BACKEND COMPLETE — S1–S9 BUILT** (mod-tasks #65 · LIF-142): `createTasksService` — S1 CRUD + ≤1-parent guard +
app-layer cascade + list filters (DB-4 `tasks`/`task_time_logs`, migration 015; DB-11 reconcile) · S2 sub-tasks + M4
derived rollup · S3 `completeTask`/`reopenTask` + deny-safe completion fan-out (`[award_xp, contribute_purpose_metric,
emit_measurement_signal]`; Tasks IS a §4 feeder; `surface_journal`/`surface_calendar` are PULL projections, never pushed)
· S4 `startTimer`/`stopTimer`/`getActualMinutes` + `registerTasksTimer` + `log_time` handler (timer = a `'work'` session
sub-type; `log_time` writes the kept `task_time_logs` ledger via the rail, never direct — G-S4) · S5 `setRecurrence` +
obligation regen (RRULE via canonical `ical.js`) · S6 `getTaskProgress` (pursuable `progress()`, derived-on-read;
`binding_mode` READ-side) · S7 `getAggregatedTasks` (R7 fan-out over the SHARED `foundation/views` `ViewProviderRegistry`;
top-level grain; per-group degradation) · S8 `tagTask`/`untagTask`/`getTaskTags` (via `spaces.tagEntity`, live-tag guard)
· `getTaskNote` (`task_note` page via `ensureEntityNote`) · `saveView`/`listViews` (a task view = `views` row with
`entity_types` EXACTLY `['task']`; REPLACE semantics) · `TASK_VIEW_PRESETS` + `kind` filter · `createTasksReadProvider`/
`registerTasksReadProvider` (tasks AS a `ReadProvider`: by-id short-circuit, per-key validation, top-level grain,
`tags` = membership incl. NESTED, union) · **S9 `getDayTasksSummary(date)` (the Journal `/summary` SET per the GOVERNING
`docs/core/architecture/cross-module-integration.md` §2 row — every task due/scheduled/completed on the date, with
title·status·priority + membership flags; the day of `completed_at` = the UTC calendar day via `utcDay`, the shipped (6-module, 7-site)
platform convention) · `getDueReminders(range)` (the SS-7 due-bucket: OPEN tasks whose `due_date` OR `scheduled_date`
is in the window, `hard_deadline` = due date, UTC-midnight conversion, total deterministic order) · `journal.ts`
(`createTasksJournalContribution` summary-only · `registerTasksJournal` · `registerTasksDueProvider` — ONE due-work
registration, on Sessions, SS-7) · TAS-29 `TaskViewConfig` + `TaskViewConfigSchema` · TAS-32/36 RATIFY.**
Deps after S1 are optional + fail-loud (`TimerNotWiredError`, `TasksDepNotWiredError`); `'task'` is pre-seeded (no
`registry` dep); S9 adds no dep (registry handles are PARAMS to the register helpers). `pinView`/`reorderViews` are
Preferences-owned (ADR-007 §3.5) — not here. `todayYmd()` (S5 regen anchor) rides `utcDay` (re-pointed at S9); "open" = status ∉ `{completed, cancelled}` (`ListTasksFilter.open`; the platform TERMINAL convention). Composition root (the CALLS of the
four `registerTasks*` helpers) = UI-3 / M1.1+.
Durable docs: `docs/modules/tasks/current-{spec,business-rules}.md` (BR-TK-S1..S9); slice specs
`docs/features/tasks/delivery/PLAN-S*.md`. **Test gate:** better-sqlite3 live-store, Node 22 per `.nvmrc` (ABI 127; after
switching Node, `pnpm -r rebuild better-sqlite3`); `packages/core` has no `lint` script — run eslint from the repo root.
