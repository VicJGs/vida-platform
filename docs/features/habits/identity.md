<!-- Identity — features/habits · /documentation Phase 2 · sources: ADR-002 §5.5 · @vida/types/habit.ts · CLAUDE.md §4 -->

# Identity — Habits (level: Feature)

**What it is.** The platform's **recurring-behavior tracker**. The user defines behaviors to **build** (positive)
or **break** (negative), schedules them by recurrence + time of day, checks them off, and watches **streaks**,
completion rates, and mood trends accumulate — per habit and across all habits. `[FACT: CLAUDE.md §4; ADR-002 §5.5]`

**The desire behind it.** The user wants to **install good behaviors and kill bad ones**, with daily friction low
(one tap to complete) but the payoff rich — visible streaks, analytics, and a sense that each check-off _moves
something bigger_. Habits should feel like the engine that quietly powers the user's goals and rewards, not a
disconnected checklist. `[INTENT: Victor 2026-06-27]`

**Scope — full v1 (NOT an MVP).** `[INTENT G1, G2, G4]`

- Owns 2 tables: `habits` (definition · recurrence · build/break · domain · denormalized streak cache) and
  `habit_completions` (the per-date completion ledger with quantity + mood). `[FACT: ADR-002 §5.5]`
- **4 view surfaces** `[INTENT G1]`:
  1. **Dashboard** — all habits, able to check off _any_ habit (not only today's due ones).
  2. **To-do list** (today's due habits) offering **three display modes**: **Calendar · List · Checkbox**.
  3. **Per-habit standalone page** — streak / completion-rate / mood analytics + calendar of completions.
  4. **All-Habits Overview** — summary listing of every habit.
- **Quantified completion** (`target_count`/`unit`/`count`/`value`), **streaks** (consecutive scheduled
  occurrences), **mood tracking** (before/after + ease/satisfaction), **build & break** semantics. `[INTENT G2,G3,G4,G6]`
- **Measurable as a pursuable** — the habit carries `measurement_kind` (natural **`rate`** — occurrence
  frequency) + `binding_mode` (a completion is the **`event-trigger`**), ADR-011 M1/M2. `[INTENT; ADR-011 M1/M2]`

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules]`

- **Not an action-list or deadline tool.** _Action-list_ cadence (morning routine steps) belongs to **Routines**;
  _deadline_ recurrence (obligations) belongs to **Tasks**. Habits owns **behavior** recurrence only.
- **Not the Gamification engine.** Streaks/completions **feed** the economy via the **`award_xp`** S4 effect
  (ADR-004 §3.2.2), which ADR-012 generalizes to **`grant_currency(XP)`** (E2); balances derive from the
  **`consequence_ledger`** (E3, Gamification-owned) — never a forward `xp_history`. Habits emits the effect,
  never writes the ledger (R2). `[INTENT G2; ADR-004 S4; ADR-012 E2/E3]`
- **Not the Purpose-metrics owner.** A completion **contributes to** a linked purpose's metric via the
  polymorphic weighted **`contributions`** primitive (ADR-011 M7 — retiring the `purpose_habits` junction); the
  metric itself is owned by **Purpose & Goals** (HB-8). `[INTENT G7; ADR-011 M7]`
- **Not a notes store.** A habit's notes live in a linked `pages` row (`entity_type='habit'`), never inline.
- **Not its own tag vocabulary.** `habits.tags` is inline `[E]` JSON today (As-is FACT) `[FACT: ADR-002 §5.5]`,
  retired in favor of the shared **`entity_tags`** primitive (ADR-006 SP1) — Habits is a _consumer_, registering
  `entity_type='habit'` in the open taggable-type registry. (Direction now **decided**: `entity_tags`, per the
  platform tag foundation — was "flagged, not yet decided.") `[INTENT; ADR-006 SP1]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
