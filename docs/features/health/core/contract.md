<!-- Contract — features/health/core · Phase 2 · sources: docs/intake/health.md §C Integration Contract + Core
     resolved. ⚠ DESIGNED interface — no @vida/core code yet (recovered domain). -->

# Contract — Health: Core

The Core's exposed services + the provider seams that make Health an OS citizen. **Designed interface — not yet
coded.** Services live in `@vida/core` (`services/health/`, designed).

## Exposed services (Core-owned)
- **Metric service** — `defineMetric(kind, unit, direction, category)` · `logValue(metric_id, value, source,
  {photo?, context?})` · `setTarget(metric_id, value, date)` · `getSeries(metric_id, range)` ·
  `deriveValue(metric_id)` (e.g. 1RM from Training logs) · `runTestProtocol(protocol_id)→value` · **advertises the M5
  queryable-measure read seam** (`measure(name, range)` — `body_weight`/`1rm`… via **R7**) that Purposes (PG6) +
  `derived-pull` goals read through. `[INTENT; ADR-011 M5 §3.6 + R7]`
- **Monitoring service** — `defineDomain(name)` · `defineFactor(domain_id, name)` · `linkMetric(factor_id, metric_id)`
  · `getDomainSnapshot(domain_id)` (factors + latest values + trend). `[INTENT CI-1/HC-19]`
- **Exam service** — `defineExam({name, kind, schedule, produces_metrics[]})` · `scheduleExam()` (→ Scheduler +
  Notifications) · `logExamResults(assigned_exam_id, {metric_id: value})` (→ metric values, `source=exam`). `[INTENT CI-1/HC-20]`
- **Goal service** — `createGoal({measurement_kind, binding_mode, target, horizon})` (M1/M2 — the bespoke `type` is
  decomposed) · `deriveProgress(goal_id)` (nullable-override `progress()`, resolved via `binding_mode` + the M5 source
  seam) · `driveProgram(goal_id)` (manual builder hook; LLM/import = extension). `[INTENT; ADR-011 M1/M2/M3/M5]`
- **Experiment service** — `defineExperiment(hypothesis, armA, armB, metrics[], duration)` · `advancePhase()` ·
  `recordObservation()` · `resolve()→{winner, learning}` · `updateProfile()`. `[INTENT Fork 3]`
- **Physical Role service** — `defineRole({name, type, objectives, can_do})` · `bindRole({knowledge_subject_id,
  skill_id, session_sub_types[]})` · `generateExercises(role_id)` (medically-aware — filters via Medical Profile;
  manual Core, LLM/curated-import = extension) · `deriveMastery(role_id)`. `[INTENT Fork 4 merged / CI-4]`
- **Medical service** — `upsertMedicalEntry({kind, label, severity, affected_refs, source})` · `importDoctorInput()`
  (opt-in extension — **device-mediated ingestion, ADR-014 X1**; imported content is **untrusted** → carries provenance
  into any LLM prompt per **ADR-015 AI5**) · `getConstraints(pillar)` (contraindications/allergies for filtering) · `raiseSafetyFlag(trigger)`
  · `dismissFlag(id)` · `prescriptionToExperiment(entry_id)`. **Advisory only — never blocks.** `[INTENT HC-14..HC-18]`

## PROVIDES → (registers with)
- **Journal** — daily contribution: workouts done · meals/macros · calories burned & consumed · metrics logged. `[INTENT]`
- **Scheduler / `dueIn()`** — scheduled workouts · meals · test protocols · **medical exams** → Global Calendar /
  agenda. `[FACT: ADR-004 dueIn; INTENT HC-20]`
- **Duties / Obligations** [#3 stub] — assigned workouts/meals/exams surface as Duties/Obligations (recurring-
  commitment fabric); Health is Duties' first concrete consumer. Reward/penalty → Gamification. `[INTENT CI-5]`
- **Purposes** — body-metric series + goal progress as auto-sourced purpose metrics (PG6) — read via Health's **M5
  measure seam (R7)**, not a direct table read. `[INTENT #9; ADR-011 M5]`
- **Gamification** — workout streaks · PRs · goal-progress → XP/achievement signals. `[INTENT #10]`
- **Notifications** — workout/meal reminders · test-due · deload alerts · **safety flags** (medical-attention). `[INTENT #11/HC-15]`
- **Finance** — nutrition/shopping cost events. `[INTENT]`
- **Training & Nutrition (internal)** — the **Medical Profile constraints** (contraindications/allergies) + safety
  flags, consumed by both pillars to filter/inform plans (advisory). `[INTENT HC-16]`

## CONSUMES ← (composes)
- **Sessions & Scheduling (ADR-004)** — `workout` session sub-type + runtime (rest timer/pause/energy/satisfaction)
  + the scheduler. Health does not build a session spine. `[FACT: sessions reserve workout/workout_sessions]`
- **Knowledge** — Exercise/Ingredient/Dish/Protocol content (kinds) + mastery; **Physical Role** technique subjects
  (+ opt-in cooking-skill). `[FACT: knowledge kinds]`
- **Notes & Pages** — entity descriptions/notes as `pages` (no inline notes). **Spaces** — universal tags (**`entity_tags`**,
  SP1 — Health is a *consumer*; its entity_types register in the open taggable-type registry, SP2) · saved views ·
  **capability Blocks** (workout-logger · photo-capture) [#8 stub]. `[INTENT; ADR-006 SP1/SP2]`
- **Preferences** — units (kg/lb) · module toggle · dietary defaults. **Check-ins** — subjective energy/mood/sleep
  (cross-ref; Health owns objective). `[INTENT]`
- **Routines** [#4 stub] — the `exercise` step drives a Core-scheduled workout session. `[FACT: intake/routines.md]`
- **AI-ADR / external-data-ADR** — LLM plan/meal/Role generation · food-DB/barcode · photo analysis · **curated Role
  library import** (locale-varying) · prescription import (all opt-in). AI rides **ADR-015** (on_device/cloud AI1,
  cloud = egress + scope-min AI3, untrusted-content provenance AI5, `source=ai` AI6); ingestion rides **ADR-014**
  (device-mediated X1, three layers X2, `external_in_ok` X5, reconcile/add-only X8). `[INTENT — ADR-014 X1/X2/X5/X8; ADR-015 AI1/AI3/AI5/AI6]`
- **External integrations (INTENT / forward-dep stub, CI-6)** — INPUT ← Google Health · wearables · open health
  sources (→ metric values, device-mediated X1 under `external_in_ok` X5); **OUTPUT → medical systems & services (data
  EGRESS — the ADR-014 X4 egress guard: `external_out_ok` + union-of-consents + audit + never-auto-transmit)**.
  Bidirectional two-way flow; not wired until per-service research post-core. `[INTENT CI-6/R4; ADR-014 X1/X4/X5]`

## Terminal states (per capability)
- **Metric series:** loading · **empty** (no readings → prompt first measure) · **error** (unit/direction mismatch)
  · success (series + trend + %-to-target).
- **Monitoring:** Domain/Factor **empty** (no metrics linked) · populated (latest values + trend). **Exam:**
  scheduled · due · **overdue** · logged (results in) · skipped.
- **Goal:** **empty** (no target) · unmeasurable (→ review-rated) · on/behind/ahead · **achieved**.
- **Physical Role:** **empty** (no exercises yet) · in-progress (deriving mastery) · **mastered**; generation may
  **fail** → manual fallback.
- **Experiment:** planning · running (phase A/B) · **inconclusive** · resolved (winner+learning).
- **Program drive:** manual (builder) · AI-generating (extension, may **fail**→manual fallback) · imported.
- **Medical Profile:** empty (no constraints) · populated. **Safety flag:** none · raised/active · **dismissed** ·
  acknowledged (advisory — the user always proceeds).

## Completion checklist
- [x] provides/consumes enumerated · [x] terminal states · [x] designed-not-coded flagged · [x] no `{{…}}`
