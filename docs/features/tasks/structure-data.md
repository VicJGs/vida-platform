<!-- Structure & Data — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · task.ts · ADR-001/003 · intake -->

# Structure & Data — Tasks (level: Feature)

## Data model — 2 owned tables (current, authoritative) `[FACT: ADR-002 §5.3 L1462-1525; task.ts]`

| Table            | Purpose     | `[E]`                                 | Key constraints                                                                                                                         |
| ---------------- | ----------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`          | the task    | `title`, `description`, `tags` (JSON) | 4 parent FKs `SET NULL`; `parent_task_id` self-ref **CASCADE**; status/priority/difficulty CHECKs; partial indexes on status & due_date |
| `task_time_logs` | time ledger | —                                     | `task_id` **CASCADE**; `start_time`/`end_time`/`duration_minutes`                                                                       |

- `tasks` columns: `project_id`, `milestone_id`, `course_id`, `contact_id`, `parent_task_id`, `title`[E], `description`[E], `status`, `priority`, `difficulty`, `due_date`, `estimated_minutes`, `actual_minutes`, `tags`[E], `sort_order`, soft-delete, `_sync_*`. `[FACT: ADR-002 L1465-1490]`
- Indexes: per parent FK + parent_task + partial `(status)`/`(due_date)` where `deleted_at IS NULL`. `[FACT: ADR-002 L1501-1507]`
- Structured columns sync **LWW** (no CRDT — tasks aren't editor documents). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / task.ts today) — one ADR-002 amendment `[INTENT G1,G5,G6,G7,G8]`

- `tasks.completed_at` (G5) — completion timestamp.
- `tasks.scheduled_date` (G6) — planned date, distinct from `due_date`.
- `tasks.kind` ∈ {`standard`,`obligation`} + recurrence rule fields (G8) — deadline recurrence for obligations; `kind` is also the **T4 preset** type discriminator (ADR-009). `[INTENT G8; ADR-009 T4]`
- **`measurement_kind`** + **`binding_mode`** (ADR-011 M1/M2) — the task is a **pursuable** (M1 applies-to names "Tasks (incl. sub-tasks)"): `measurement_kind` CHECK ∈ `quantitative·milestone·rate·qualitative` (natural = `milestone`), `binding_mode` CHECK ∈ `manual·derived-pull·event-trigger` (a completion is the `event-trigger`). No bespoke `target_type` to untangle — pure add. `[INTENT; ADR-011 M1/M2]`
- **`views`** primitive (G1, ADR-007 V1) — a saved view is a first-class **`views`** row (filter × layout × grouping), NOT a bespoke `task_views` store; UI renderers are selectable (V3 layout set `list·table·board·gallery·calendar·graph·timeline`); `views.space_id` nullable (V2 — NULL = the global All-Tasks view); `views.name` `[E]` (V5). _`task_views` is **schema-0** today (an `[INTENT]` build target, not a live table) — reframed in place, no As-is floor._ The full V1 anatomy (filter grammar, cross-type resolution, per-layout fields) is the **deferred dedicated 007 pass**. `[INTENT G1; ADR-007 V1/V2/V5]`
- **Shared-tags migration** (G7, ADR-006 SP1) — retire the inline `tasks.tags` JSON (As-is floor) **and** the forward `page_tags` reference in favor of the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`); Tasks registers `entity_type='task'` in the **open** taggable-type registry (SP2, no `entity_type CHECK`). `[INTENT G7; ADR-006 SP1/SP2]`

## State management map `[INTENT G4; FACT: ADR-001 State; life-os useTasks]`

- **React Query** owns task reads/writes — `listTasks`/`getAggregatedTasks`, optimistic create/edit/complete, paginated lists for large sets.
- **Zustand** owns ephemeral UI: active view, view-builder draft, running-timer state, board drag state, selection.
- `actual_minutes` is **derived** (sum of time logs, TK-5) — never edited directly; the write is the ADR-004 **`log_time`** S4 effect (R2/R1), fired by a **`sessions` sub-type** (S1) the timer/pomodoro opens — not a direct client write. The `task_time_logs`↔session-extension reconciliation is `[DEFERRED — build]`. `[INTENT; ADR-004 S1/S4]`
- **Sub-task progress derives** (M3 — no stored progress column): the parent's `{done,total}` rollup is the ADR-011 **M4** weighted rollup `Σ(child.progress × weight)/Σ weight` (default equal-weight), computed on read, never a stored counter. `[INTENT; ADR-011 M3/M4]`

## Page / route map `[INTENT G1; FACT: CLAUDE.md §3]`

- **All-Tasks screen** hosting the **12 base layouts** (List · Grouped · Board · Calendar · Today · Table · Timeline/Gantt · Tree · Matrix · Swimlanes · Focus · Gallery) as selectable renderers over the `views` layout set (V3) + the **view-builder** (compose & save named `views` rows, V1). `[INTENT; ADR-007 V1/V3]`
- **Task detail** — fields, sub-tasks (rollup), time logs, linked note (`pages`), pomodoro/focus (G9).
- Aggregated entry points from parent modules (a project/course/contact page lists its tasks via the FK).

## Dependencies / graph

- **Wave 1 (independent domain)**, but an **aggregator**: out-edges to Projects/Learning/Relationships (parent FKs, read via the **R7** read seam — provider fan-out, the same seam the aggregated `views` ride via V4) and to Notes (notes page + pomodoro session). In-edges: Journal `/summary`, Gamification read completion. `[FACT: docs/core/architecture/module-dependency-graph.md; intake; INTENT R7; ADR-007 V4]`
- Respects the coupling budget — no direct cross-module table reads; aggregation reads via the R7 seam (TK-9, §6). `[FACT: core §6; INTENT R7]`

## Single source of truth (constitution §3)

- `Status`, `Priority` (shared, from `@vida/types/common`), `TaskDifficulty` (`task.ts`) — string-literal unions + SQL CHECK + Zod in `@vida/core`, declared once. `[FACT: task.ts L6,13; packages/types/src/CLAUDE.md]`
- `actual_minutes` derives from `task_time_logs` (one ledger, TK-5) — not a second hand-maintained counter.
- Tags resolve to the shared **`entity_tags`** primitive (SP1), not a per-task list; inline `tasks.tags` is the As-is floor (TK-8). `[INTENT G7; ADR-006 SP1]`
- Task progress derives on read (M3/M4), and the task exposes `measurement_kind`/`binding_mode` (M1/M2) as its measurability axes. `[INTENT; ADR-011 M1/M2/M3/M4]`

## ADRs / structural decisions

- **ADR-002 §5.3** — the 2 tables (authoritative). **ADR-001** — RQ + Zustand state. **ADR-003** — LWW.
- **Foundation subject-set (R6):** this doc is subject to **ADR-011** (M1/M2/M3/M4 measurability), **ADR-012** (E2 economy feeder), **ADR-006** (SP1/SP2 tags), **ADR-007** (V1/V2/V4 views), **ADR-009** (T4 presets), **ADR-004** (S1/S4 sessions + effect rails) — beyond the As-is 002/001/003. Every new token is cited to its owning ADR; the code/table home is `[DEFERRED — build]`.
- ⚠ **Surfaced decision:** the INTENDED additions above (`completed_at`, `scheduled_date`, `kind`+recurrence, `measurement_kind`/`binding_mode`, `views` ex-`task_views`, `entity_tags` ex-inline-tags) → a single **ADR-002 amendment** + `/adr-new` in the build phase. `[INTENT G1,G5,G6,G7,G8; ADR-011/012/006/007/009/004]`

## Completion checklist

- [x] data model (2 tables) · [x] dep graph (aggregator, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
