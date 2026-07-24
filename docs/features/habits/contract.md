<!-- Contract — features/habits · /documentation Phase 2 · sources: ADR-002 §5.5 · habit.ts · intake -->

# Contract — Habits  (level: Feature)

> **Status:** types exist (`@vida/types/habit.ts`) but `@vida/core` habit services do **not** yet. Signatures
> below are the **designed interface**; ⚠ INTENDED items (purpose contribution, gamification feed, backfill
> window, restored v1 fields) depend on the schema amendment. `[FACT: habit.ts present; no core service; ADR-002 §5.5]`

## Exposed surface (via `@vida/core`)
- **Habit CRUD & queries** (`Habit` `[FACT: habit.ts]`):
  - `createHabit({habit_type, frequency, days_of_week?, target_count?, ...})` · `updateHabit(id, patch)` ·
    `softDeleteHabit(id)` (cascades completions, HB-11)
  - `listHabits(filter)` (Dashboard / All-Habits Overview) · `getTodayHabits()` → due-today grouped by
    `time_of_day` (HB-6)
- **Completion ledger** (`HabitCompletion` `[FACT: habit.ts]`):
  - `logCompletion(habitId, {date?, count?, value?})` — UNIQUE per (habit,date) upsert (HB-3); quick-check path; on
    "done" fires the S4 effects `complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp` on the R1 rail
  - `logDetailedCompletion(habitId, {count, value, mood_before, mood_after, ease_rating, satisfaction})` (HB-7)
  - `editCompletion(habitId, date, patch)` / `deleteCompletion(habitId, date)` → **re-derives** counters (HB-2)
  - `backfillCompletion(habitId, pastDate, {...})` — rejects beyond the user's window (HB-10, ⚠ INTENDED)
- **Streaks & analytics** (derived from the ledger, HB-2) — also the **M5 measure read seam** (R7): `getStreak`/
  `getCompletionRate` advertise `streak(habit)`/completion-rate as queryable measures Journal/Purpose read through:
  - `getStreak(habitId)` → `{current, longest, total}` · `getCompletionRate(habitId, range)` ·
    `getMoodTrend(habitId, range)` · `getCalendar(habitId, month)` `[INTENT M5; ADR-011 §3.6 + R7]`
- **Purpose contribution** (⚠ INTENDED, HB-8): on completion, `contributeToPurposeMetrics(habitId, completion)`
  via the **`contributions`** primitive (M7 — retiring `purpose_habits`) as the S4 `contribute_purpose_metric`
  effect (R1/R2) — Purpose owns the metric write. `[INTENT; ADR-011 M7; ADR-004 S4]`

## What it consumes (outside dependencies)
- **Notes & Pages** — a habit's notes are a `pages` row (`entity_type='habit'`), read/written through the Notes
  contract, never its tables. `[FACT: ADR-002 §5.2; CLAUDE.md Conventions]`
- **Preferences** — `push_habits` toggle + (⚠ INTENDED) `habit_backfill_window_days` drive reminders (HB-6) and
  the backfill limit (HB-10). `[INTENT G5,G9; FACT: Preferences contract]`
- **Shared tag system** — tagging via inline `habits.tags` `[E]` is the As-is; **decided direction: `entity_tags`**
  (SP1) — Habits registers `entity_type='habit'`, a consumer of the tag foundation. `[FACT: ADR-002 §5.5; INTENT ADR-006 SP1]`

## Fed by (parent-module links — read via integration points, §6)
- **Independent domain (Wave 1)** — Habits has no upstream parent module that owns it; it is created/owned
  standalone. The Purpose link is the polymorphic **`contributions`** primitive (M7 — the As-is `purpose_habits`
  junction retired); **`project_habits`** stays a live association junction (links *out*, not ownership *in*; C1 guard).
  `[FACT: docs/core/architecture/module-dependency-graph.md; CLAUDE.md junctions]`

## Consumed by
- **Notes journal `/summary`** → today's habits + completion status (HB-6). `[FACT: Notes /summary]`
- **Purpose & Goals** → habit completions contribute to purpose metrics via **`contributions`** (M7 — retiring
  `purpose_habits`), the S4 `contribute_purpose_metric` effect (HB-8, ⚠ INTENDED). `[INTENT G7; ADR-011 M7]`
- **Projects** → `project_habits` associates habits with projects (navigational) — **KEPT** (only the `purpose_*`
  trio retires, C1 guard). `[FACT: CLAUDE.md junctions]`
- **Gamification** → completion emits the `award_xp` S4 effect → **`grant_currency(XP)`** (E2) →
  **`consequence_ledger`** (E3), not `xp_history` (HB-9, ⚠ INTENDED). `[INTENT G2; ADR-012 E2/E3]`

## Contract error cases
- `logCompletion` on a date already logged → idempotent upsert of that row (HB-3), not a duplicate. `[FACT: UNIQUE]`
- `backfillCompletion` beyond the configured window → typed `BackfillWindowError` (HB-10). `[INTENT G9]`
- `logDetailedCompletion` with a rating outside 1–5 → typed validation error (CHECK). `[FACT: ADR-002 §5.5]`
- A failed `contributeToPurposeMetrics` → completion persists, contribution flagged via typed
  `MetricContributionError` (no silent drop, HB-8). `[INTENT G7]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
