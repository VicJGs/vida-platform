<!-- Business Rules — features/habits · /documentation Phase 2 · sources: ADR-002 §5.5 · habit.ts · intake -->

# Business Rules — Habits  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **HB-1 — Encrypted content.** `name`, `description`, `unit`, `cue`, `reward`, `tags` are `[E]` (client-side,
  ZK-1); `habit_type`, `frequency`, `days_of_week`, `domain`, `time_of_day`, counts/streak cache are plaintext
  config. `[FACT: ADR-002 §5.5; habit.ts @encrypted]`
- **HB-2 — Streak = consecutive scheduled occurrences; a miss resets to 0 (no grace).** For `daily` that is every
  day; for `weekly`/`biweekly`/`monthly`/`custom` + `days_of_week` it is each *scheduled* occurrence. Missing a
  scheduled occurrence resets `current_streak` to 0. `current_streak`/`longest_streak`/`total_completions`
  **recompute deterministically from the `habit_completions` ledger** — the denormalized columns are a cache,
  never the source. `[INTENT G2]`
- **HB-3 — One completion per habit per date.** `habit_completions` is **UNIQUE per (`habit_id`,
  `completed_date`)**; re-logging the same date updates that row, never duplicates. `[FACT: ADR-002 §5.5 UNIQUE]`
- **HB-4 — Build vs break completion meaning.** For a **build** habit a completion = "did it"; for a **break**
  habit a completion = "**successfully abstained today**" (the checkbox means "stayed clean"). A break-habit
  streak = consecutive clean scheduled days; a relapse = no completion logged → streak resets (HB-2). `[INTENT G3]`
- **HB-5 — Quantified "done".** A habit is **done for the day** iff `count >= target_count`. A **partial**
  (`count < target_count`) is logged for analytics but **does not advance the streak**. `count` = repetitions
  (drives done/not-done); `value` (REAL) = measured quantity (e.g. miles) for analytics only. `[INTENT G4]`
- **HB-6 — Today-list eligibility.** A habit appears in today's to-do list when today matches its `frequency` +
  `days_of_week`, grouped by `time_of_day`; `times_of_day` (JSON) drives multiple per-day reminders via
  Preferences `push_habits`. `[INTENT G5; FACT: ADR-002 §5.5; Preferences contract]`
- **HB-7 — Mood/ratings are optional, quick-check by default.** `mood_before`/`mood_after`/`ease_rating`/
  `satisfaction` (1–5) are captured only via an explicit "detailed log" affordance; the default completion is a
  single tap. `[INTENT G6; FACT: ADR-002 §5.5 CHECK 1-5]`
- **HB-8 — Purpose contribution (⚠ INTENDED).** A completion **contributes to** the metric/progress of any
  purpose linked via `purpose_habits` (writes/increments a `purpose_metric_value`) — not purely navigational.
  The completion→metric mapping is a contract **Purpose** must define. `[INTENT G7]`
- **HB-9 — Gamification dependency (⚠ INTENDED).** Streaks and completions **feed** the XP/achievement system
  (`xp_history`, `achievements`, `user_achievements`); Gamification consumes habit events, Habits never writes
  XP itself. `[INTENT G2]`
- **HB-10 — Backfill is allowed and recomputes streaks; the window is a user preference (⚠ INTENDED).** The user
  may log/edit a completion for a **past date** (the calendar view affords it), which **recomputes streaks**
  (HB-2). The maximum backfill age is a **user-configurable setting** (the user owns the policy), not a hardcoded
  limit. `[INTENT G9]`
- **HB-11 — Cascade delete.** Deleting a habit deletes its `habit_completions` (`ON DELETE CASCADE`); soft delete
  hides the habit while preserving the ledger until hard delete. `[FACT: ADR-002 §5.5 CASCADE; soft-delete conv.]`
- **HB-12 — Local-first.** Every create/edit/complete/backfill succeeds locally first; multi-device reconciles
  LWW on structured columns; the completion ledger merges by (`habit_id`,`completed_date`). `[FACT: LF-2; ADR-003]`

## Validation & edge cases
- Enum CHECKs: `habit_type`∈{build,break}; `frequency`∈{daily,weekly,biweekly,monthly,custom}; `time_of_day`∈
  {morning,afternoon,evening,anytime,whole_day}; `domain`∈8 values; ratings 1–5. `[FACT: ADR-002 §5.5]`
- `custom` frequency requires `days_of_week` (else it has no schedule → never appears in the today-list, HB-6).
  `[INTERP HB-6; FACT: days_of_week JSON]`
- Logging a completion with `count` past `target_count` is allowed (over-achievement); still "done" (HB-5).
  `[INTERP HB-5]`
- Backfilling beyond the user's configured window is rejected with a typed error (HB-10). `[INTENT G9]`
- Editing/deleting a past completion **re-derives** all three counters from the ledger (HB-2) — never adjusts the
  cache by hand. `[INTENT G2]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Today's to-do list | skeleton | "nothing due today" | typed read error, retry | grouped due habits (by time_of_day) |
| Dashboard / All-Habits | skeleton | "no habits — create one" + CTA | typed read error, retry | rendered habit set + streak badges |
| Log completion (quick) | — | — | save fails → revert, typed toast | persisted, optimistic; streak recomputed |
| Detailed log (mood/qty) | — | — | validation (rating out of 1–5) inline | completion + mood/quantity persisted |
| Streak / analytics | computing from ledger | "no completions yet" | ledger read error → show partial + flag | streak, completion-rate, mood charts |
| Backfill past date | — | — | beyond-window or save error → typed toast, no change | completion logged; counters re-derived |
| Per-habit standalone page | skeleton | "no data yet" | typed error, retry | analytics + calendar of completions |

## Failure behavior (fail loud — constitution §5)
- A failed completion/backfill reverts the optimistic state and surfaces a typed error — never silent data loss.
  `[INTENT G4; FACT §5]`
- If the purpose-metric contribution (HB-8) fails, the **completion still succeeds** and the contribution is
  **flagged**, never silently dropped. `[INTENT G7]`
- A corrupt/edited ledger row makes the cache stale → the system **recomputes from the ledger** rather than
  trusting the cache (HB-2). `[INTENT G2]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
The following are **INTENDED**, not in ADR-002 §5.5 / `habit.ts` today:
- **HB-8** purpose-metric contribution mapping (depends on Purpose contract).
- **HB-9** Gamification XP/achievement feed.
- **HB-10** user-configurable backfill window (a **Preferences** setting, e.g. `habit_backfill_window_days`).
- **G8 restored v1 fields** — `success_criteria`, `difficulty` (on `habits`), completion `location` + completion
  `time` (on `habit_completions`) — to be re-added (candidate **ADR-002 amendment**).
- **G1** the 4 view surfaces are UI-level (no schema change).
Until amended, the live invariants are HB-1..HB-7, HB-11, HB-12. `[FACT: ADR-002 §5.5; INTENT G1,G2,G7,G8,G9]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
