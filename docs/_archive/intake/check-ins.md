# Intake: Check-ins
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/check-ins (Wave 1 finale — independent domain; feeds Journal /summary + mood/energy trends + Gamification)
Sources: v2 (ADR-002 §5.13 + §Check-ins P/E table L970 + CLAUDE.md §9) · v1 (life-os — NO dedicated check-ins; "today" page ≈ future Journal) · user intent
Session: 2026-06-28 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 3 tables** `[FACT: ADR-002 §5.13 L3200-3284; §Check-ins L970-997]`:
- `daily_check_ins`: `check_in_date` (**UNIQUE**, YYYY-MM-DD), `check_in_type`{morning,evening,weekly_review}, `template_id` (SET NULL), `mood_score` (1-10 CHECK), `energy_level` (1-10 CHECK), `top_intentions`[E] JSON, `wins`[E] JSON, `gratitude`[E] JSON, `challenges`[E] JSON, `tomorrow_focus`[E] JSON, `reflection`[E], `custom_data`[E] JSON (template answers). `[FACT: L3203-3228]`
- `check_in_templates`: `name`[E], `description`[E], `icon` (default clipboard-check), `is_default`, `is_active`, `schedule_type`{daily,weekly,custom}, `schedule_days` JSON[0-6], `preferred_time`{morning,afternoon,evening,anytime}, `sort_order`. `[FACT: L3234-3255]`
- `check_in_template_questions`: `template_id` (CASCADE), `field_key`, `label`[E], `field_type`{mood_scale,energy_scale,text_list,text_area,rating,boolean}, `placeholder`[E], `is_required`, `min_value`, `max_value`, `sort_order`. **UNIQUE(template_id, field_key)**. `[FACT: L3261-3283]`

**Intent (CLAUDE.md §9)** `[FACT: CLAUDE.md §9]`: "Daily **morning/evening** check-ins with **mood, energy, gratitude, reflection** (**customizable templates**)."

**Encryption rationale** `[FACT: ADR-002 L970-997]`: mood_score/energy_level **plaintext** (needed for trend charts); all user-generated lists + reflection + custom_data **[E]** ("deeply personal").

## B. WHAT v1 DID — life-os (legacy)
`[FACT: life-os src/features/today]`
- **No dedicated check-ins feature.** The `today` page is a **daily dashboard** (FinancialSummary, HabitsGrid, TaskQueue, TodayEvents, ProductivityScoreCard, RoutineFeed) — that concept maps to v2's **Journal** module, NOT Check-ins. `[FACT: features/today/components]`
- A `productivityScore` util existed (today/utils) — a computed daily score, not a structured reflection. `[FACT: today/utils/productivityScore.ts]`
- ⇒ **Structured morning/evening check-ins with customizable templates are a NEW v2 concept** — minimal legacy to harvest; intent comes from CLAUDE.md §9 + Victor. `[INTERP]`

### Key notes (v2 net-new)
1. **Zero code:** no `@vida/types` check-in file, no `@vida/core` model — only the ADR-002 schema exists. `[FACT: packages survey]`
2. **Template engine is the distinctive part:** templates + typed questions + per-instance `custom_data` answers — a small form-builder. `[FACT: §5.13]`
3. ⚠ **Likely schema bug (see G2):** `daily_check_ins.check_in_date` is **UNIQUE alone**, but `check_in_type` allows morning/evening/weekly_review — so the schema **forbids both a morning AND an evening check-in on the same day**, contradicting CLAUDE.md §9 ("morning/evening"). `[FACT: L3205 vs CLAUDE.md §9]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: check-in **entry flow** (a wizard rendering the active template's questions) · **history/list** · **mood/energy trend charts** · **calendar** view. Standalone Check-ins page, or surfaced inside the Journal/daily dashboard? Confirm the view set + where it lives.
G2 — ⚠ **UNIQUE constraint (schema fix)**: should the uniqueness be **(`check_in_date`, `check_in_type`)** instead of `check_in_date` alone, so morning + evening + weekly_review can coexist on one day (per CLAUDE.md §9)? → candidate ADR-002 fix.
G3 — **Templates: how much customization?** Ship **default templates** (morning / evening / weekly_review) the user can use as-is, plus a **full template builder** (add/edit/reorder typed questions), or preset templates + light tweaks only? Confirm depth.
G4 — **Relationship to Journal** (the integration layer): do check-ins **feed/embed into the daily Journal** (the dashboard aggregating habits/tasks/etc.)? Is the check-in *entry* surfaced as part of the journal's daily flow, with check-in data shown in the journal `/summary`?
G5 — **Standard fields vs template `custom_data`** (the model's ambiguity): `daily_check_ins` has **hardcoded** columns (top_intentions, wins, gratitude, challenges, tomorrow_focus, reflection) AND a `custom_data` JSON for template answers. Are the hardcoded columns the **built-in default template** (and `custom_data` only for *extra* user-added questions), or are templates fully free-form with the columns just a convenience? Clarify so the two don't duplicate.
G6 — **Mood/energy trends + cross-module**: mood_score/energy_level drive trend charts (plaintext for that reason). Do they **correlate with other modules** (e.g. mood vs habit completion, since Habits also logs mood_before/after)? Any unified "mood" view, or per-module only?
G7 — **Weekly review vs Purpose reviews**: `check_in_type='weekly_review'` overlaps conceptually with Purpose's `target_reviews`. Distinct (weekly_review = general life reflection; target_reviews = per-goal), or should they connect? Confirm.
G8 — **Reminders/scheduling**: templates carry `schedule_type` + `preferred_time` + `schedule_days`. Do check-ins fire **reminders/notifications** (via Preferences/Notifications) to prompt the user at the preferred time? Confirm.
G9 — **Gamification**: check-in **streaks** (consecutive days) / completion feeding XP & achievements? Confirm (⚠ likely INTENDED).
G10 — **Notes & tags**: `reflection` is an inline `[E]` column (not a page) — confirm check-ins need **no** `pages` link and **no** tags (out of scope), keeping the module self-contained.

## Resolution
`[INTENT: Victor, 2026-06-28]` — intake **WHOLE**.

- **G2 — Schema fix CONFIRMED.** `daily_check_ins` uniqueness → **UNIQUE(`check_in_date`, `check_in_type`)** so
  multiple types coexist per day. ⚠ → ADR-002 fix. `[INTENT]`
- **G1 — Views CONFIRMED.** Entry wizard · history list · mood/energy trend charts · calendar, on a standalone
  Check-ins page + surfaced in the Journal daily flow (G4). `[INTENT]`
- **G3 — Default template PER TYPE + full builder; EXPANDED types.** `[INTENT]` Ship a **default template for
  each check-in type** so the user can start minimal without creating anything; he creates/edits only to
  personalize. ⚠ **`check_in_type` EXPANDS** to: morning, **afternoon**, evening, weekly_review,
  **monthly_review**, **yearly_review** (3 new values) → ADR-002 amendment.
- **G4 — CONFIRMED: complemental "pre-fill" + user-set times.** `[INTENT]` Check-ins help the user not get lost
  in daily workload and stay faithful to commitments — a "pre-fill" that signals if he's doing well. The user
  **chooses the time** for morning/afternoon/evening **and** the review check-ins (per-type scheduling, via
  Preferences + each template's editor, G8).
- **G5 — CONFIRMED.** Hardcoded columns = the built-in default template (materialized for querying/trends);
  `custom_data` = answers to *extra* user-added questions only. `[INTENT]`
- **G6 — CONFIRMED + dashboard tab.** Mood/energy trends here now; unified cross-module mood view later (⚠
  INTENDED). Add a **dashboard tab** to the Check-In standalone page. `[INTENT]`
- **G7 — REVIEWS ARE A CROSS-MODULE REVIEW SURFACE (reverses "distinct").** `[INTENT]` The review check-ins
  (weekly/monthly/yearly) are where the user **reviews his goals, purposes, projects** and how he's developing
  vs objectives — **aggregating progress of the tasks/events/etc. related to each**. So review check-ins
  **consume Purpose + Projects + Tasks** (Purpose's `target_reviews` happen *inside* the check-in review). ⚠
  **Forward dependency** (Check-ins=Wave 1 → Purpose=Wave 3, Projects=Wave 2): documented as INTENDED, the
  review→module contract **finalized when those modules are documented** (fill-order honesty).
- **G8 — CONFIRMED: per-template editable schedule/reminders.** `[INTENT]` Reminders live on the check-ins and
  reflect into **Preferences + Notifications**; the schedule/reminder config is **customizable in each
  template's standalone editor page** (per-type times, G4).
- **G9 — CONFIRMED.** Check-in streaks + completion feed XP/achievements (⚠ INTENDED, like Habits). `[INTENT]`
- **G10 — PAGES + LINKS (reverses default), NO tags.** `[INTENT]` Check-ins **need `pages`** — responses connect
  to the **Journal's page of the day** (the journal is filled based on how check-ins are filled), and reviews
  link to the reviewed entities via **`entity_links`/backlinks**. **No tags** (Victor: can't see how they'd
  apply; agreed). ⚠ requires adding `daily_check_in` (+ review) as a valid `pages`/`entity_links` `entity_type`.

### ⚠ New INTENDED surface flagged for build (not shipped)
G2 composite UNIQUE · G3 expanded check_in_type (afternoon/monthly_review/yearly_review) + default-template-per-type ·
G7 review→Purpose/Projects/Tasks aggregation (cross-wave, finalize later) · G8 per-template schedule→Preferences+
Notifications · G9 Gamification streaks · G10 check-in `pages` link + journal-day backlink + `daily_check_in`
entity_type. All → candidate ADR-002 amendment (+ the cross-module review contract).

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-28 | documentation-blueprint | intake harvested (v2 ADR-002 §5.13 3 tables + L970 P/E rationale + CLAUDE.md §9; v1 has NO check-ins — "today"≈Journal); gap map G1–G10. ⚠ Flagged schema bug: check_in_date UNIQUE alone forbids morning+evening same day (G2). |
| 2026-06-28 | documentation-blueprint | G1–G10 resolved; intake WHOLE. G2 composite UNIQUE; G3 expanded check_in_type (+afternoon/monthly_review/yearly_review) + default-template-per-type + full builder; G5 columns=default template + custom_data for extras; G7 review check-ins = cross-module review surface (read Purpose/Projects/Tasks — forward dependency, finalize later); G8 per-template editable schedule→Prefs+Notifications; G10 pages+links to Journal day page, no tags. |
