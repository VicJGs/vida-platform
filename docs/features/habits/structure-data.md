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

### ⚠ INTENDED additions (NOT in ADR-002 / habit.ts today) — candidate ADR-002 amendment `[INTENT G7,G8,G9; ADR-011/012/006/004]`
- **Measurability (ADR-011 M1/M2):** the habit is a **pursuable** → carries `measurement_kind` CHECK ∈
  `quantitative·milestone·rate·qualitative` (natural = **`rate`**, occurrence frequency) + `binding_mode` CHECK ∈
  `manual·derived-pull·event-trigger` (a completion is the **`event-trigger`**). No bespoke `target_type` exists
  on `habits` today → pure add, not a decompose. `[INTENT; ADR-011 M1/M2 §3.1/§3.5]`
- **Restored v1 fields (G8):** `habits.success_criteria`[E] (definition of done), `habits.difficulty`
  ∈{very_easy…very_hard}; `habit_completions.location`[E], `habit_completions.completion_time`.
- **Purpose contribution (G7 — ADR-011 M7):** the **As-is** `purpose_habits` junction (`schema.ts:413`) is
  **retired** → the polymorphic weighted **`contributions`** primitive (a habit *contributes* to a purpose/target;
  laddering weight = `contributions.contribution_percentage`, M4). The completion→metric write is Purpose-owned,
  emitted as the S4 `contribute_purpose_metric` effect (R1/R2) — never a direct write. `[INTENT G7; ADR-011 M7/M4]`
- **Backfill window (G9):** lives in **Preferences** (`habit_backfill_window_days`), not on `habits`.
- **Shared tags (ADR-006 SP1 — DECIDED):** the **As-is** inline `habits.tags` `[E]` JSON (`schema.ts:267`) + the
  retired `page_tags` (`schema.ts:121`) are **retired** → the shared **`entity_tags`** primitive
  (`tag_id, entity_type, entity_id`); Habits registers `entity_type='habit'` in the open taggable-type registry and
  is a *consumer*. (Was "flagged, not yet decided" — now **decided**.) `[INTENT; ADR-006 SP1]`

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
  backfill window), Purpose (**`contributions`** — As-is `purpose_habits` junction retired, M7), Projects
  (**`project_habits`** — KEPT; only the `purpose_*` trio retires, C1 guard). In-edges: Journal `/summary`,
  Purpose metrics (HB-8), Gamification (HB-9). `[FACT: module-dependency-graph.md; INTENT ADR-011 M7]`
- Respects the coupling budget — no direct cross-module table reads; links via junctions + integration points
  (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- `HabitType`, `HabitFrequency`, `TimeOfDay`, `HabitDomain` — string-literal unions + SQL CHECK + Zod in
  `@vida/core`, declared once. `[FACT: habit.ts; packages/types/src/CLAUDE.md]`
- **Streak/total counters derive from the `habit_completions` ledger** (HB-2) — the columns on `habits` are a
  cache, not a second source. Habits **advertises `streak(habit)`/completion-rate as an M5 queryable measure**
  (via the R7 read seam) that Journal/Purpose read through — not a direct table read (ADR-011 M5). `[INTENT M5]`
- "Done for the day" derives from `count >= target_count` (HB-5), not a separate boolean.

## ADRs / structural decisions
- **ADR-002 §5.5** — the 2 tables (authoritative As-is FACT floor). **ADR-001** — RQ + Zustand state. **ADR-003** — LWW + ledger merge.
- **Subject to (R6 named-ADR set):** **ADR-011** (measurability — M1/M2/M4/M5; retire `purpose_habits`→`contributions` M7),
  **ADR-012** (economy — `grant_currency` E2; retire `xp_history`→`consequence_ledger` E3), **ADR-006** (tags — retire
  `page_tags`/inline `habits.tags`→`entity_tags` SP1), **ADR-004** (the completion's S4 effects + R1 idempotency rail).
  Two-tier: the retired tokens are **live FACTs** (schema lines cited) recorded above, retired in `[INTENT]`. `[INTENT R6]`
- ⚠ **Surfaced decision:** the restored v1 fields (G8) + the purpose-contribution contract (G7) + the Preferences
  backfill setting (G9) → a **candidate ADR-002 amendment** / `/adr-new` in the build phase. `[INTENT G7,G8,G9]`

## Completion checklist
- [x] data model (2 tables) · [x] dep graph (independent domain, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
