<!-- Structure & Data — features/sessions-and-scheduling · /documentation Phase 2 · sources: ADR-002 study_sessions L2524-2551 · §5.11 planner L2743-2882 · pomodoro_sessions L1432 · task_time_logs L1510 · dep graph L3751-3757 · type moves knowledge.ts L222-250, learning.ts L194-211 · v1 studyPlanner.ts · docs/intake/sessions-and-scheduling.md -->

# Structure & Data — Sessions & Scheduling (level: Foundation / OWN MODULE)

> ⚠ **Mostly INTENDED.** The v2 FACT base is 6 schema-only tables (study_sessions + §5.11 planner) with
> **0 lines of logic**. This module's real shape (the Session supertype + sub-type extensions + the
> Integration-Contract tables) is INTENDED, specified by **[ADR-004](../../core/decisions/ADR-004-session-framework.md)** + the pending ADR-002 amendment.
> `[FACT: models/learning.ts, study-planner.ts, pomodoro-service.ts all wc -l = 0]`

## Data model

### FACT base today (6 tables, 0 logic)

- **`study_sessions`** — the completed-study LOG; `resource_type ∈ {course,book,topic,homework,article,video,
podcast}`, focus/energy 1–5, distraction_count, pages_read, lessons_completed, `key_learnings -- [E]`,
  started/ended. **No FK to any plan.** `[FACT: ADR-002 L2524-2551; type StudySession learning.ts L194-211]`
- **`study_availability`** (L2748-2770) · **`availability_exceptions`** (L2776-2792) ·
  **`study_plan_batches`** (course-scoped, status draft→completed, L2798-2817) ·
  **`scheduled_study_sessions`** (batch_id, resource_type {topic,flashcard_deck,book,course,homework},
  session_type, status, urgency_score, page range, L2823-2856) · **`session_templates`** (Pomodoro presets,
  L2861-2881). Planner types live in **`knowledge.ts` L222-250** (moved during the Knowledge extraction), NOT
  learning.ts. `[FACT]`
- **`pomodoro_sessions`** — the `focus`-sub-type timer runtime. **⚠ REFRAMED 2026-07-15:** re-homed into
  **this realm** (was Notes-owned) + re-pointed at `session_id` (drops the polymorphic `entity_type`);
  build-phase ADR-004 amendment + ADR-002 re-home. `[[../pomodoro/structure-data]]` `[FACT superseded: entity_type L1435]`

### INTENDED shape (the module's real model → ADR-002 amendment)

**Table-per-type inheritance (S1):**

- **`sessions`** (base spine, this module owns) — `id · sub_type · purpose · scheduling_mode
(attended|planned|ad-hoc) · planned_block_id? · started_at · ended_at · status · focus_rating? ·
energy_level? · distraction_count? · key_learnings[E] · sync`. The single stable `session_id` all effects/
  attachments/pomodoro/planned_blocks reference. **Supersedes** the flat Learning-only `study_sessions`.
  - **`status` — the S5 lifecycle enum** (`CHECK ∈ scheduled·planned·in_progress·completed·skipped·missed·
rescheduled`), the state machine every sub-type travels; per-sub-type legal transitions + hooks are declared
    in `session_type_registry`. (`empty`/`error` are the doc's runtime tail — `business-rules.md` terminal
    states — NOT persisted CHECK members.) `[INTENT S5 — ADR-004 §3.2.3]`
- **Per-sub-type extension tables** (1:1 on `session_id`, owned by the domain module):
  `study_sessions*` · `class_sessions` (Education: attendance, ICS link) · `focus_sessions` · `reading_sessions`
  (Books — BK-10 preserved: page-photos, position) · `practice_sessions` + `daily_sessions` (Language) ·
  `review_sessions` (Flashcards/Knowledge: SM-2/curve outcome) · `workout_sessions` (Health/Wave-R) ·
  `work_sessions` (reconciles Tasks `task_time_logs` `[FACT L1510]`). `[INTENT S2/S4]`
- **`planned_blocks`** (reshapes `scheduled_study_sessions`) — `when (date+start/end+availability_window) ·
target (own study_unit | module_ref pointer) · session_type · purpose · urgency · status`. Points, never
  mirrors (SS-7). `[INTENT G2-shape]`
- **Integration-Contract tables (S3, the 4-dimension contract):** `session_attachments` (polymorphic
  entity_type/entity_id + level — dim1) · `session_effects` (dim2) · `session_type_registry` (sub-type defs +
  the dim4 permissions envelope + per-type lifecycle transitions/hooks). `[INTENT S3 — ADR-004 §3.2]`
  - **`session_effects` — the S4 effects catalogue + R1 idempotency (dim2).** The effect `type` is drawn from
    the **fixed catalogue** `complete_habit_occurrence · log_time · emit_measurement_signal ·
contribute_purpose_metric · award_xp · surface_journal · surface_calendar · attach_pomodoro`; each fires via
    that receiver's **named effect handler (R2)**, never a direct target-table write. Every effect _output_ row
    carries a deterministic **`effect_event_id`** `= derive(subject_natural_key ‖ transition ‖ effect_type)`
    with a **`UNIQUE`** constraint (R1) — a replayed effect is a no-op. `[INTENT S4/R1 — ADR-004 §3.2.2, §3.2.5]`
- **`applied_effects`** (System / local-only dedup ledger) — records which `effect_event_id`s have been
  applied on this device; the read side of the R1 idempotency rail (stops double-count on sync replay). Its
  physical package home is `[DEFERRED — Part 2]`. `[INTENT R1 — ADR-004 §3.2.5]`
- **Retained/reshaped:** `study_availability` + `availability_exceptions` (kept) · `study_plan_batches`
  (widen scope beyond course — G5) · `session_templates` (restore v1 fields: focus_technique, description,
  notifications, sounds, usage_count/last_used_at; + interruption/pause tracking). `[INTENT G6; FACT v1 studyPlanner.ts SessionTemplate + PomodoroSession]`

### Superseded (flag LOUDLY — FACT-column supersessions)

- **v2 flat `study_sessions`** (Learning-only log) → the `sessions` spine + `study_sessions` extension.
- **v2 §5.11 flat planner** (`scheduled_study_sessions` as a mirror table) → `planned_blocks` (aggregator).
- **`scheduled_study_sessions.resource_type = flashcard_deck|book`** → NOT stored; read live via `dueIn` (SS-7).
- **Tasks `task_time_logs`** → reconciled into `work_session` (either replaced or wrapped — build decision). `[FACT L1510]`

## Dependencies / graph

- **Position:** a **foundation** many modules build on — inverts the v2 dep graph where the planner sat under
  courses. `[FACT: v2 graph courses/study_topics → scheduled_study_sessions → pomodoro_sessions L3751-3757]`
- **In-edges (providers):** Books · Flashcards · Knowledge · Education · Language (→ future Skills/Health).
- **Out-edges (effects):** Habits · Tasks · Projects · Purpose · Gamification · Knowledge · Education · Notes
  (Journal `/summary` feed + `/pomodoro` widget-lens) · Global Calendar. The Pomodoro **runtime** is owned in
  this realm (⚠ reframed 2026-07-15), not a Notes out-edge. All via documented integration points (§6 — no direct table access).
- **Coupling budget:** the base spine is thin; per-module ownership of extension tables keeps this from
  becoming a god-table (why table-per-type over single-table+JSON — S4).

## ADRs / structural decisions

- **[ADR-004 — Session Framework](../../core/decisions/ADR-004-session-framework.md)** (Accepted 2026-07-12) —
  table-per-type storage + the 4-dimension Integration Contract + the base/extension **sync rule** (separate
  encrypted blobs travel together, or the reader tolerates a partial). `[FACT: ADR-004]`
- **ADR-002 amendment (Sessions&Scheduling slice)** — the INTENDED tables above; supersede v2 §5.11 flat
  planner + Learning-only study_sessions; reconcile `task_time_logs`. Consolidated with the standing amendment.
- Inherits ADR-001 (SQLite/libsodium/sync) + ADR-003 (LWW sync — each session row an encrypted blob).

## Single source of truth (constitution §3)

- **A "session"** — the `sessions` spine is the one identity; sub-type tables extend, never re-declare it.
- **"When am I free"** — `study_availability` (Planner-owned); Routines presets it, Calendar renders it (SS-9).
- **Due-work** — each owning module via `dueIn()`; never copied here (SS-7).
- **Mastery/pace** — Knowledge/Education own it; this module only emits the signal (SS-10).
- **`scheduling_mode` / `purpose` / `sub_type` enums** — canonical Zod validators in `@vida/core`, TEXT+CHECK in SQL.

## Completion checklist

- [x] data model (FACT base + INTENDED shape) · [x] dep graph within budget · [x] ADRs (Session Framework +
      ADR-002 amendment) · [x] single source per cross-cutting concept · [x] [FACT]/[INTENT] + supersessions flagged loud
