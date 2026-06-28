<!-- Structure & Data — features/habits · /documentation Phase 2 · sources: ADR-002 §5.5 · habit.ts · ADR-001/003 · intake -->

# Structure & Data — Habits  (level: Feature)

## Data model — 2 owned tables (current, authoritative) `[FACT: ADR-002 §5.5 L1629-1701; habit.ts]`

| Table | Purpose | `[E]` | Key constraints |
|---|---|---|---|
| `habits` | habit definition + recurrence + denormalized streak cache | `name`, `description`, `unit`, `cue`, `reward`, `tags` (JSON) | `habit_type`/`frequency`/`time_of_day`/`domain` CHECKs; `days_of_week` JSON[0-6]; soft-delete; `sort_order` |
| `habit_completions` | per-date completion ledger | — | `habit_id` **CASCADE**; **UNIQUE (`habit_id`,`completed_date`)**; `mood_*`/`ease_rating`/`satisfaction` 1–5 CHECK |

- `habits` columns: `name`[E], `description`[E], `habit_type`, `frequency`, `days_of_week` JSON, `target_count`,
  `unit`[E], `time_of_day`, `times_of_day` JSON, `cue`[E], `reward`[E], `domain`, `tags`[E], **denormalized**
  `current_streak`/`longest_streak`/`total_completions`, `is_active`, `sort_order`, soft-delete, `_sync_*`.
  `[FACT: ADR-002 L1632-1668]`
- `habit_completions` columns: `habit_id`, `completed_date`, `count`, `value` (REAL), `mood_before`/`mood_after`/
  `ease_rating`/`satisfaction`, `_sync_*`. `[FACT: ADR-002 L1677-1699]`
- Structured columns sync **LWW**; the completion ledger merges by (`habit_id`,`completed_date`) (no CRDT — habits
  aren't editor documents). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / habit.ts today) — candidate ADR-002 amendment `[INTENT G7,G8,G9]`
- **Restored v1 fields (G8):** `habits.success_criteria`[E] (definition of done), `habits.difficulty`
  ∈{very_easy…very_hard}; `habit_completions.location`[E], `habit_completions.completion_time`.
- **Purpose contribution (G7):** no new habits column, but the `purpose_habits` junction gains a
  completion→metric mapping contract (owned by Purpose).
- **Backfill window (G9):** lives in **Preferences** (`habit_backfill_window_days`), not on `habits`.
- **Shared-tags direction:** deprecating inline `habits.tags` JSON in favor of the shared `tags`/`page_tags`
  system (flagged, not yet decided — mirrors the Tasks precedent). `[INTERP]`

## State management map `[FACT: ADR-001 State; life-os habits]`
- **React Query** owns habit reads/writes — `listHabits`/`getTodayHabits`, optimistic completion logging,
  analytics queries (streak/rate/mood/calendar).
- **Zustand** owns ephemeral UI: active view (Dashboard / today-mode Calendar·List·Checkbox), per-habit page tab,
  detailed-log draft, selection.
- `current_streak`/`longest_streak`/`total_completions` are **derived** (re-computed from `habit_completions`,
  HB-2) — a cache, never hand-edited.

## Page / route map `[INTENT G1; FACT: CLAUDE.md §4]`
- **Habits Dashboard** — all habits with the ability to check off any habit.
- **Today's to-do list** — due-today habits grouped by `time_of_day`, in **3 modes**: Calendar · List · Checkbox.
- **All-Habits Overview** — summary listing of every habit (streak badges).
- **Per-habit standalone page** — streak / completion-rate / mood analytics + calendar of completions + linked
  note (`pages`).

## Dependencies / graph
- **Wave 1 (independent domain)** — no upstream owner. Out-edges: Notes (notes page), Preferences (reminders +
  backfill window), Purpose (`purpose_habits`), Projects (`project_habits`). In-edges: Journal `/summary`,
  Purpose metrics (HB-8), Gamification (HB-9). `[FACT: docs/core/architecture/module-dependency-graph.md; intake]`
- Respects the coupling budget — no direct cross-module table reads; links via junctions + integration points
  (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- `HabitType`, `HabitFrequency`, `TimeOfDay`, `HabitDomain` — string-literal unions + SQL CHECK + Zod in
  `@vida/core`, declared once. `[FACT: habit.ts; packages/types/src/CLAUDE.md]`
- **Streak/total counters derive from the `habit_completions` ledger** (HB-2) — the columns on `habits` are a
  cache, not a second source.
- "Done for the day" derives from `count >= target_count` (HB-5), not a separate boolean.

## ADRs / structural decisions
- **ADR-002 §5.5** — the 2 tables (authoritative). **ADR-001** — RQ + Zustand state. **ADR-003** — LWW + ledger merge.
- ⚠ **Surfaced decision:** the restored v1 fields (G8) + the purpose-contribution contract (G7) + the Preferences
  backfill setting (G9) → a **candidate ADR-002 amendment** / `/adr-new` in the build phase. `[INTENT G7,G8,G9]`

## Completion checklist
- [x] data model (2 tables) · [x] dep graph (independent domain, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
