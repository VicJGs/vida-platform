<!-- Structure & Data — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · task.ts · ADR-001/003 · intake -->

# Structure & Data — Tasks  (level: Feature)

## Data model — 2 owned tables (current, authoritative) `[FACT: ADR-002 §5.3 L1462-1525; task.ts]`

| Table | Purpose | `[E]` | Key constraints |
|---|---|---|---|
| `tasks` | the task | `title`, `description`, `tags` (JSON) | 4 parent FKs `SET NULL`; `parent_task_id` self-ref **CASCADE**; status/priority/difficulty CHECKs; partial indexes on status & due_date |
| `task_time_logs` | time ledger | — | `task_id` **CASCADE**; `start_time`/`end_time`/`duration_minutes` |

- `tasks` columns: `project_id`, `milestone_id`, `course_id`, `contact_id`, `parent_task_id`, `title`[E], `description`[E], `status`, `priority`, `difficulty`, `due_date`, `estimated_minutes`, `actual_minutes`, `tags`[E], `sort_order`, soft-delete, `_sync_*`. `[FACT: ADR-002 L1465-1490]`
- Indexes: per parent FK + parent_task + partial `(status)`/`(due_date)` where `deleted_at IS NULL`. `[FACT: ADR-002 L1501-1507]`
- Structured columns sync **LWW** (no CRDT — tasks aren't editor documents). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / task.ts today) — one ADR-002 amendment `[INTENT G1,G5,G6,G7,G8]`
- `tasks.completed_at` (G5) — completion timestamp.
- `tasks.scheduled_date` (G6) — planned date, distinct from `due_date`.
- `tasks.kind` ∈ {`standard`,`obligation`} + recurrence rule fields (G8) — deadline recurrence for obligations.
- **`task_views`** store (G1) — saved view configs {layout, grouping, filter, sort, fields, style}, ordered/pinnable. Table or JSON store TBD (build-phase decision).
- **Shared-tags migration** (G7) — deprecate inline `tasks.tags` JSON in favor of the shared `tags`/`page_tags` system.

## State management map `[INTENT G4; FACT: ADR-001 State; life-os useTasks]`
- **React Query** owns task reads/writes — `listTasks`/`getAggregatedTasks`, optimistic create/edit/complete, paginated lists for large sets.
- **Zustand** owns ephemeral UI: active view, view-builder draft, running-timer state, board drag state, selection.
- `actual_minutes` is **derived** (sum of time logs, TK-5) — never edited directly; the timer mutation recomputes it.

## Page / route map `[INTENT G1; FACT: CLAUDE.md §3]`
- **All-Tasks screen** hosting the **12 base layouts** (List · Grouped · Board · Calendar · Today · Table · Timeline/Gantt · Tree · Matrix · Swimlanes · Focus · Gallery) + the **view-builder** (compose & save named views).
- **Task detail** — fields, sub-tasks (rollup), time logs, linked note (`pages`), pomodoro/focus (G9).
- Aggregated entry points from parent modules (a project/course/contact page lists its tasks via the FK).

## Dependencies / graph
- **Wave 1 (independent domain)**, but an **aggregator**: out-edges to Projects/Learning/Relationships (parent FKs, read via integration points) and to Notes (notes page + pomodoro ledger). In-edges: Journal `/summary`, Gamification read completion. `[FACT: docs/core/architecture/module-dependency-graph.md; intake]`
- Respects the coupling budget — no direct cross-module table reads (TK-9, §6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- `Status`, `Priority` (shared, from `@vida/types/common`), `TaskDifficulty` (`task.ts`) — string-literal unions + SQL CHECK + Zod in `@vida/core`, declared once. `[FACT: task.ts L6,13; packages/types/src/CLAUDE.md]`
- `actual_minutes` derives from `task_time_logs` (one ledger, TK-5) — not a second hand-maintained counter.
- Tags resolve to the **shared** tag vocabulary (TK-8), not a per-task list. `[INTENT G7]`

## ADRs / structural decisions
- **ADR-002 §5.3** — the 2 tables (authoritative). **ADR-001** — RQ + Zustand state. **ADR-003** — LWW.
- ⚠ **Surfaced decision:** the 5 INTENDED additions above → a single **ADR-002 amendment** + `/adr-new` in the build phase. `[INTENT G1,G5,G6,G7,G8]`

## Completion checklist
- [x] data model (2 tables) · [x] dep graph (aggregator, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
