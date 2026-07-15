# Intake: Tasks
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/tasks (Wave 1 — first independent domain; an AGGREGATOR — points out to 4 parent modules)
Sources: v2 (ADR-002 §5.3 + @vida/types/task.ts + CLAUDE.md §3) · v1 (life-os src/features/tasks + types/tasks.ts) · user intent (gap map)
Session: 2026-06-18 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 2 tables** `[FACT: ADR-002 §5.3 L1462-1525; @vida/types/task.ts]`:
- `tasks`:
  - Parent links (all nullable, `SET NULL`): `project_id`, `milestone_id`, `course_id`, `contact_id` — a task may belong to a project / milestone / course / contact. `[FACT: ADR-002 L1466-1470]`
  - `parent_task_id` → self-ref, **`ON DELETE CASCADE`** (sub-tasks; deleting a parent deletes its children). `[FACT: ADR-002 L1471]`
  - `title`[E], `description`[E], `tags`[E] (JSON array — **inline, NOT the shared `tags` table**). `[FACT: ADR-002 L1472-1473, L1483; task.ts L37]`
  - `status` {not_started, in_progress, completed, on_hold, cancelled} · `priority` {critical, high, medium, low, none} · `difficulty` {trivial, easy, medium, hard, expert}. `[FACT: ADR-002 L1474-1481]`
  - `due_date` (YYYY-MM-DD), `estimated_minutes`, `actual_minutes`, `sort_order`, soft-delete, `_sync_*`. `[FACT: ADR-002 L1482-1490]`
- `task_time_logs`: `task_id` (`CASCADE`), `start_time`, `end_time`, `duration_minutes`. `[FACT: ADR-002 L1511-1525]`
- Indexes on all 4 parent FKs + parent_task + partial (status, due_date) where not deleted. `[FACT: ADR-002 L1501-1507]`
**Intent (CLAUDE.md §3)** `[FACT: CLAUDE.md §3 Task Management]`: full tasks view **aggregated from other modules** (projects, learning, language, relationships); creation with linking to parent modules; sub-tasks; priority/difficulty/status/due/time estimation + tracking; task notes (a linked `pages` row per task — already specced in Notes & Pages); task time logs.

## B. WHAT v1 DID — life-os tasks (legacy, for intent + lessons)
`[FACT: life-os src/types/tasks.ts + src/features/tasks/{API.md, components, hooks, pages}]`
- v1 `Task`: `title`, `description`, `priority`, `status` {todo, in_progress, completed, cancelled}, `due_date`, **`scheduled_date`**, **`is_completed`** bool, **`completed_at`**, `estimated_hours`, `tags: string[]`. `[FACT: types/tasks.ts]`
- Features: `useTasks(filters)` + `usePaginatedTasks` (RQ, optimistic), filtering by priority/status/completion; **focus mode support**; `TaskCard`/`TaskForm`/`TasksList`/`SubtaskList` components; **offline** hooks (`useOfflineTasksData`, `useTasksOffline`). `[FACT: tasks/API.md + components + hooks]`
- v1 had a `SubtaskList` component but **no `parent_task_id`** in the Task type — sub-tasks were UI-only / unmodeled. `[FACT: types/tasks.ts has no parent field]`

### Key v1→v2 deltas (what changed, why it matters)
1. v2 **adds the aggregator FKs** (`project_id`/`milestone_id`/`course_id`/`contact_id`) — v1 tasks were standalone. This is what enables "one tasks view across modules." `[FACT: ADR-002 vs v1]`
2. v2 **adds real sub-tasks** (`parent_task_id` CASCADE) + `difficulty` + `task_time_logs` (proper time tracking) + `sort_order` (manual ordering). `[FACT: ADR-002]`
3. v2 `status` adds **`on_hold`** (5 vs 4); v2 `priority` is 5-value (critical…none) vs v1's `Priority`. `[FACT: ADR-002 CHECK]`
4. v2 **drops** v1's `is_completed` + `completed_at` (completion now = `status='completed'`; **no completion timestamp**). `[FACT: task.ts omits both]`
5. v2 **drops** v1's `scheduled_date` (only `due_date` remains). `[FACT: task.ts omits it]`
6. v2 time is in **minutes** (`estimated_minutes`/`actual_minutes`) vs v1 `estimated_hours`. `[FACT: task.ts]`
7. v2 `tags` is an **inline [E] JSON array on the task**, separate from the shared `tags`/`page_tags` system used by Notes. `[FACT: ADR-002 L1483 vs §5.2]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: full v1 (assumed). Which task views? (flat list · grouped-by-module aggregated view · board/kanban by status · calendar by due_date · "today"). Confirm the set.
G2 — **Aggregation semantics**: the 4 parent FKs — is a task linked to **at most one** parent module (mutually exclusive), or can it have several (e.g. project + contact)? How does the aggregated "all tasks" view group/filter, and how are **standalone tasks** (no parent) shown?
G3 — **Sub-tasks**: depth — single level (parent→child) or arbitrary nesting? Does parent **status/progress roll up** from children (e.g. all children done ⇒ parent done)? Confirm cascade-delete (delete parent ⇒ delete children) is intended.
G4 — **Time tracking**: is `actual_minutes` an **auto-rollup** (sum of `task_time_logs`) or manual? Is there a **start/stop timer** that writes time logs? How does it relate to **`pomodoro_sessions`** (Notes module, which can link to a task) — does a focus session create a task_time_log, or are they separate counters?
G5 — **Completion timestamp**: v2 dropped `completed_at`. Do you want a real completion timestamp back (for streaks/analytics/"completed today" in the journal summary), or is `updated_at` at `status='completed'` enough?
G6 — **Scheduled vs due date**: v2 dropped `scheduled_date`. Do you want a separate **planned/scheduled date** (when you intend to work) distinct from `due_date` (when it's due)? Affects today/calendar views.
G7 — **Task tags vs shared tags**: tasks carry their own inline `tags` JSON, separate from the shared `tags`/`page_tags` system. Intentional (task tags are their own thing), or should tasks use the **shared** tag system for one cross-app tag vocabulary?
G8 — **Recurring tasks**: neither v1 nor v2 models recurrence on tasks (habits/routines own recurrence). Are recurring tasks **out of scope** (use habits/routines instead), or do you want task recurrence?
G9 — **Focus mode**: v1 had "focus mode." How should starting focus on a task behave in v2 (open the pomodoro widget bound to the task, log time, mark in_progress)?

## Resolution `[INTENT: Victor, 2026-06-18]`

> **SCOPE:** complete v1 (not MVP). Tasks is the cross-module **aggregator** + a **personalizable view system**.

**G1 — All 12 base layouts + a saveable view-builder.** `[INTENT G1]`
- Base layouts (all in): List · Grouped list · Board/Kanban · Calendar · Today/Agenda · Table/Spreadsheet · Timeline/Gantt · Tree/Outline · Matrix/Eisenhower · Swimlanes · Focus/Now · Gallery/Cards.
- **View-builder:** a view = a saved configuration of {base layout + grouping + filter + sort + visible fields + color/styling}, **named, reorderable, pinnable**, user-created. Ships with presets (Today, Board, All-by-project) but all editable.
- ⚠ **INTENDED:** requires **saved-views persistence** (e.g. a `task_views` table or JSON store) — does NOT exist in ADR-002. Build-phase schema + candidate ADR.

**G2 — Aggregation: at-most-one parent.** A task links to **at most one** parent module (project / milestone / course / contact, mutually exclusive; milestone implies its project). **Standalone tasks** (no parent) are first-class, shown in an "Inbox/Standalone" group. The aggregated view groups by parent module. `[INTENT G2; FACT: ADR-002 nullable FKs]`

**G3 — Sub-tasks: single level + progress rollup.** One level deep (parent → children). Parent shows a **progress rollup** (e.g. 2/5) but completing a parent does **not** force-complete children. **Cascade-delete confirmed** (delete parent ⇒ delete children, per ADR-002 `parent_task_id` CASCADE). `[INTENT G3; FACT: ADR-002 L1471]`

**G4 — Time: auto-rollup + timer + pomodoro ledger, per-task opt-out.** `actual_minutes` = **auto-sum** of `task_time_logs.duration_minutes`. A **start/stop timer** writes a time log. A **pomodoro focus session** (Notes module) bound to a task **also writes a `task_time_log`** on completion — one ledger for "time spent." **Per-task opt-out:** a task can disable time-tracking/auto-rollup. `[INTENT G4; FACT: ADR-002 task_time_logs; pomodoro_sessions §5.2]`

**G5 — Add `completed_at` back.** ⚠ **INTENDED schema addition** (not in ADR-002). Needed for journal `/summary` "completed today", streaks, gamification; `updated_at` is too noisy. `[INTENT G5; FACT: task.ts omits completed_at]`

**G6 — Add `scheduled_date` back.** ⚠ **INTENDED schema addition.** Distinct from `due_date`: scheduled = "plan to work on it" (drives Today/Calendar), due = deadline. `[INTENT G6; FACT: task.ts omits scheduled_date]`

**G7 — Migrate to the shared tag system.** Tasks use the shared `tags`/`page_tags`-style system (one cross-app tag vocabulary, §3), **deprecating** the inline `tasks.tags` JSON. ⚠ **Contradicts ADR-002** (which has inline `tasks.tags [E]`) — build-phase migration + candidate ADR amendment. `[INTENT G7; FACT: ADR-002 L1483]`

**G8 — Option A: recurring obligations via a dedicated classifier.** Tasks gain a **recurrence rule**; **obligations** (taxes, license renewal — recurring deadlines) are marked by a first-class **`obligation` classifier** (a `kind` discriminator, e.g. `kind ∈ {standard, obligation}`), NOT a freeform tag, because it drives behavior. Completing an obligation **regenerates the next occurrence** with the next due date. ⚠ **INTENDED schema addition** (recurrence fields + `kind`). Boundary: *behavior* recurrence → Habits/Routines; *deadline* recurrence → Tasks (obligations). `[INTENT G8]`

**G9 — Focus mode.** Starting focus on a task opens the **pomodoro widget bound to the task**, sets it `in_progress`, and writes a `task_time_log` on session end (ties to G4). `[INTENT G9]`

### Intake status: ✅ WHOLE. Open carry-forwards (all ⚠ INTENDED → one ADR-002 amendment in build phase):
1. `completed_at` (G5) · 2. `scheduled_date` (G6) · 3. recurrence rule + `kind`/`obligation` classifier (G8) · 4. saved-views persistence `task_views` (G1) · 5. shared-tags migration, deprecate inline `tasks.tags` (G7).

## ADDENDUM — Task TYPES & presets (Duties dissolution, 2026-07-14) `[INTENT: Victor 2026-07-14]`

The **Duties** defining intake ([[intake/duties.md]]) resolved that **Duty and Obligation are not a module — they
are TASK TYPES surfaced as PRESETS.** This generalizes G8 and composes with G1. `[INTENT: Victor 2026-07-14]`

- **G8 → generalized.** The `kind ∈ {standard, obligation}` classifier becomes a **user-extensible task `type`**
  (`standard | obligation | duty | …`). **Duty** and **Obligation** ship as the two built-in non-standard types;
  the user can define more ("fully personalizable"). Each type carries its own **patterns · contexts · deliverables**.
  - **`duty` type = a recurring RESPONSIBILITY** (D1): an accountability commitment (ideally Purpose-anchored via
    `entity_links`) that recurs and generates/points at work. Flexible, internal accountability, gradient/quality-
    tracked. Composes Scheduler `dueIn`/recurrence for cycle-gen — **no bespoke Master→Instance engine** (Duties D3).
  - **`obligation` type = a non-negotiable deadline** (unchanged G8 lineage): external consequence, binary
    compliance, unmovable in scheduling conflicts. The 4-axis Duty-vs-Obligation distinction (see `intake/duties.md`)
    is the differentiation *between the two types*, not between two modules.
- **Presets (the "thin tab" — via Spaces).** Each task type gets a **preset**: a saved View (G1 / Spaces SP3) +
  its **own UI/UX tab** + default fields/deliverables (+ optional starter Template, Spaces SP5). "Duties" and
  "Obligations" are each a preset tab over the Tasks entity — distinct surfaces, one entity. Home of the preset
  primitive = **Spaces** ([[intake/spaces.md]] Requirements accumulator); Tasks provides the type + the data.
- **Build-phase carry-forward (add to the ADR-002 amendment):** widen the `kind`/`type` discriminator to a
  user-extensible type registry + per-type preset/UI config. Revisit alongside the `task_views` persistence (G1).

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-18 | documentation-blueprint | intake harvested (v2 ADR-002 §5.3 + v1 life-os tasks); gap map G1–G9 raised |
| 2026-06-18 | documentation-blueprint | gaps resolved (Victor); G1 all-layouts+view-builder, G2–G4/G9 confirmed, G5/G6/G8 schema additions, G7 shared-tags migration; intake WHOLE; 5 INTENDED deltas → ADR-002 amendment |
| 2026-07-14 | documentation-blueprint | ADDENDUM: Duties dissolved into Tasks + Spaces → G8 `kind` generalized to a user-extensible task **type** (`standard\|obligation\|duty\|…`); Duty/Obligation = 2 shipped types+presets w/ own patterns/deliverables + UI/UX tab (preset home = Spaces) |
