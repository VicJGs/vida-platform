<!-- Identity — features/tasks · /documentation Phase 2 · sources: ADR-002 §5.3 · @vida/types/task.ts · CLAUDE.md §3 · docs/intake/tasks.md -->

# Identity — Tasks  (level: Feature)

**What it is.** The platform's **cross-module task aggregator** and a **personalizable view system**. Every
actionable item — standalone, or belonging to a project / milestone / course / contact — flows into one place,
with sub-tasks, time tracking, and user-built views. `[FACT: CLAUDE.md §3; ADR-002 §5.3]`

**The desire behind it.** The user wants a single surface for "everything I have to do," pulled from across the
whole platform, that they can **shape to their own taste** rather than a fixed, boring list. Tasks should feel
personal — saved views the user composes — not a generic to-do clone. `[INTENT: Victor 2026-06-18]`

**Scope — full v1 (NOT an MVP).** `[INTENT G1, G2, G8]`
- Owns 2 tables: `tasks` (status · priority · difficulty · due · time estimates · sub-tasks · parent links) and `task_time_logs` (the time ledger). `[FACT: ADR-002 §5.3]`
- **Aggregates** tasks across Projects, Learning (courses/homework), Languages, Relationships via parent FKs; standalone tasks are first-class. `[FACT: ADR-002 FKs; CLAUDE.md §3]`
- **12 base view layouts** + a **saveable view-builder** (layout + grouping + filter + sort + fields + styling, named/pinnable). `[INTENT G1]`
- **Sub-tasks** (one level, progress rollup), **time tracking** (timer + pomodoro ledger, per-task opt-out), **obligations** (recurring-deadline tasks). `[INTENT G3, G4, G8]`

**What it is NOT.** `[INTENT G7, G8; FACT: CLAUDE.md modules]`
- **Not a behavior tracker.** *Behavior* recurrence (meditate daily, no smoking) belongs to **Habits**; *action-list* cadence belongs to **Routines**. Tasks owns only **deadline** recurrence (obligations). The `obligation` classifier is the *single* recurrence exception in this module.
- **Not a notes store.** A task's notes live in a linked `pages` row (`entity_type='task'`) owned by **Notes & Pages**, never an inline column.
- **Not a multi-parent graph.** A task belongs to **at most one** parent module (mutually exclusive), not many.
- **Not its own tag vocabulary.** Tasks use the **shared** tag system, not a private inline tag list (going forward — see structure-data ⚠INTENDED).
- **Not a project/milestone.** Hierarchy above the task (project → milestone → deliverable) is owned by **Projects**; Tasks only references it.

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
