> ⤷ superseded by ../../modules/check-ins/current-spec.md (rules → ../../modules/check-ins/current-business-rules.md) — kept as backing, not the canonical truth. ⚠ pre-schema: the "UNIQUE on date alone / SET NULL / CASCADE" rows are stale; the schema is UNIQUE(date,type) + no-FK (see current-spec §3).
<!-- Structure & Data — features/check-ins · /documentation Phase 2 · sources: ADR-002 §5.13 · ADR-001/003 · intake -->

# Structure & Data — Check-ins  (level: Feature)

## Data model — 3 owned tables (current, authoritative) `[FACT: ADR-002 §5.13 L3200-3284; §Check-ins L970-997]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `daily_check_ins` | a check-in instance | top_intentions, wins, gratitude, challenges, tomorrow_focus, reflection, custom_data | `check_in_date` **UNIQUE** ⚠; `check_in_type` CHECK(3); `template_id` **SET NULL**; mood/energy 1-10 CHECK |
| `check_in_templates` | reusable form | name, description | `schedule_type` CHECK(3); `preferred_time` CHECK(4); `is_default`/`is_active`; `schedule_days` JSON |
| `check_in_template_questions` | typed questions | label, placeholder | `template_id` **CASCADE**; `field_type` CHECK(6); **UNIQUE(template_id, field_key)** |

- mood_score/energy_level are **plaintext** (trend charts); all lists + reflection + custom_data are `[E]`
  ("deeply personal"). `[FACT: L970-997]`
- `custom_data` is `[E]` JSON keyed by template `field_key` (the extra-questions answers, CK-4). `[FACT: L3217]`
- Structured columns sync **LWW** (no CRDT). `[FACT: ADR-003]`

### ⚠ INTENDED additions / fixes (vs ADR-002 today) — ADR-002 amendment + fix `[INTENT G2,G3,G6,G7,G8]`
- **G2 fix:** `daily_check_ins` uniqueness → **UNIQUE(`check_in_date`, `check_in_type`)** (current UNIQUE on date
  alone is a bug).
- **G3:** expand `check_in_type` CHECK → + `afternoon`, `monthly_review`, `yearly_review` (6 total).
- **G6/G7 review aggregation:** no new column — review check-ins read Purpose/Projects/Tasks via integration
  points; optional link rows (`entity_links`) record what a review covered.
- **G8:** schedule/reminder wiring → Preferences + Notifications (no new check-in column; reads template
  schedule).
- **G10 (mostly FACT):** check-in ↔ Journal-day-`pages` link via `entity_links` (`daily_check_in` already a
  valid `entity_type`, L1350); reviews backlink reviewed entities. **NO tags** — SP1-consistent (no bespoke tag
  store); a deliberate opt-out from `entity_tags` (SP4: tags≠links; check-ins uses `entity_links`). `[ADR-006 SP1/SP4]`

## State management map `[FACT: ADR-001 State]`
- **React Query** owns check-in/template reads + optimistic writes, the **derived** mood/energy trend datasets,
  and (⚠) review aggregation reads.
- **Zustand** owns ephemeral UI: entry-wizard step/answers draft, template-builder draft, active view
  (entry/history/trends/calendar), selected date.
- The built-in default-template fields are real columns (CK-4); custom answers live in `custom_data` JSON.

## Page / route map `[INTENT G1,G6; FACT: CLAUDE.md §9]`
- **Check-in entry wizard** — renders the active template (default or custom) for the chosen type.
- **Check-ins standalone page** — history list + **calendar** + a **dashboard tab** (mood/energy trends).
- **Template editor (standalone per template)** — add/edit/reorder questions + schedule/reminder config (G8).
- **Review screens** (weekly/monthly/yearly) — aggregated Purpose/Project/Task progress + reflection (⚠ G7).
- Daily entry also **surfaced inside the Journal** flow (G4).

## Dependencies / graph
- **Wave 1 (independent for daily entries).** Out-edges: Notes/Journal (day-page link), Preferences +
  Notifications (reminders). ⚠ **Forward out-edges (reviews):** Purpose (Wave 3), Projects (Wave 2), Tasks
  (Wave 1) — documented INTENDED, finalized later. In-edges: Journal `/summary`, Gamification (⚠). `[FACT:
  module-dependency-graph; INTENT G7]`
- No direct cross-module table reads — integration points only (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- A check-in instance is keyed by (`check_in_date`, `check_in_type`) (CK-2) — one per slot per day.
- Default-template fields = the materialized columns; custom answers = `custom_data` (no duplication, CK-4).
- Mood/energy live once on `daily_check_ins` (plaintext, the trend source). `[FACT: L979]`
- **Check-ins owns `check_in_streak*`/`last_check_in_date`** (ADR-012 E9 — the `user_profile` split): the streak is
  **derived from `daily_check_ins`** (consecutive-day analytic), never written onto the overloaded `user_profile`.
  As-is FACT floor: `user_profile.check_in_streak`/`longest_check_in_streak`/`last_check_in_date` (`schema.ts:1183-1185`)
  sit on the same overloaded row as Gamification's `total_xp`/`current_level` (`:1181-1182`) and Preferences'
  `persona`/`active_modules`/`onboarding_*` (`:1173`/`:1186`/`:1188-1189`) — the E9 split is a real 3-owner
  decomposition. `[INTENT; ADR-012 E9]`
- Enums (`check_in_type`, `field_type`, `schedule_type`, `preferred_time`) — SQL CHECK + (to-build) Zod in
  `@vida/core`, declared once. `[FACT: §5.13; INTERP — no types yet]`

## ADRs / structural decisions
- **ADR-002 §5.13** — the 3 tables (authoritative). **ADR-001** — RQ + Zustand. **ADR-003** — LWW.
- **Driver ADRs (Part 1.2):** **ADR-012** (E9 `user_profile` split — check-ins owns `check_in_streak*`; E2
  `grant_currency(XP)` feeder → `consequence_ledger` E3) · **ADR-006** (SP1/SP4 — the "no tags" opt-out is
  SP1-consistent, uses `entity_links`). `[INTENT; ADR-012/006]`
- ⚠ **Surfaced:** the UNIQUE **fix** (G2) + expanded types (G3) + review contract (G7) → **ADR-002 amendment**;
  the review→module aggregation is a cross-module contract finalized with Purpose/Projects. `[INTENT G2,G3,G7]`

## Completion checklist
- [x] data model (3 tables) · [x] dep graph (independent + flagged forward review deps) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
