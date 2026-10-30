<!-- Contract — features/sessions-and-scheduling · /documentation Phase 2 · sources: ADR-002 §5.11 planner L2743-2882 · pomodoro_sessions L1432 · dep graph L3751-3757 · Books BK-12 · Education contract L42 · Knowledge KN-10 · Habits/Tasks/Purpose/Gamification schemas -->

# Contract — Sessions & Scheduling (level: Foundation / OWN MODULE)

> ⚠ Interfaces below are **INTENDED** — the v2 surface is schema-only (0 logic in `study-planner.ts`,
> `pomodoro-service.ts`, `models/learning.ts` — all wc -l = 0). Signatures are the documented target the
> build executes against, not enforced reality yet. `[FACT: wc -l = 0]`

## Exposed surface

### 1. The Session supertype + sub-type registry

- **`SessionRegistry.register(def: SessionTypeDef)`** — a module registers a sub-type. `SessionTypeDef`
  declares the 4 Integration-Contract dimensions + its extension fields + its default tools/views. Shipped
  types register fully configured (SS-4); user long-tail types register through the same seam (SS-5).
- **`SessionTypeDef`** = `{ sub_type, owner_module, extension_schema, attachment_defaults, effects[],
lifecycle (transitions + hooks), permissions (capability envelope), default_purpose? }`. `[INTENT S1/S3/S4/S5]`

### 2. The Integration Contract (the module's core API — 4 dimensions)

- **Attachment** — `attach(session_id, entity_type, entity_id, level: 'type'|'instance')`. Polymorphic,
  `entity_links`-style. Type-level defaults come from the registry; instance-level set per session. `[INTENT S3-dim1]`
- **Effects** — declared per type, fired by the lifecycle engine on events. Effect kinds (the shipped **S4
  catalogue**): `complete_habit_occurrence · log_time(task|project) · emit_measurement_signal · contribute_purpose_metric ·
award_xp · surface_journal · surface_calendar · attach_pomodoro`. Each fires through the receiver's **named
  write API / effect handler (R2)** — never a direct target-table write. Every handler stamps the deterministic
  **`effect_event_id`** `= derive(subject_natural_key ‖ transition ‖ effect_type)` and is **idempotent** on it
  (`applied_effects` dedup): a replayed effect no-ops (rail **R1**). `[INTENT S4/R1 — ADR-004 §3.2.2, §3.2.5]`
- **Lifecycle** — `transition(session_id, event)` over the shared state machine (the SS-1 / terminal-states
  enum: `scheduled·planned → in_progress → completed·skipped·missed·rescheduled`) with per-type legal
  transitions + hooks. `[INTENT S5 — ADR-004 §3.2.3]`
- **Permissions** — `canTouch(type, effect, target) → bool`; enforced before every effect (SS-6). `[INTENT S3-dim4]`

### 3. The Scheduling engine

- **`dueIn(range): DueItem[]`** — the **platform-level provider primitive** (shared with the Global Calendar
  - Journals agenda). `DueItem = { source_module, ref_id, label, est_minutes, urgency, hard_deadline? }`.
    `[INTENT G2-shape; promoted to platform primitive 2026-07-10]`
- **`createSession(block): Session`** — the owner instantiates its sub-type on block completion (SS-8). `[INTENT G4]`
- **Owner-written blocks (as-built, routines S6 R1):** `planBlock` · `updatePlannedBlock` · `softDeletePlannedBlock` ·
  `listPlannedBlocksForTarget`. `dueIn` lists only pending intent (`planned|scheduled`). `[FACT: services/sessions/service.ts]`
- **`generatePlan(scope, window): Batch`** — produces a `study_plan_batches` row + `planned_blocks` (internals
  = G5 design-pass). **`approve/activate(batch)`**, **`recalc(batch)`** on miss. `[FACT study_plan_batches L2798-2817]`
- **Availability** — `setAvailability(day_of_week, window, preference)` + `addException(date, …)`. `[FACT L2748-2792]`
- **`session_templates`** CRUD (Pomodoro presets; restored fields + `is_default`). `[FACT L2861-2881]`

## What it consumes (external dependencies — via documented integration points, never direct tables)

- **Providers IN (`dueIn`):** Books `reading_plans` (BK-12 — consume, never write) · Flashcards SM-2 queue ·
  Knowledge review curves (KN-5) · Education deadlines/topics (also the generation source) · Language daily
  goal. Future: Skills, Health. `[INTENT G2; FACT dep graph courses/study_topics→scheduled_study_sessions L3751-3757]`
- **Effect targets OUT (fired by the Integration Contract):**
  | Effect | Target module | Integration point |
  |---|---|---|
  | complete_habit_occurrence | Habits | `habit_completions` write API |
  | log_time | Tasks / Projects | Tasks time API (reconciles `task_time_logs` `[FACT L1510]`) |
  | emit_measurement_signal | Knowledge / Education | mastery-source event (KN-10) / pace-vs-syllabus |
  | contribute_purpose_metric | Purpose & Goals | `purpose_metric_values` write |
  | award_xp | Gamification | documented write API over `consequence_ledger` (via the `grant_currency` Additive effect — ADR-012 §3.3 E3 + §3.1 E4). **NOT** `xp_history` (retired token) |
  | surface_journal / surface_calendar | Notes / Global Calendar | daily Journal feed · block render |
  | attach_pomodoro | **this realm** (⚠ reframed 2026-07-15) | `pomodoro_sessions` re-pointed at `session_id` — the `focus`-sub-type runtime `[[../pomodoro/contract]]` `[FACT superseded: entity_type L1435]` |
- **Runtime:** `[[../pomodoro/identity]]` — the timer is the `focus`-sub-type runtime owned in this realm
  (⚠ reframed 2026-07-15; was "Notes `pomodoro_sessions`") · Routines (presets availability) · the Global
  Calendar (reads `planned_blocks` + shares `dueIn`).

## Contract error cases (typed)

- `ProviderUnavailable(module)` — a `dueIn` lane failed; the agenda degrades that lane only (SS-7/fail-loud).
- `PermissionDenied(type, effect, target)` — SS-6 guardrail; effect rejected, logged, completion continues.
- `AttachmentTargetMissing(entity)` — attached entity deleted; effect no-ops loudly (never resurrects).
- `NoAvailability` / `NothingToSchedule` — `generatePlan` fails explicitly (never a silent empty batch).
- `InvalidTransition(session, event)` — illegal lifecycle move (e.g. `skip` on an attended class → use `miss`).

## Completion checklist

- [x] exposed surface (registry · 4-dim contract · engine) + consumed (providers in, effects out) ·
      [x] types/errors · [x] integration via documented points, no direct table access (§6) · [x] [FACT]/[INTENT] on each claim
