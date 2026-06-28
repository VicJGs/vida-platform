<!-- Business Rules — features/check-ins · /documentation Phase 2 · sources: ADR-002 §5.13 · CLAUDE.md §9 · intake -->

# Business Rules — Check-ins  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Check-ins are "deeply
> personal" (ADR-002 L982-985), so ZK-1 governs every free-text field. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **CK-1 — Encrypted reflection, plaintext scales.** `top_intentions`, `wins`, `gratitude`, `challenges`,
  `tomorrow_focus`, `reflection`, `custom_data`, and template `name`/`description`/`label`/`placeholder` are
  `[E]` (ZK-1). `mood_score`/`energy_level` (1-10), `check_in_type`, `check_in_date`, schedule config are
  **plaintext** — needed for trend charts. `[FACT: ADR-002 §5.13; L970-997]`
- **CK-2 — One check-in per (date, type).** Uniqueness is **(`check_in_date`, `check_in_type`)** so morning +
  afternoon + evening + reviews coexist on a day. ⚠ the current schema has `check_in_date` **UNIQUE alone**
  (forbids that) — this is a **bug to fix**. `[INTENT G2; FACT: L3205 (current, wrong)]`
- **CK-3 — Six check-in types (⚠ 3 INTENDED).** `check_in_type` ∈ {morning, afternoon, evening, weekly_review,
  monthly_review, yearly_review}. Current schema ships only {morning, evening, weekly_review}. `[INTENT G3; FACT:
  L3207 (current)]`
- **CK-4 — Default template per type; columns = the built-in default.** Each type has a ready default template
  (zero-setup). The hardcoded `daily_check_ins` columns ARE the built-in default template, materialized for
  querying/trends; `custom_data` stores answers to **extra** user-added questions only — no duplication. `[INTENT
  G3,G5]`
- **CK-5 — Templates are typed and customizable.** A template owns ordered `check_in_template_questions`
  (`field_type` ∈ mood_scale/energy_scale/text_list/text_area/rating/boolean), **UNIQUE(`template_id`,
  `field_key`)**; `min_value`/`max_value` bound scale/rating types. `[FACT: §5.13 L3261-3283]`
- **CK-6 — Reviews aggregate other modules (⚠ INTENDED, cross-wave).** weekly/monthly/yearly reviews read
  **Purpose / Projects / Tasks** progress (Purpose `target_reviews` happen inside the review). Reads go through
  integration points (§6), never direct tables; the contract is **finalized when those modules are documented**.
  `[INTENT G7]`
- **CK-7 — Check-ins feed the Journal day page.** A check-in **links to its day's Journal `pages` row** via
  `entity_links` (`daily_check_in` is a valid `entity_type`); reviews **backlink** the reviewed entities. The
  Journal is filled based on how check-ins are filled. `[INTENT G10; FACT: ADR-002 L1350]`
- **CK-8 — Scheduling drives reminders, user-set, per-template.** A template's `schedule_type` / `schedule_days`
  / `preferred_time` (and the user's chosen times per type) fire **reminders via Preferences + Notifications**,
  configured in each template's standalone editor. `[INTENT G4,G8]`
- **CK-9 — No tags.** Check-ins use links (CK-7), not a tag vocabulary. `[INTENT G10]`
- **CK-10 — Referential integrity.** `daily_check_ins.template_id` is **SET NULL** on template delete (the entry
  survives); `check_in_template_questions` **CASCADE** on template delete. `[FACT: L3208, L3263]`
- **CK-11 — Streaks feed Gamification (⚠ INTENDED).** Consecutive-day check-in streaks + completion emit
  XP/achievement events; Gamification owns the reward. `[INTENT G9]`
- **CK-12 — Local-first.** Every check-in/template edit succeeds locally first; LWW on structured columns.
  `[FACT: LF-2; ADR-003]`

## Validation & edge cases
- Enum CHECKs `[FACT: ADR-002 §5.13]`: `check_in_type` (current 3 → 6 INTENDED), `field_type`(6),
  `schedule_type`{daily,weekly,custom}, `preferred_time`{morning,afternoon,evening,anytime}; `mood_score`/
  `energy_level` 1-10.
- A required template question (`is_required=1`) blocks completion until answered (CK-5). `[INTERP CK-5]`
- A scale answer outside `min_value`/`max_value` is rejected (CK-5). `[INTERP CK-5]`
- Editing yesterday's check-in is allowed (calendar/history) and re-feeds its Journal day page (CK-7). `[INTERP CK-7]`
- A review with no linked goals/projects still saves as free reflection (CK-6 degrades gracefully). `[INTERP CK-6]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Entry wizard (template render) | loading template | "no template — use default" | template/save error, typed | completed; linked to Journal day page |
| History / calendar | skeleton | "no check-ins yet" + start CTA | typed read error, retry | list/calendar of past check-ins |
| Mood/energy trends (dashboard tab) | computing | "not enough data" | data error → degrade chart | trend charts |
| Review (weekly/monthly/yearly) | loading module progress | "no goals/projects to review" → free reflection | partial module read → show what's available + flag | aggregated progress + saved review |
| Template builder | loading | "no custom questions" | save fails (dup field_key) → typed error | template/questions saved, ordered |
| Reminder fire | — | (no schedule set) | notification error → in-app fallback | prompt at preferred time |

## Failure behavior (fail loud — constitution §5)
- A failed check-in save reverts optimistic state with a typed error — never silent loss of a personal entry.
  `[INTENT G1; FACT §5]`
- A review where a module read fails shows **available progress + a flag**, never a falsely-complete review. `[INTENT G7]`
- Trend/streak compute errors show a flagged partial, never a wrong number. `[INTENT G6,G9]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**INTENDED / to-fix**, vs ADR-002 §5.13 today (note: **zero code** — no `@vida/types`/`@vida/core`):
- **CK-2** composite UNIQUE(`check_in_date`,`check_in_type`) — schema **fix**.
- **CK-3** expand `check_in_type` (+ afternoon, monthly_review, yearly_review).
- **CK-6** review→Purpose/Projects/Tasks aggregation contract (cross-wave — finalize when documented).
- **CK-8** per-template schedule → Preferences + Notifications wiring.
- **CK-11** Gamification streak events.
Until amended, the live invariants are CK-1, CK-4 (columns), CK-5, CK-7 (entity_type exists), CK-10, CK-12. All
schema changes → ADR-002 amendment + the cross-module review contract. `[FACT: ADR-002 §5.13; INTENT G2,G3,G6,G7,G8,G9]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
