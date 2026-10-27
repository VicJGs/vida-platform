# Scope Reconciliation — v1 Architecture Audit

<!-- Surfaced 2026-06-30 during documentation-blueprint (Routines intake). Victor flagged that v1 planned more
     modules than v2 carried. Audited v1's COMPLETE_SYSTEM_ARCHITECTURE.md against v2's documented scope. -->

**Source:** `../life-os/COMPLETE_SYSTEM_ARCHITECTURE.md` (GitHub VicJGs/life-os@main `f66895b`, 65KB) —
v1 enterprise architecture: **91 tables / 7 life domains**. `[FACT: doc §2.2 Core Entities L430-442; §3.2 L758-764]`
**Target:** v2 = ~60 tables / 12 domains (ADR-002 + CLAUDE.md) — a deliberate restructure.

## The finding

The v2 rebuild consolidated 91→~60 tables and **silently dropped four intended things**. The documentation
manifest's module list was derived from v2, so it **inherited these omissions** — documenting straight through
would have made the cuts permanent (the v1-failure pattern: intent that never got tracked, `[[v1-failure-lessons]]`).

## Reconciliation table `[FACT: architecture doc §2.2 + §3.2]`

| v1 domain / entity                                                                                | v2 status                                         | Decision                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose (Purpose, Target, Metric, Review)                                                         | ✅ kept (Purpose & Goals)                         | —                                                                                                                                                                                                                                    |
| Relationships (Person, Interaction, ScheduledInteraction)                                         | ✅ kept                                           | —                                                                                                                                                                                                                                    |
| Life Mgmt: Routine, Habit                                                                         | ✅ kept                                           | —                                                                                                                                                                                                                                    |
| Finance (Account, Transaction, Asset, Liability, Investment)                                      | ✅ kept (+income_streams)                         | —                                                                                                                                                                                                                                    |
| Projects (Project, Milestone, Document)                                                           | ✅ kept                                           | —                                                                                                                                                                                                                                    |
| Learning (Course, Subject, Topic, Test, Work, **Grade**)                                          | ⚠ partial                                         | **VERIFY** Grades/GPA, Subject-as-entity, Cycles when documenting Learning                                                                                                                                                           |
| Projects: Action, **Investigation**                                                               | Action≈deliverable (added); Investigation absent  | **KEEP** — Investigation (research entity under projects) → Projects expansion                                                                                                                                                       |
| Finance: **Commitment** (OR-007 auto-txn generation, NR-006 due)                                  | ❌ absent                                         | **KEEP** — recurring financial commitments → Finance expansion (ties to budgeting)                                                                                                                                                   |
| Life Mgmt: **Duty** (MasterDuty), Obligation                                                      | Obligation folded into Tasks(`kind`); Duty absent | **KEEP → DISSOLVED 2026-07-14** — defining intake ruled Duty+Obligation = **task TYPES + presets**, not a module (Languages→Spaces precedent). Lands in Tasks (type system) + Spaces (preset primitive). See `duties.md` RESOLUTION. |
| **HEALTH domain**: ExercisePlan, TrainingExercise, WorkoutSession, NutritionPlan, Recipe, MealLog | ❌ ENTIRE domain absent                           | **KEEP** — new feature context (exercise + nutrition)                                                                                                                                                                                |
| Enterprise: subscription tiers, sharing, admin, AI-purpose-gen                                    | ✅ intentionally dropped                          | **CUT** (correct) — conflicts with single-user + zero-knowledge; AI now covered by the extension-model principle                                                                                                                     |

## Decisions (Victor, 2026-06-30) — all four KEEP

1. **Health** (exercise + nutrition) — NEW feature context. No v2 schema exists → full intake + ADR-002
   additions required. Routines' `exercise` step-type forward-references it. Entities (v1): ExercisePlan,
   TrainingExercise, WorkoutSession, NutritionPlan, Recipe, MealLog. Rules (v1): CR-005 Exercise Volume,
   CR-006 Macronutrient Totals, UC-HLT-002 Log Workout. `[FACT: doc §2.2 L438; §1.3 L230-241]`
2. **Finance Commitments** — ~~recurring financial commitments~~ **→ RESOLVED 2026-07-15 (expansion done).**
   Ruling (Victor): a **management SUB-CONTEXT/LAYER in Finance, NOT a new entity** — manages committed/recurring/
   long-term flows (subscriptions · lending/receivables tracked to a total · liability payoff · income · periodic
   investments + revenue · installment assets) by **composing the existing 6 entities**; bidirectional + derived
   progress-to-total; surfaces on the schedule via `dueIn`/Notifications. Threaded into Finance identity/FN-14/
   structure-data/contract + `intake/finance.md` EXPANSION. `[INTENT: Victor 2026-07-15; FACT: doc OR-007 L169, NR-006 L388]`
3. **Duties** — ~~needs a defining mini-intake~~ **→ DISSOLVED 2026-07-14 (defining intake complete).** Ruling
   (Victor): Duty and Obligation are **not a module** — they are **task TYPES surfaced as PRESETS** (thin tabs over
   the Tasks entity with distinct patterns/contexts/deliverables + own UI/UX; user-extensible, Duty+Obligation = the
   2 shipped presets). Mirrors **Languages→Spaces**. Intent landed in `intake/tasks.md` (ADDENDUM — task-type
   generalization of G8) + `intake/spaces.md` (preset primitive, requirements accumulator). Off the module fill
   order. `[INTENT: Victor 2026-07-14; source: intake/duties.md RESOLUTION]`
4. **Projects Investigations** — ~~a research/investigation entity under Projects~~ **→ RESOLVED BY COMPOSITION
   2026-07-15, no entity.** Victor challenged the need vs a milestone/existing entities; resolved: a research/
   investigation = a **`deliverable` (`measurement_type='artifact'`)** backed by a **Knowledge Lab investigation**
   (`entity_links`) — explore (Knowledge) vs execute (Projects deliverable). Zero new schema. Threaded into Projects
   identity + structure-data + `intake/projects.md` EXPANSION. `[INTENT: Victor 2026-07-15; FACT: doc §2.2 L434]`
5. **Learning** — ~~VERIFY Grades/GPA, Cycles, Subject-as-entity~~ **→ VERIFIED 2026-07-15, all covered by
   Education (07-03 reframe), no gap.** Subject-as-entity = a first-class level in the 8-level hierarchy
   (…Term → **Subject** → Module; `courses`→`subjects`). Grades/GPA (CR-002/OR-003) = ED-7 grading-system builder +
   **derived** subject-grade & term/curriculum **GPA rollup** (richer than v1's fixed formula). Cycles: academic =
   Education `terms` (year⊃semester⊃term); v1 OR-008 "cycle _session_ generation" is **Sessions & Scheduling**
   (scheduler), not Education. `[FACT: education/identity.md L22, business-rules.md ED-7; doc OR-003 L142/CR-002 L211/OR-008 L175]`
6. **Skills — SEPARATE it from Learning (Victor, 2026-07-01).** The v2 `skills` + `skill_resources` (2 tables,
   inside §5.10 Learning) are a **deliberately downgraded, simplified** version of a **larger, more robust**
   Skills module Victor envisioned but couldn't fully implement. Decision: extract Skills as its **own feature
   context** (removed from the Learning "Knowledge" sub-context). Its own intake will capture the fuller vision
   (current 2 tables are the floor, not the ceiling). `[INTENT: Victor 2026-07-01; FACT: ADR-002 §5.10 L2475-2523]`

## Learning decomposition (2026-07-01) — Learning is ~17 tables → 5 sub-contexts (Skills split out separately)

| Sub-context                        | Tables                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Learning: Courses & Classes        | courses (+classes/homework/exams) · ics_feed_configs · ics_synced_events (§5.18)                                                          |
| Learning: Books                    | books · book_chapters                                                                                                                     |
| Learning: Knowledge                | study_topics · topic_reviews · knowledge_notes (⚠ skills/skill_resources REMOVED → Skills module)                                         |
| Learning: Study Sessions & Planner | study_sessions · study_availability · availability_exceptions · study_plan_batches · scheduled_study_sessions · session_templates (§5.11) |
| Learning: Flashcards               | flashcard_decks · flashcards · flashcard_reviews                                                                                          |
| **Skills** (SEPARATE module)       | skills · skill_resources (downgraded — envisioned larger)                                                                                 |
| Language                           | §5.12 — already separate (Wave 3)                                                                                                         |

## Manifest impact (applied 2026-06-30)

- **New feature contexts added to the fill order:** Health, Duties (both ⬜, "recovered from v1 audit"). _(Duties later
  DISSOLVED 2026-07-14 — see decision 3 above; Health documented + gate PASS.)_
- **Expansions flagged on documented contexts:** Finance → Commitments; Projects → Investigations.
- **Learning verify-list** attached to its (future) intake.
- These join the build-phase backlog; the CUT items are recorded here so they are _decided, not forgotten_.

## Change Log

| Date       | Session                 | Change                                                                                                                                                           |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-30 | documentation-blueprint | v1 COMPLETE_SYSTEM_ARCHITECTURE audited vs v2; 4 dropped items surfaced; Victor ruled KEEP on all 4; manifest reconciled.                                        |
| 2026-07-14 | documentation-blueprint | **Duties defining intake → DISSOLVED** into Tasks (task-type system) + Spaces (preset primitive); not a module (Languages→Spaces precedent). Fill order updated. |
