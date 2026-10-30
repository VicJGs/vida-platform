<!-- Identity — features/health/training · Phase 2 · sources: health/core/* + Sessions ADR-004. Health has NO v2 schema (recovered domain). -->

# Identity — Health: Training (level: Feature / Health pillar 1 of 2)

**What it is.** The **Physical Training pillar** — the _exercise_ lever on the body. It carries an exercise
**Catalog**, periodized **Plans**, workout **Templates**, and executed **workouts** (as Sessions), logging every
set and feeding the Core's Metrics. Its shape is the five-layer spine your Notion revealed: **Catalog → Plan →
Template → Instance → Log**, riding one modality dimension (strength · hypertrophy · endurance · cardio · skill ·
mobility · recovery). `[INTENT: 9 Physical-Training DBs; "finer levers on one spine"]`

**The desire behind it.** The user wants _real_ training — proper periodization (progression models, deload,
energy-system focus), a rich movement library with form cues, and every session logged with the fidelity a serious
athlete expects (**per-lift, bilateral** planned-vs-actual sets/reps/weight, RPE, form quality, PRs) — all pulling
toward his **Health Goals** and **Physical Roles** (build biceps to a number; become a calisthenics athlete, a
muay-thai/jiu-jitsu fighter, a triathlete; do a muscle-up). A Role is **professional-grade and medically-aware** —
it knows _how to train_ that capability and respects his limitations. `[INTENT: Victor Vision + Notion + CI-4]`

**What it owns.** `[INTENT]`

- **Exercise Catalog** (`Physical Training Exercises`) — movement pattern (push/pull/hinge/squat/…) · primary/
  secondary muscles · equipment · difficulty · **risk level** · form cues · common errors · variations · video.
- **Exercise Plans** (`Physical Exercise Plans`) — periodization: **progression model** (linear/undulating/block/
  conjugate/…) · **deload** · **energy-system focus** · training focus · frequency/duration/rest · related Health Goals.
- **Workout Templates** (`Workout Sessions`) — reusable session defs: workout type · **set structure** (straight/
  superset/circuit/EMOM/drop/…) · `AI Generated`.
- **Workout instances + set logs** — the performed workout (a Sessions `workout` sub-type) + per-exercise, per-set
  **planned vs actual** logging (`Workout Assigned Sessions` + `Physical Assigned Exercises`).

**What it composes (borrows).** `[FACT: reshape §B]`

- **Sessions & Scheduling (ADR-004)** — a workout **IS** a `workout` session sub-type + runtime (rest timer/
  pause/energy/satisfaction); the scheduler + `dueIn()` place today's assigned workouts on the Calendar.
- **Knowledge** — exercise technique (kind=`exercise`) + **Testing/Recovery protocols** (kind=`protocol`).
- **Core** — performance values (per-lift/bilateral 1RM, volume) flow into **Health Metrics**; plans/workouts serve
  **Health Goals** + **Physical Roles** (a Role generates/links the exercises that build it, medically-aware);
  responses feed the **Adaptation engine**. **Preferences** — units (kg/lb). **Spaces** — the workout-logger Block.

**What it is NOT.**

- **Not a session engine.** It does not implement timing/scheduling — those are Sessions (ADR-004). `[FACT]`
- **Not the metric owner.** PRs/1RM/volume are **Core Health Metrics**, not Training-local tables. `[INTENT HC-1]`
- **Not the protocol library.** Testing/Recovery protocols live in **Knowledge**; Training references them. `[INTENT HC-12]`
- **Not modality-fragmented.** Strength/cardio/skill/mobility are a **property**, not separate machineries. `[INTENT]`

## Completion checklist

- [x] what/desire/owns/composes/NOT filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}`
