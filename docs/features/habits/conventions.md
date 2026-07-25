<!-- Conventions — features/habits · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · life-os habits · intake -->

# Conventions — Habits  (level: Feature)

## How to build here
- **Counters are derived, never stored truth.** `current_streak`/`longest_streak`/`total_completions` are a cache
  recomputed from the `habit_completions` ledger on every completion/edit/delete/backfill — never increment them
  by hand (HB-2). `[INTENT G2]`
- **One completion row per habit per date.** Logging is an **upsert** on (`habit_id`,`completed_date`) (HB-3);
  re-logging today edits the same row. `[FACT: ADR-002 §5.5 UNIQUE]`
- **Streak = consecutive *scheduled* occurrences, not calendar days.** Compute against `frequency` +
  `days_of_week`; a missed scheduled occurrence resets to 0 (no grace) (HB-2). `[INTENT G2]`
- **"Done" is `count >= target_count`.** Partial completions log for analytics but do not advance the streak; use
  `value` for measured quantity charts, `count` for done/not-done (HB-5). `[INTENT G4]`
- **Break habits log success, not relapse.** A completion on a break habit means "abstained today"; absence of a
  completion is the relapse (HB-4). `[INTENT G3]`
- **Quick-check first, detailed log opt-in.** Default completion is one tap; mood/ease/satisfaction only via the
  explicit detailed-log affordance (HB-7). `[INTENT G6]`
- **Today-list is computed, not stored.** Derive due-today from `frequency` + `days_of_week`, group by
  `time_of_day`; drive reminders from `times_of_day` via Preferences `push_habits` (HB-6). `[INTENT G5]`
- **Backfill respects the user's window.** Past-date completions recompute streaks; reject beyond the
  user-configured limit (HB-10, ⚠ INTENDED). `[INTENT G9]`
- **Notes via `pages`.** A habit's notes are a linked `pages` row (`entity_type='habit'`), never inline. `[FACT: §5.2]`
- **Purpose contribution goes through `contributions`.** A completion contributes to a purpose metric via the
  **`contributions`** primitive (M7 — retiring `purpose_habits`) as the S4 `contribute_purpose_metric` effect (R2,
  idempotent via R1) — Habits never writes `purpose_metric_values` directly (HB-8, §6). `[INTENT G7; ADR-011 M7; ADR-004 S4]`
- **The habit is a pursuable — declare `measurement_kind`/`binding_mode`.** The habit carries `measurement_kind`
  (natural **`rate`**) + `binding_mode` (a completion = `event-trigger`), never a bespoke goal-type column (M1/M2);
  its rate/progress derives, the streak cache stays derived-from-ledger (HB-2). `[INTENT; ADR-011 M1/M2]`
- **Tags via `entity_tags`, not inline/`page_tags`.** The As-is inline `habits.tags` + `page_tags` retire to the
  shared **`entity_tags`** primitive (SP1); Habits registers `entity_type='habit'`, a consumer. `[INTENT; ADR-006 SP1]`
- **`streak(habit)` is an M5 measure seam.** Advertise streak/completion-rate as queryable measures (R7) — never a
  direct cross-module table read (M5). `[INTENT; ADR-011 M5]`

## Naming & layout
- Enum values (canonical): `habit_type` `build`/`break`; `frequency` `daily`/`weekly`/`biweekly`/`monthly`/
  `custom`; `time_of_day` `morning`/`afternoon`/`evening`/`anytime`/`whole_day`; `domain` (8) `health`/`career`/
  `finance`/`relationships`/`personal_growth`/`spiritual`/`recreation`/`environment`. `[FACT: ADR-002 §5.5]`
- ⚠ INTENDED `habits.difficulty` values (restored from v1): `very_easy`/`easy`/`medium`/`hard`/`very_hard`.
  `[INTENT G8; FACT: life-os types/habits.ts]`
- Platform-wide conventions: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates
  `YYYY-MM-DD` (`completed_date`), soft delete, `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`
- Enums: string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core` (never TS `enum`).
  `[FACT: packages/types/src/CLAUDE.md]`

## Local landmines / "never do"
- **Never** trust or hand-edit the streak cache — recompute from the ledger (HB-2). `[INTENT G2]`
- **Never** insert a second completion row for the same habit+date — upsert (HB-3). `[FACT: UNIQUE]`
- **Never** count a partial completion toward the streak (HB-5). `[INTENT G4]`
- **Never** model action-list cadence or deadlines here — that's Routines / Tasks; Habits is behavior recurrence
  only. `[FACT: CLAUDE.md modules]`
- **Never** write `consequence_ledger`/XP or `purpose_metric_values` from Habits — emit the S4 effects
  (`contribute_purpose_metric` · `award_xp`→`grant_currency(XP)` E2) through the owning module, idempotent via R1
  (HB-8/HB-9, §6; R2). `[INTENT G2,G7; ADR-004 S4/R1/R2; ADR-012 E2]`
- **Never** retire `project_habits` — only the `purpose_*` trio (`purpose_habits`/`purpose_routines`/
  `purpose_projects`) retires → `contributions`; `project_habits` is a **kept** live junction (C1 guard).
  `[FACT: CLAUDE.md junctions; INTENT ADR-011 M7]`
- **Never** backfill past the user's configured window without a typed rejection (HB-10). `[INTENT G9]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
