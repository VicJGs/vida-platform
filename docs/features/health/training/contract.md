<!-- Contract — features/health/training · Phase 2 · sources: intake/health.md §C + core/contract.md + ADR-004.
     ⚠ DESIGNED interface — no @vida/core code yet (recovered domain). -->

# Contract — Health: Training

Training's services + seams. **Designed — not yet coded** (`@vida/core/services/health/training/`).

## Exposed services (Training-owned)

- **Catalog** — `upsertExercise({name, movement_pattern, muscles, equipment, form_cues, video})` ·
  `getExercises(filter)`. Technique content links to Knowledge. `[INTENT]`
- **Plan** — `buildPlan({progression_model, deload, energy_system, goal_ids})` (manual) · `aiGeneratePlan(goal)`
  (opt-in extension) · `importPlan(library)` (extension). `[INTENT HT-9]`
- **Template** — `defineWorkoutTemplate({type, set_structure, exercises[]})`. `[INTENT]`
- **Workout runtime** — `startWorkout(assigned_id)` → delegates to **Sessions** `workout` runtime; `logSet(exercise,
planned, actual, {rpe, form})` · `finishWorkout()` → derives volume/PR → emits Core Metric values. `[FACT ADR-004; HT-4/HT-5]`

## PROVIDES →

- **Core** — performance Metric values (1RM/volume/PR, source=derived); goal-progress signal. `[INTENT HC-1]`
- **Journal** — workouts completed + calories burned (energy loop). **Gamification** — streaks/PRs. `[INTENT §C]`
- **Scheduler/`dueIn()`** — assigned workouts → Calendar/agenda. `[FACT dueIn]`

## CONSUMES ←

- **Sessions & Scheduling (ADR-004)** — `workout` sub-type + runtime (rest timer/pause/energy/satisfaction) +
  scheduler; Training supplies the `workout_sessions` extension + set logs. `[FACT]`
- **Knowledge** — exercise technique (kind=`exercise`) + Testing/Recovery protocols (kind=`protocol`). `[INTENT]`
- **Core** — Health Goals (plan targets) + Health Metrics (performance sink) + Adaptation (responses/experiments)
  - **Medical Profile** (injury/contraindication filter via Risk Level — advisory). `[INTENT HC-16]`
- **Preferences** — units (kg/lb). **Spaces** — workout-logger + photo capability Blocks (#8 stub). **Routines**
  (#4 stub) — the `exercise` step starts a Training workout. **AI/external ADRs** — plan-gen/import (opt-in). `[INTENT]`

## Terminal states (per capability)

- **Plan build:** manual (builder) · AI-generating (**fail→manual**) · imported.
- **Workout runtime:** scheduled · in-progress · **paused/resumed** · completed · **skipped** · modified.
- **Set log:** planned-only · logged (+PR flag) · **failed set**. **Catalog:** empty · populated.

## Completion checklist

- [x] provides/consumes · [x] terminal states · [x] designed-not-coded · [x] no `{{…}}`
