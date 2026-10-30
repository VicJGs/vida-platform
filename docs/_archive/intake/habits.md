# Intake: Habits
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/habits (Wave 1 — independent domain; feeds Journal /summary + Purpose metrics)
Sources: v2 (ADR-002 §5.5 + @vida/types/habit.ts + CLAUDE.md §4) · v1 (life-os src/features/habits + types/habits.ts) · user intent
Session: 2026-06-18 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 2 tables** `[FACT: ADR-002 §5.5 L1629-1701; habit.ts]`:
- `habits`: `name`[E], `description`[E], `habit_type`{build,break}, `frequency`{daily,weekly,biweekly,monthly,custom}, `days_of_week` JSON[0-6], `target_count`, `unit`[E], `time_of_day`{morning,afternoon,evening,anytime,whole_day}, `times_of_day` JSON (multiple reminder times), `cue`[E], `reward`[E], `domain`{health,career,finance,relationships,personal_growth,spiritual,recreation,environment}, `tags`[E], **denormalized** `current_streak`/`longest_streak`/`total_completions`, `is_active`, `sort_order`, soft-delete. `[FACT: ADR-002 L1632-1668]`
- `habit_completions`: `habit_id` (CASCADE), `completed_date` (**UNIQUE per habit+date**), `count`, `value` (REAL — measured, e.g. miles), `mood_before`/`mood_after`/`ease_rating`/`satisfaction` (all 1-5 CHECK). `[FACT: ADR-002 L1677-1699]`
**Intent (CLAUDE.md §4)** `[FACT: CLAUDE.md §4]`: recurrence + **to-do list view** for completion (grouped by morning/afternoon/evening/all-day); **standalone page per habit** with analytics (streaks, completion rates, mood tracking) + **calendar view**; build (positive) / break (negative) types; 8 domains.
**Cross-domain:** `purpose_habits`, `project_habits` junctions link habits to purposes/projects. `[FACT: CLAUDE.md "Cross-domain junctions"]`

## B. WHAT v1 DID — life-os habits (legacy, for intent + lessons)
`[FACT: life-os src/types/habits.ts (MasterHabit) + src/features/habits/API.md]`
- `master_habits`: habit_type build/break, frequency + `frequency_config`, `time_of_day` + `times_of_day[]`, `trigger_cue`, **`success_criteria`**, **`difficulty`**{very_easy…very_hard}, **`purpose_ids[]`** (inline), current/longest_streak, **`last_completed_date`**, reward, status.
- `habit_completions`: `completion_time`, **`location`**, `ease_rating`, `satisfaction_rating`.
- Features: streak calculations, **session-based scheduling** (morning/afternoon/evening/anytime), completion history, build + break support. `[FACT: habits/API.md]`

### Key v1→v2 deltas (what changed, why it matters)
1. v2 **adds quantification**: `target_count` + `unit` + completion `count` + `value` (v1 was binary done/not-done). `[FACT: habit.ts vs MasterHabit]`
2. v2 **adds `mood_before`** (v1 had only after-the-fact ratings) → richer mood tracking. `[FACT: ADR-002 L1683]`
3. v2 **drops** v1's `difficulty`, `success_criteria`, completion `location` + `completion_time`. `[FACT: habit.ts omits them]`
4. v2 **drops inline `purpose_ids`/`last_completed_date`** — purpose links move to the `purpose_habits` junction; last-completed derives from completions. `[FACT: CLAUDE.md junctions; ADR-002 no such columns]`
5. v2 `domain` is 8 canonical values (v1 had 6 different). `[FACT: ADR-002 L1651-1654]`
6. Streak/total counters are **denormalized on `habits`** but the truth is the `habit_completions` ledger (UNIQUE per habit+date). `[FACT: ADR-002 L1652-1654, L1699]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: full v1 (assumed). View set: **to-do list** (today's due habits grouped by time_of_day) · **per-habit standalone page** (streak/completion-rate/mood analytics + calendar) · an **all-habits overview**? Confirm.
G2 — **Streak semantics** (the critical one): for `daily` a streak is consecutive days — but for `weekly`/`biweekly`/`monthly`/`custom` + `days_of_week`, what counts as a streak (consecutive *scheduled* occurrences)? Does **missing a scheduled occurrence reset to 0**, or is there grace? Confirm `current_streak`/`longest_streak`/`total_completions` recompute from the completion ledger (one source of truth, §3).
G3 — **Build vs break**: for a **break** habit (e.g. "no smoking"), what does a completion / the to-do checkbox mean — "successfully abstained today" (logged success) or "relapsed"? How is its streak defined (consecutive clean days)?
G4 — **Quantified completion**: with `target_count`/`unit`/`count`/`value` — is a habit "done for the day" when `count >= target_count`? Does a **partial** (3/8 glasses) count toward the streak? What's the `count` (repetitions) vs `value` (measured quantity, e.g. miles) distinction in UX?
G5 — **Scheduling / today-list**: a habit appears in today's to-do list when today matches `frequency` + `days_of_week`, grouped by `time_of_day`; `times_of_day` drives multiple reminders (via Preferences `push_habits`). Confirm this rule.
G6 — **Mood/ratings UX**: `mood_before`/`mood_after`/`ease`/`satisfaction` are optional per completion. Prompted **every** completion (skippable), or only on an explicit "detailed log"? (Quick-check vs detailed.)
G7 — **Purpose/project links**: confirm habits link to purposes (`purpose_habits`) + projects (`project_habits`). Does completing a habit **contribute to a purpose's metric/progress**, or is the link purely navigational?
G8 — **Dropped v1 fields**: want any back? `success_criteria` (definition of done), `difficulty`, completion `location`/`time`?
G9 — **Backfill / retroactive completion**: can the user log/edit a completion for a **past date** (calendar implies yes), and does that **recompute streaks**? Any limit (e.g. can't backfill beyond N days)?

## Resolution
`[INTENT: Victor, 2026-06-27 session]` — intake is now **WHOLE**.

- **G1 — Views (4 surfaces).** `[INTENT]`
  1. **Dashboard** — all habits, with the ability to check off *any* habit (not only today's due ones).
  2. **To-do list** — today's due habits, offering **three display modes**: **Calendar**, **List**, **Checkbox**.
  3. **Per-habit standalone page** — streak / completion-rate / mood analytics + calendar (per CLAUDE.md §4).
  4. **All-Habits Overview** — summary listing of all habits.
  `[INTERP]` Dashboard (interactive, check-any) and All-Habits Overview (summary) are listed as distinct;
  whether they consolidate into one surface is a contract-aspect decision (Step 2), not assumed here.

- **G2 — Streak semantics.** `[INTENT]` CONFIRMED: streak = **consecutive scheduled occurrences** (daily =
  every day; weekly+`days_of_week` = each scheduled weekday). **Missing a scheduled occurrence resets
  `current_streak` to 0 — no grace.** All three counters (`current_streak`/`longest_streak`/`total_completions`)
  **recompute deterministically from the `habit_completions` ledger**; the denormalized columns are a cache.
  ⚠ **Gamification dependency:** streaks feed the XP/achievements system (`xp_history`, `achievements`,
  `user_achievements`) — Gamification docs inherit this as a real dependency. `[INTENT: Victor — "relation to Gamification"]`

- **G3 — Build vs break.** `[INTENT]` CONFIRMED: a **break**-habit completion = "successfully abstained today"
  (logged success); the to-do checkbox means "stayed clean"; streak = consecutive clean scheduled days.
  Relapse = no completion logged → streak resets (same rule as G2).

- **G4 — Quantified completion.** `[INTENT]` CONFIRMED: "done for the day" when `count >= target_count`;
  **partial does not advance the streak** but is logged for analytics. `count` = repetitions (drives done/
  not-done); `value` = measured quantity (e.g. miles, for analytics charts).

- **G5 — Scheduling / today-list.** `[INTENT]` CONFIRMED: a habit appears in today's list when today matches
  `frequency` + `days_of_week`, grouped by `time_of_day`; `times_of_day` drives multiple reminders via
  Preferences `push_habits`.

- **G6 — Mood/ratings UX.** `[INTENT]` CONFIRMED (default): **quick-check by default** (one tap = done);
  mood/ease/satisfaction prompted only via an explicit "detailed log" affordance. All four fields stay optional.

- **G7 — Purpose/project links.** `[INTENT]` CONFIRMED: **contributory, not purely navigational.** Completing a
  habit **contributes to the linked purpose's metric/progress** (writes/increments a `purpose_metric_value`
  via the `purpose_habits` link); `project_habits` links habits to projects. ⚠ **INTENDED** — no code wires the
  completion→metric mapping yet; the contract (one completion → which metric value) is a dependency the Purpose
  feature must define. Candidate ADR.

- **G8 — Dropped v1 fields: ADD BACK (planned).** `[INTENT]` Victor wants the dropped v1 fields **planned back**
  ("some could be useful"): `success_criteria` (definition of done), `difficulty`, completion `location`,
  completion `time`. ⚠ **INTENDED** — none exist in ADR-002 today → **candidate ADR-002 amendment** (habits +
  habit_completions columns). To be specified in the contract/structure-data aspects as INTENDED, not FACT.

- **G9 — Backfill / retroactive completion: USER-CONFIGURABLE POLICY.** `[INTENT]` Backfill of past-date
  completions is allowed and **recomputes streaks**; the **backfill window is a user-set preference** (the user
  decides his own policy), not a hardcoded limit. ⚠ **INTENDED** — implies a Preferences setting (e.g.
  `habit_backfill_window_days`) → feeds the Preferences INTENDED-fields set / candidate ADR-002 amendment.

### Carried into Transform as ⚠INTENDED (not shipped — flag, don't fake)
- G1 view surfaces beyond the schema (UI-level, no data change)
- G7 completion → purpose-metric contribution contract
- G8 four v1 fields restored (`success_criteria`, `difficulty`, completion `location`, completion `time`)
- G9 user-configurable backfill window (a Preferences setting)
- G2 streak → Gamification XP/achievements dependency

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-18 | documentation-blueprint | intake harvested (v2 ADR-002 §5.5 + v1 life-os habits); gap map G1–G9 raised |
| 2026-06-27 | documentation-blueprint | G1–G9 resolved with Victor; intake marked WHOLE. INTENDED surface flagged (G1 views, G7 metric contribution, G8 4 fields back, G9 user backfill policy, G2 Gamification dep). |
