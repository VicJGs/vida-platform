# Intake — duties  (level: feature · Wave R, DEFINING intake)

> Status: **DEFINING** — Duties has NO v2 schema (dropped in the 91→60 table consolidation). This intake must
> first establish **what a Duty IS** (vs Task / Obligation / Habit / Routine / Session) and its **placement**
> before capturing aspect-level rules. Source stack (`_APPROACH.md`): code(v2, FACT) → v1 → Notion (dated intent)
> → ⭐ Victor's CURRENT intent (authoritative, co-created). `[Victor 2026-07-14]`

## Current (enforced reality — authoritative source)

**v2 has ZERO Duties surface.** `grep -rin "dut" packages/types/src packages/core/src` → nothing.
`[FACT: no `duties`/`master_dut*` table in ADR-002; no type in @vida/types]`

What v2 DID keep — the adjacent concepts a Duty must be distinguished from:
- **Tasks** — folded the v1 *Obligation* into a `kind` discriminator: `kind ∈ {standard, obligation}`; an
  obligation = a **recurring deadline** (taxes, license renewal) that **regenerates the next occurrence on
  completion**. `[FACT: docs/intake/tasks.md G8 — INTENDED schema addition, not yet built]`
  → **So "Obligation" already has a (thin, unbuilt) home in v2: a Task kind.** This intake must decide whether
  that is where Obligation stays, or whether Obligation is promoted into the Duties family.
- **Habits** — build/break *behaviors*, streak-tracked (consecutive scheduled occurrences, no grace), identity-
  level, feed Gamification. `[FACT: docs/features/habits/*]`
- **Routines** — cross-module **orchestration** layer: named sequences of polymorphic INTERACTIVE steps
  (habit · recurrent task · **obligation** · study_session · project-focus · exercise …), per-step completion
  modes driving the underlying entities. `[FACT: docs/intake/routines.md L49,L55]` Routines is sequenced AFTER
  Duties precisely because its step-types reference Duties.
- **Sessions & Scheduling** (foundation) — polymorphic **Session** supertype (a time-boxed *doing*) + the
  **Scheduling engine**: `availability` + `planned_blocks` that POINT at module-owned due-work via the
  **`dueIn()` provider primitive** (aggregator, not duplicator; zero staleness). `[FACT: docs/features/sessions-and-scheduling/*]`
- **Purposes & Goals** (capstone, meaning-spine) — the *directional* integration plane; everything can ladder to
  Purpose via `entity_links`. `[FACT: docs/intake/purposes-and-goals.md PG1]`

**Constitution touchpoints** `[FACT: docs/core/business-rules.md]`: ZK-1 (client-side only), SU-1 (single-user,
**no sharing / no team**), INT-1 (all modules connect via `pages` + `entity_links`), extension-model principle.

## Existing docs incorporated (D5b)
No `.md` documents a Duties context yet (module never existed in v2). Incorporation is a **no-op**. The only
prior record is `_scope-reconciliation-v1.md` (Wave R, 2026-06-30): *"Duty as a distinct concept → needs a
defining mini-intake"* — this doc is that intake.

## Legacy (v1 — context only, never a decision)
v1 (`life-os/COMPLETE_SYSTEM_ARCHITECTURE.md`) placed **MasterDuty** and **MasterObligation** in the
**Life Management** domain alongside MasterRoutine/MasterHabit, all four under the **Master-Instance pattern**:
- **SR-006 Master-Instance** — Routines, Habits, Duties, Obligations follow **template → instance**; separate
  master and session/completion tables. `[FACT: v1 §1.1 SR-006 L118]`
- **OR-008 Cycle Session Generation** — generate routine/**duty**/obligation sessions by cycle (daily→next 7d,
  weekly→next 4w, monthly→next 3m). `[FACT: v1 §1.2 OR-008 L176]`
v1 never specced a Duty schema beyond the name — the design DNA lives in the Notion versions below.

## Notion harvest (System 1.0/2.0 — dated INTENT, rich context, NOT the ceiling)
Two hardened, parallel "Master Element" families. Harvested from ~15 Notion pages (2 parallel agents, 2026-07-14).

### The shared "Master Element" engine (Duties · Obligations · Routines · Habits all share it)
A reusable **3-tier** pattern: **Master** (durable template + Frequency + triggers) → **Instance / "gear"**
(dated cyclical occurrence, cyclically created & completed by Frequency) → **Tasks** (typed granular steps:
Review · Verification · Feedback · Action [+Compliance for obligations]; Pack Type Initial→Intermediary→
Advanced→Mastery). Completion rolls back up. **This is the same template→instance→work engine v2 already
distributes across Habits, Routines, Sessions & Scheduling, and Tasks-recurrence.**

### Duty (the baseline responsibility template)
- **Concept:** a Purpose-anchored, ongoing **responsibility** — the mechanism that turns an abstract life
  Purpose ("Maintain optimal health") into concrete, consistently-scheduled recurring actions. *Master Duty* =
  durable template tied to a Purpose (**no leveling — reliability/consistency is the point**); *Duty* = a dated
  instance; *Master Duty Task* = tactical steps in progression packs.
- **Instance signals (richer than done/not-done):** Status `Not Started→In Progress→Completed→Missed`,
  **Quality Rating** (Poor→Excellent), **Difficulty Experienced** (Easy→Very Difficult), Completion Date;
  formulas: Days-Until-Due, Overdue Alert, Completion Rate, Quality Trend. → quality/difficulty are first-class,
  feeding derived analytics.
- **Accountability model:** **internal** (answerable to yourself); **gradient** progress (toward mastery);
  **flexible** scheduling (can reschedule/optimize).
- **Relations:** *defining link = Purpose* ("each purpose generates its supporting master duties"); indirect to
  Habits/Projects; "implementation-support" links to Health (exercise/nutrition/development), People, Finance
  (asset/liability/storage tasks); Duty→Journal (reflection); "Duty-Habit Alignment Engine" to **prevent
  double-tracking** the same activity.

### Obligation (Duty + a non-negotiable / external-consequence hardening overlay)
- **Concept:** a non-negotiable must-do with **external** consequences — the "load-bearing walls / unmovable
  objects around which the flexible system organizes." Same 3-tier engine + 4 added fields.
- **The 4 discriminating fields Obligation adds:** *Consequence of Non-Fulfillment* · *Legal Requirement (flag)*
  · *External Deadline* · *Accountability Partner*. Plus binary **Compliance** (compliant/non-compliant, vs
  Duty's gradient), escalation triggers, risk exposure.
- **Live System 2.0 collapsed 3 tiers → 2 DBs:** `Obligations` (master; Frequency, cycle-window date formulas,
  Activate button, `Actions created` idempotency guard, **`From Routine?`** flag, `Related Targets`) +
  `Obligations Actions` (instance/action; Status +Missed, Due/Finish Date, `Missed?` formula, `Task Hub Tasks`
  link, `Related Routine Action`). → the newer design already **reuses the central Task Hub** for the work layer
  and **cross-links Routines**.

### ⭐ Duty vs Obligation — the distinction (4 correlated axes)
| Axis | **Obligation** | **Duty** |
|---|---|---|
| Flexibility | non-negotiable, unmovable | flexible, reschedulable/optimizable |
| Accountability source | **external** (law, family, clients) | **internal** (self) |
| Consequence | external (legal/financial/relationship) | internal (personal-development) |
| Deadline | externally imposed | self-scheduled |
| Compliance model | **binary** (compliant / not) | **gradient** (mastery-oriented) |
| Scheduling priority | wins every conflict | scheduled *around* obligations |

---

## GAP MAP — DEFINING decisions (co-create; assistant proposes, Victor refines)

> Framed as proposals anchored to the OS core (foundation-first · "keep the seam, retire the instance" · derived
> metrics · provider/dueIn seam · meaning-spine · autonomy-with-clarity). D1/D2/D9 are the pivotal defining
> decisions — everything else depends on them.

- [ ] **D1 — What IS a Duty (the concept)?** *Proposal:* a **Purpose-anchored recurring RESPONSIBILITY** — the
      operational bridge that turns a life Purpose into consistently-scheduled, quality-tracked recurring
      commitments. It is the *responsibility* semantic (the "what I hold myself accountable to keep doing because
      it serves my purpose"), distinct from: **Task** (atomic unit of work) · **Habit** (identity behavior, streak)
      · **Routine** (ordered time-of-day sequence) · **Session** (a time-boxed doing). A Duty *generates/points at*
      tasks & sessions; it is not itself the work. Agree / refine?
- [ ] **D2 — Does this module own OBLIGATIONS too?** *Proposal:* **Yes — one module, two intensities.** Obligation
      = a Duty with the non-negotiable/external-consequence overlay (Consequence · Legal-flag · External-deadline ·
      binary Compliance; **Accountability Partner → a `Contact` reference under SU-1, NOT an external notify
      target**). This **promotes Obligation out of the thin `tasks.kind='obligation'` classifier** into the
      responsibility family where its richer semantics belong (retire/repoint that Task kind). Alternative: keep
      Obligation in Tasks and Duties = flexible-only. Which? (Name then = "Duties" vs "Duties & Obligations" vs
      "Responsibilities" — see D9.)
- [ ] **D3 — Reuse the generic engines, don't rebuild the Notion automation (foundation-first).** *Proposal:* the
      module owns only the **responsibility definition + purpose-linkage + quality/difficulty/compliance capture**;
      it DELEGATES: cycle/instance generation → **Scheduler** (`dueIn` + `planned_blocks`) + a recurrence rule;
      the tasks/actions layer → the **Tasks Universe** (duty-generated tasks, like Education homework = an
      education-task); "performed" occurrences → **Session** sub-types; Duty↔Purpose → **entity_links** + the
      meaning-spine rollup. i.e. NOT a per-module master→instance→tasks automation copy. Confirm the reuse boundary.
- [ ] **D4 — Master→instance modeling.** *Proposal:* keep the template→occurrence split, matching Habits
      (`habits`+`habit_completions`) & Routines: a `duties` master table + occurrences via the generic
      occurrence/completion mechanism (or a `duty_occurrences` table) carrying Status/Quality/Difficulty. Confirm.
- [ ] **D5 — Purpose anchoring & the meaning-spine (forward-dep to capstone #9).** *Proposal:* every Duty *should*
      (autonomy — not hard-required) trace to a Purpose; Duties are the layer through which **Purpose progress
      ladders up from daily action**. Direction: Purposes *generate* supporting duties AND duties *contribute*
      progress upward. Confirm linkage + whether purpose-link is optional or required.
- [ ] **D6 — Quality / difficulty / mastery capture.** *Proposal:* keep Quality Rating + Difficulty as
      instance-level signals feeding **derived** analytics + Gamification; "mastery" is **derived**, never
      hand-set (matches Knowledge's derived-mastery). Confirm (or is mastery not wanted for Duties?).
- [ ] **D7 — Obligation compliance & the "unmovable" rule.** *Proposal:* Obligation adds **binary compliance** +
      consequence text + a **Missed** terminal state + **escalating notifications** (via Notifications) + a
      **scheduling-priority business rule**: *obligations are unmovable; duties (and other flexible work) schedule
      around them* (the Scheduler honors this). Confirm this as a first-class rule.
- [ ] **D8 — Providers & consumers (aggregator, not duplicator).** Health confirmed Duties as its **first concrete
      consumer** — assigned workouts/meals/exams "surface as Duties/Obligations." *Proposal:* domain modules
      register their due-work; a Duty can either **reference** that work (dueIn seam — no duplication) or **be
      the responsibility that spawns it**. Which direction for domain-originated duties (e.g. Health's assigned
      workout): module creates a Duty, or Duty references module work? Duties is itself a **provider** to Journal
      agenda / Global Calendar / Routines steps.
- [ ] **D9 — Placement, name, fill-order.** *Proposal:* **own feature module**, name **"Duties"** (covering
      Obligations as the hardened variant), sequenced **#3** (before Routines, which orchestrates it). Confirm
      module-vs-sub-feature, the name, and the slot.

## Coherence + Realism validation (mandatory before Transform — `_APPROACH.md`)
Pre-flagged tensions to resolve during co-creation:
- **SU-1 (no sharing):** "Accountability Partner" and "accountability-partner notifications" from Notion CANNOT
  mean external people getting pinged. Reframe → a `Contact` reference (who the obligation concerns) + the OS's
  own internal reminders/escalation. **Loud flag, not waved through.**
- **Duplication risk:** the Notion design rebuilds scheduling/task-generation the OS already generalized
  (Scheduler, Tasks-recurrence, Routines). D3 exists to prevent re-importing that as a duplicate engine.
- **`tasks.kind='obligation'` collision:** D2 must explicitly rule the fate of the existing Task-kind so two
  homes for "obligation" don't co-exist (one canonical source of truth — constitution rule 3).
- **Forward-deps:** Purposes (#9, meaning-spine rollup), Routines (#4, consumes duty steps), Gamification/
  Notifications (#10/#11). Stub, don't spec against undocumented modules (No-Guessing).

---

## RESOLUTION — DISSOLVED into Tasks + Spaces 2026-07-14 (NOT a module) `[INTENT: Victor 2026-07-14]`

The defining intake did its job: the answer to *"is a Duty its own module?"* is **NO.** Victor's ruling —
> *"this should be only a thin tab in Tasks… a **preset** of a group of tasks, with two different UI/UX… the OS is
> truly complex and fully personalizable… both are **different types of tasks**, with different patterns, contexts,
> and deliverables, and they are unique on their own."*

**Duty and Obligation are TASK TYPES, surfaced as PRESETS** — same underlying Task entity, distinct
**patterns · contexts · deliverables**, each with its **own thin tab + UI/UX** presenting a curated preset (saved
group/view) of tasks. This is the **Languages→Spaces move again** ([[intake/languages.md]]): a candidate module
collapses into a *configuration of generic seams*. Here the seams are **Tasks** (entity + type discriminator) and
**Spaces** (the preset = saved-view/tab + per-type UI/UX + default template).

### Decisions locked (co-created)
- **D1 — Concept ✅** — a Duty = a **recurring responsibility** (an accountability layer that generates/points at
  work, not the work itself). Preserved as the *semantics* of the `duty` task type.
- **D2 — Obligation stays in Tasks ✅** — remains the `tasks.kind='obligation'` lineage (Tasks G8), now a **type**.
- **D3 — Compose existing seams ✅** — NO per-module Master→Instance engine; cycle-gen → Scheduler (`dueIn`/
  `planned_blocks`), work → Tasks Universe, occurrences → Session sub-types, Purpose → `entity_links`.
- **D9 → REFRAMED** — **not a module.** No `docs/features/duties/`. No "Responsibilities" module.
- **Extensibility ✅** — the task-type/preset system is **user-extensible** ("fully personalizable"); **Duty +
  Obligation ship as the two built-in presets**; users can define more task types + their own preset tabs/UI.

### Where the intent lands (this intake is the SOURCE)
1. **Tasks expansion** (`intake/tasks.md`) — generalize G8's `kind ∈ {standard, obligation}` into a
   **user-extensible task *type*** (`standard | obligation | duty | …`); each type carries its own
   **patterns · contexts · deliverables**. Duty type = the recurring-responsibility semantics (D1); Obligation type
   = the non-negotiable/external-consequence semantics (the 4-axis distinction table above is preserved as the
   Duty-vs-Obligation *type* differentiation). Reuses G1 (view-builder) + G6 (`scheduled_date`) + Scheduler `dueIn`.
2. **Spaces worked-example** (`intake/spaces.md`, Requirements accumulator) — the **"preset"** primitive: a
   task-type preset = a **thin tab** = { saved View (SP3) + per-type UI/UX + default fields/deliverables + optional
   starter Template (SP5) } over a task type. Duties & Obligations = the first shipped task-type presets — a second
   validating worked-example for Spaces alongside Languages.

### Coherence notes carried forward
- **SU-1** already handled: no external "accountability partner" notifications; a Contact *reference* only.
- **One source of truth (constitution rule 3):** obligation semantics live in exactly ONE place — a Tasks *type* —
  never a parallel module; this reframe *removes* the earlier module-vs-Task-kind collision, it doesn't create one.
- **Forward-deps** (Purpose rollup / Routines steps / Gamification / Notifications) resolve when those modules and
  Spaces are documented — no guessing against them now.

## Status
- [x] intake **WHOLE** — resolved by dissolution (Victor 2026-07-14); this doc is the preserved SOURCE.
- [x] **DISSOLVED** → Tasks (task-type system) + Spaces (preset primitive). Not a standalone module; off the fill order.
- [x] context was NOT `ambiguous` in Phase 0 (new defining context, no prose-role question)
