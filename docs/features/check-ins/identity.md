<!-- Identity — features/check-ins · /documentation Phase 2 · sources: ADR-002 §5.13 · CLAUDE.md §9 · docs/intake/check-ins.md -->

# Identity — Check-ins  (level: Feature)

**What it is.** A **structured daily reflection** system: template-driven morning / afternoon / evening
check-ins (mood, energy, intentions, wins, gratitude, challenges, reflection) plus periodic
**weekly / monthly / yearly reviews** that aggregate the user's goals, purposes, projects, and task progress
into one place to review — all encrypted, all local-first. `[FACT: CLAUDE.md §9; ADR-002 §5.13]`

**The desire behind it.** The user wants a lightweight "**pre-fill**" ritual that keeps him from getting lost in
his daily workload and keeps him **faithful to his commitments** — a quick signal of whether he's doing well,
and, on a cadence, a real **review of how his goals and projects are developing**. It should be effortless by
default (use a built-in template) yet fully personalizable. `[INTENT: Victor 2026-06-28]`

**Scope — net-new in v2 (thin legacy).** `[INTENT G1–G10]`
- Owns **3 tables**: `daily_check_ins`, `check_in_templates`, `check_in_template_questions`. `[FACT: ADR-002 §5.13]`
- **Six check-in types (⚠ 3 INTENDED):** morning, **afternoon**, evening, weekly_review, **monthly_review**,
  **yearly_review**. A **default template per type** ships so the user can start with zero setup. `[INTENT G3]`
- **Template engine:** typed questions (mood_scale / energy_scale / text_list / text_area / rating / boolean);
  the hardcoded columns are the built-in default template, `custom_data` holds extra user-added answers. `[FACT:
  §5.13; INTENT G5]`
- **Reviews are a cross-module review surface (⚠ INTENDED):** weekly/monthly/yearly reviews **pull Purpose /
  Project / Task progress** for the user to assess. `[INTENT G7]`
- **Views (G1):** entry wizard · history list · mood/energy trend charts · calendar · a **dashboard tab** on the
  standalone page — and the daily entry is **surfaced inside the Journal** flow. `[INTENT G1,G4,G6]`

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules]`
- **Not the Journal.** Check-ins are a *complemental* structured ritual; the **Journal** (integration layer) is
  the daily dashboard — check-in responses **feed the Journal's day page**, they don't replace it. `[INTENT G4,G10]`
- **Not the owner of goals/projects.** Reviews *read* Purpose/Projects/Tasks via integration points; those
  modules own that data (§6). Purpose's `target_reviews` happen *within* a check-in review. `[INTENT G7]`
- **Not a free-form note store.** `reflection` is an inline `[E]` field; but a check-in **links to `pages`** (the
  Journal day page) via `entity_links`. `[INTENT G10; FACT: ADR-002 L1350]`
- **Not tagged.** Check-ins use **links, not tags** (no per-entry tag vocabulary). `[INTENT G10]`
- **Not the Gamification owner.** Check-in streaks feed XP/achievements (⚠ INTENDED), owned there. `[INTENT G9]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
