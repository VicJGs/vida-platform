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
  valid `entity_type`, L1350); reviews backlink reviewed entities. NO tags.

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
- Enums (`check_in_type`, `field_type`, `schedule_type`, `preferred_time`) — SQL CHECK + (to-build) Zod in
  `@vida/core`, declared once. `[FACT: §5.13; INTERP — no types yet]`

## ADRs / structural decisions
- **ADR-002 §5.13** — the 3 tables (authoritative). **ADR-001** — RQ + Zustand. **ADR-003** — LWW.
- ⚠ **Surfaced:** the UNIQUE **fix** (G2) + expanded types (G3) + review contract (G7) → **ADR-002 amendment**;
  the review→module aggregation is a cross-module contract finalized with Purpose/Projects. `[INTENT G2,G3,G7]`

## Completion checklist
- [x] data model (3 tables) · [x] dep graph (independent + flagged forward review deps) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
