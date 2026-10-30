<!-- Identity — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · @vida/types/task.ts · CLAUDE.md §3 -->

# Identity — Tasks (level: Feature)

**What it is.** The platform's **cross-module task aggregator** and a **personalizable view system**. Every
actionable item — standalone, or belonging to a project / milestone / course / contact — flows into one place,
with sub-tasks, time tracking, and user-built views. `[FACT: CLAUDE.md §3; ADR-002 §5.3]`

**The desire behind it.** The user wants a single surface for "everything I have to do," pulled from across the
whole platform, that they can **shape to their own taste** rather than a fixed, boring list. Tasks should feel
personal — saved views the user composes — not a generic to-do clone. The shaping primitives are the platform's
**`views`** (ADR-007 V1 — a saved surface is a first-class row, not a bespoke store) and **T4 presets** (a preset
= a saved `views` config + per-type defaults, bound to the module's own type discriminator). `[INTENT: Victor 2026-06-18; ADR-007 V1; ADR-009 T4]`

**Scope — full v1 (NOT an MVP).** `[INTENT G1, G2, G8]`

- Owns 2 tables: `tasks` (status · priority · difficulty · due · time estimates · sub-tasks · parent links) and `task_time_logs` (the time ledger). `[FACT: ADR-002 §5.3]`
- **Aggregates** tasks across Projects, Learning (courses/homework), Languages, Relationships via parent FKs; standalone tasks are first-class. `[FACT: ADR-002 FKs; CLAUDE.md §3]`
- **12 base view layouts** + a **saveable view-builder** — each saved view is a first-class **`views`** row (filter × layout × grouping, ADR-007 V1); the 12 layouts are **selectable renderers** over the `views` layout set, not a bespoke `task_views` store. `[INTENT G1; ADR-007 V1]`
- The task is a **pursuable** entity (ADR-011): it carries `measurement_kind` (natural **`milestone`** — binary done/not-done) + `binding_mode` (completion is the `event-trigger`), M1/M2. `[INTENT; ADR-011 M1/M2]`
- **Sub-tasks** (one level, progress rollup — the ADR-011 **M4** weighted rollup DOWN the ladder), **time tracking** (timer + pomodoro, per-task opt-out — rides a `sessions` sub-type, ADR-004 S1), **obligations** (recurring-deadline tasks). `[INTENT G3, G4, G8; ADR-011 M4; ADR-004 S1]`

**What it is NOT.** `[INTENT G7, G8; FACT: CLAUDE.md modules]`

- **Not a behavior tracker.** _Behavior_ recurrence (meditate daily, no smoking) belongs to **Habits**; _action-list_ cadence belongs to **Routines**. Tasks owns only **deadline** recurrence (obligations). The `obligation` classifier is the _single_ recurrence exception in this module.
- **Not a notes store.** A task's notes live in a linked `pages` row (`entity_type='task'`) owned by **Notes & Pages**, never an inline column.
- **Not a multi-parent graph.** A task belongs to **at most one** parent module (mutually exclusive), not many.
- **Not its own tag vocabulary.** Tasks tag through the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`, ADR-006 SP1), registering `entity_type='task'` in the open taggable-type registry (SP2) — not a private inline tag list. The inline `tasks.tags` JSON column is the **As-is** floor, retired to `entity_tags` in `[INTENT]` (see structure-data). `[INTENT; ADR-006 SP1/SP2]`
- **Not a project/milestone.** Hierarchy above the task (project → milestone → deliverable) is owned by **Projects**; Tasks only references it.

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
