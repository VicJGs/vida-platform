# Intake — health  (level: domain module; Wave R — recovered; EXECUTION #1)

> Fill order: first module of the re-sequenced remaining set. Health is a **recovered domain** — planned in the v1
> architecture, **never built**, and **absent from v2** (no schema, no types). It is a **provider** to Routines
> (exercise step-type), Purposes (health-domain metrics), Gamification, and the Journal — so it's documented early,
> ahead of them. It **composes documented foundations** heavily (Sessions reserved a `workout` slot for it).
> `[FACT: _scope-reconciliation-v1.md L26-33; sessions structure-data.md L34]`

## Current (enforced reality) — NOTHING exists
- **No v2 tables, no `@vida/types`, no service.** Health is greenfield-from-plan. `[FACT: survey — 0 health tables
  in ADR-002; grep clean]`
- **Not in the polymorphic enums:** `entity_links`/`pages`/`pomodoro` `entity_type` CHECK lists contain no
  `workout_session`/`exercise`/`meal`/`nutrition` types → **ADR-002 additions required.** `[FACT: ADR-002
  L1343-1352]`
- **BUT the foundations pre-reserved its seam:** Sessions & Scheduling lists **`workout` as a session sub-type**
  and **`workout_sessions` as a per-module extension table "(Health/Wave-R)"**, and states the framework is what
  lets "new modules (Health, Skills) plug in without touching it." `[FACT: sessions business-rules.md L16;
  structure-data.md L34; conventions.md L15]` Sessions S5 flags **Health as a sensitive-effect module** (effects
  need explicit opt-in consent). `[FACT: sessions business-rules.md L31]`

## Legacy (life-os v1 — the PLAN, never built; context + intent seed)
Health was specced in `COMPLETE_SYSTEM_ARCHITECTURE.md` (7-domain plan) but not implemented. `[FACT: doc §2.2 L438]`

- **Entities (planned):** `ExercisePlan · TrainingExercise · WorkoutSession · NutritionPlan · Recipe · MealLog`.
  `[FACT: L438]`
- **Relationships:** `ExercisePlan → Workouts → Sets` and `NutritionPlan → Meals`. `[FACT: L799, L1239]`
- **Master-instance pattern (SR-006):** ExercisePlan = template, WorkoutSession = instance. `[FACT: SR-006]`
- **CR-005 Exercise Volume:** `volume = sets × reps × weight`; cardio `= duration × intensity`. `[FACT: L230-233]`
- **CR-006 Macronutrient Totals:** macros = sum of all meals; `calories = P×4 + C×4 + F×9`; `% = macro/total`.
  `[FACT: L235-239]`
- **UC-HLT-002 Log Workout (rich flow):** start from today's assigned plan → per-**set** log (reps · weight · form
  rating 1-5 · notes) → **rest timer** → **PR detection** ("🎉 Personal Record") → finish summary (energy 1-5 ·
  quality 1-5 · mood · notes) → system calculates volume, identifies PRs, marks assigned complete → **pause/resume**.
  `[FACT: L627-670]`
- **Daily cron:** "generate assigned exercises/meals" — plans project onto the day. `[FACT: L861]`
- Daily temporal pattern: meals + workouts logged daily. `[FACT: L787, L929]`

## ⭐ Victor's Vision (2026-07-13) — the TRUE scope (supersedes the thin v1 plan)
Health is **much bigger** than v1's exercise+nutrition CRUD. It is a **goal-driven training + nutrition engine**
that plans the user's health across **short / medium / long term**, as **two sub-modules + a progress spine**:

- **Sub-module A — Physical Training.** **Goal-driven from the top:** goals are *disciplines* (e.g. Muay-Thai,
  Calisthenics), *capacities* (e.g. body resistance/endurance), and **body-measure targets** (biceps · triceps ·
  quads · calves · … each to a specific target value). These goals **GENERATE** a tailored set of exercises,
  variations, plans, and schedule aimed at them.
- **Sub-module B — Nutrition.** **Goal-driven intake:** the plan computes what to eat (macros/calories) **from the
  training + body goals**, on a *healthy path*, and is **balanced against session calorie-burn** (closed loop:
  workout expenditure → intake target).
- **Cross-cutting — Body Metrics & Progress.** Measures + performance captured over time, **analyzed for progress**
  against the goals (the source Purposes auto-pulls, PG6).

**THE THREE AUTHORING MODES (a recurring OS pattern Health surfaces).** Every generative artifact — training
program, exercise set, nutrition plan — can be built **(1) by hand**, **(2) by an LLM** (opt-in AI builds it),
or **(3) by importing** an external library (exercise DB / doctor prescription) *with its patterns + context*.
Nutrition's three: **doctor prescription · your own way · LLM.** → This "manual / AI / import" triad = the same
pattern **Languages** needed; it's a generalizable concern on the **extension-model + AI ADR + Spaces**.

**Capture-driven & travel-flexible.** Log food by **photo → a capability analyzes it (AI vision) → stored** (macros
inferred); body measures captured + **analyzed for performance/progress.** All ZK-encrypted; all AI/import/photo =
opt-in extension-model.

**Interconnected & schedule-aware:** goals → program → scheduled sessions → burn → intake → measured progress →
re-plan. Flexible for irregular schedules / frequent travel.

> **Architectural placement (forward-deps this vision forces):**
> - **Health = flagship of the two deferred ZK ADRs** — *AI/LLM integration* (plan generation, food-photo analysis)
>   + *external-data ingestion* (exercise-library / prescription import). Largest concrete instance yet (≥ Fiscal
>   & Legal). Health's **core = manual mode**, documentable now; the AI/import/photo modes are **extension-model
>   augmentations** stubbed against those ADRs.
> - **Health goals ↔ Purposes (capstone) goal/metric primitive** — body-measure targets ARE Purpose-shaped targets
>   with numeric goals + reviews. Health owns the *fitness-specific programming* (goal→exercises); the shared
>   **target/metric primitive** resolves when Purposes is documented (#9). Health documents its goals natively +
>   stubs the up-ladder (same as Habits/Finance did pre-Purposes).
> - **Disciplines (Muay-Thai/Calisthenics) ↔ Knowledge/Skills** — learning a discipline's technique = Knowledge;
>   an exercise's form/cues = Knowledge objects or pages. Skills (#2) may compose here.

## ⭐⭐ Victor's Notion "System" — the ACTUAL built design (18 databases, AUTHORITATIVE)
Source: Notion page "System" (`2157ba8dd1d480dcb518e3a8315d6e06`), fetched 2026-07-13 via MCP. This SUPERSEDES
the v1 plan and my proposed shape — it is the real, detailed design Victor built. **Symmetric two-pillar
architecture**, each pillar with a 5-layer shape (Catalog → Plan → Template → Instance → Log) + a "science/
intelligence" layer. `[FACT: Notion System page, 18 data sources]`

### PILLAR A — PHYSICAL TRAINING (9 databases)
- **Physical Exercise Plans** — the PROGRAM/periodization layer. Props: Level · **Training Focus** (Strength/
  Hypertrophy/Endurance/Flexibility/Sport-specific/Balance/Cardio/Recovery) · **Energy System Focus** (Aerobic/
  Anaerobic Lactic/ATP-PC/Mixed/Lactate Threshold/Oxidative) · **Progression Model** (Linear/Undulating/Block/
  Step/Conjugate/Reverse Pyramid/Wave) · Deload Frequency · Frequency/Duration/Rest Days · Location · Equipment ·
  Metrics Tracked · **Related Health Goals** (Weight Mgmt/Strength/Mobility/Cardio/Flexibility/Endurance/…) ·
  Status · dates. → real periodization science.
- **Physical Training Exercises** — the exercise CATALOG/library. Props: Primary/Secondary Muscle Group ·
  **Movement Pattern** (Push/Pull/Hinge/Squat/Lunge/Carry/Rotation) · Equipment · Difficulty · **Risk Level** ·
  Detailed Instructions · **Form Cues** · **Common Errors** · **Variations** · Video Reference. → technique/knowledge-rich.
- **Workout Sessions** — session TEMPLATES. Props: Workout Type · **Set Structure** (Straight/Supersets/Circuits/
  Ladders/Clusters/EMOM/Drop/Pyramid) · Muscle Groups · Expected Duration · **`AI Generated` (checkbox)**.
- **Workout Assigned Sessions** — session INSTANCES (scheduled/performed). Props: Session Date/Time · Status
  (Scheduled/In Progress/Completed/Modified/Skipped/Rescheduled) · Progress State · **Completion %** ·
  **Pre-Session Energy (1-10)** · **Session Satisfaction (1-10)** · Performance Notes · Issues · Recovery Needs.
- **Physical Assigned Exercises** — per-exercise-in-session logging. Props: Base Exercise · Variation · **Exercise
  Category** (Warm-up/Main/Accessory/Cardio/Mobility/Cool-down) · Order · **Planned vs Actual** Sets/Reps/Weight.
- **Exercise Performance History** — per-exercise TIME-SERIES log. Props: Date · Sets/Reps/Weight · Distance ·
  Duration · **Form Quality** · **Perceived Exertion (RPE)** · **Personal Record (checkbox)** · **Sleep Quality** · Location.
- **Training Response Profiling** — INDIVIDUAL ADAPTATION intelligence. Props: Training Type · Response Magnitude ·
  Recovery Demand · **Optimal Volume/Intensity Range** · **Overtraining Indicators** · Primary Metrics · self-relations.
- **Performance Testing Laboratory** — CAPACITY TEST protocols. Props: **Capacity Category** (Strength/Power/
  Endurance/Speed/Mobility/Skill/Work Capacity/Recovery) · Sub-Category · Scoring Method · Measurement Units ·
  Testing Frequency. → a fitness-test battery to MEASURE capacities.
- **Recovery Science Laboratory** — RECOVERY protocols. Props: **Recovery Domain** (Physical/Mental/Nervous
  System/Sleep/Tissue/Metabolic/Hormonal/Immune/…) · Recovery Purpose · Stressor Type · Effectiveness · Success Rate.

### PILLAR B — NUTRITION (9 databases)
- **Nutritional Plan** — the nutrition PROGRAM. Props: **Caloric Strategy** (Deficit/Surplus/Maintenance/Cycling/
  Intuitive) · **Dietary Framework** (Omnivore/Vegetarian/Vegan/Keto/Mediterranean/Paleo/Zone/IF) · **Nutritional
  Philosophy** (IIFYM/Whole Foods/Intuitive/Performance/…) · Daily Calorie Target · **Supplement Protocol** ·
  **Adherence Target** (95%+…<50%) · **`AI Meal Generation` (checkbox)** · Progress Review Frequency.
- **Nutrition Dishes** — dish/recipe CATALOG. Props: **Macros/serving** (Cal/Protein/Carbs/Fat) · Main Ingredients ·
  Homemade Recipe · **Primary Source Type** (Homemade/Restaurant/Meal Prep/Convenience/Takeout/Ready-to-Eat) ·
  **Performance Benefits** · Allergens · Cuisine · Prep Time · User Rating.
- **Nutrition Ingredients** — food/ingredient DATABASE. Props: **Macros + Fiber + Micronutrients** · Category ·
  Serving Size · Allergens. → the food DB (manual/custom).
- **Daily Meal Plans** — daily plan. Props: Plan Date · Plan Type (Single Day/Weekly Template/Time-Frame/…) ·
  **Generation Method** (Manual/AI Random/Template-Based/Preference-Based/Goal-Optimized/Hybrid) · Calorie
  Target · Completion Rate · Satisfaction.
- **Meal Assignments** — individual meal INSTANCES. Props: Meal Type · **Meal Purpose** (Energy/Recovery/
  Performance/Health/Hydration/Satiety/Social/…) · Scheduled Time · **Planned Source** (Homemade/Restaurant/…) ·
  Status (Planned…Substituted) · **Cost ($)** · Satisfaction · Tags.
- **Shopping Cart** — PROCUREMENT/grocery layer. Props: Item Category/Type · **Source** (Grocery/Restaurant/Online
  Delivery/Farmers Market/…) · Estimated Cost · Purchase Status · **Storage Requirements** · Unit · Priority.
- **Nutrition Goals** — nutrition GOAL PHASES. Props: **Goal Phase Type** (Fat Loss/Muscle Gain/Maintenance/
  Performance/Recomposition/Event Prep) · Daily Calorie Target · **Goal Progress** (Ahead/On/Behind Target) ·
  Start/End · Secondary Goals.
- **Nutrition Experiments** — SELF-EXPERIMENTATION (A/B). Props: Experiment Type (Meal Timing/Food Choice/Portion/
  Frequency/Combination/…) · **Option A (Control) vs B (Test)** · **Phase** (A/B) · Success Metrics · **Winner** · Key Learning.
- **Nutrition Response Tracking** — INDIVIDUAL FOOD-RESPONSE intelligence. Props: What You Ate · **Energy Response** ·
  **Digestion Response** · **Life Context** (Normal/Training/Rest/Travel/Stressed/Social/Sick Day) · **Pattern Type**
  (This food works/doesn't/good timing/…) · Overall Feeling.

### Structural patterns to carry into the OS model
- **Symmetric 5-layer shape per pillar:** Catalog (Exercises / Ingredients+Dishes) → Plan (Exercise Plan /
  Nutritional Plan) → Template (Workout Session / Daily Meal Plan) → Instance (Assigned Session+Exercises / Meal
  Assignment) → Log (Performance History / — ). = the template→instance pattern → **Sessions framework (ADR-004)**
  for the instance/log layers; catalogs = **Health-owned libraries (Knowledge-adjacent)**.
- **"Science/Intelligence" layer (BOTH pillars) — a shared, distinctive pattern:** Training Response Profiling +
  Performance Testing Lab + Recovery Science Lab // Nutrition Experiments + Response Tracking. The module **learns
  how the user's body responds**, runs **experiments**, and **refines** — adaptive individualization. This is a
  cross-pillar CORE concern (candidate: a generic "response/experiment/adaptation" engine).
- **Modality = a DIMENSION (property), not a table:** Training Focus / Workout Type / Movement Pattern / Energy
  System / Exercise Category. → confirms "Core spine + finer levers as a modality registry," not N machineries.
- **Authoring modes baked in:** `AI Generated`, `AI Meal Generation`, `Generation Method` (Manual/AI/Template/
  Goal-Optimized/Hybrid) → confirms the **manual/AI/import triad** as first-class (extension-model + AI ADR).
- **The energy/calorie bridge is real:** Training "Metrics Tracked" incl. Calories ↔ Nutrition calorie targets/
  strategy. **Life Context** (Training/Rest/Travel Day) makes nutrition schedule- & travel-aware.
- **Procurement** (Shopping Cart) + **Cost** ($ on meals/shopping) → a nutrition→**Finance** touch-point (budget).

### What the Notion does NOT cover (design-fresh gaps vs the vision)
- **Body-Metrics / Measurements spine** — NO dedicated body-measurement time-series DB (weight · body-fat ·
  **biceps/triceps/quads/calves circumference**). Progress is inferred from Exercise Performance + Nutrition Goals.
  The vision explicitly wants body-measure TARGETS + progress → **must be designed fresh** (the Core spine's
  Body-Metrics; the PG6 provider to Purposes).
- **Unified cross-pillar Goal system** — Nutrition Goals exists, but training goals are embedded as properties
  (Related Health Goals). A unified **Health Goals** with body-measure/discipline/capacity targets isn't a
  standalone entity → design the shared **Core Goal** layer (ties to Purposes primitive).
- **Disciplines (Muay-Thai/Calisthenics) as first-class** — modeled only as Sport-specific/Workout-Type property
  values, not a discipline entity that owns a curriculum/skill progression → design question (ties Knowledge/Skills).
- **Capture capabilities** — photo food analysis + body-measure capture are behaviors, not DBs → **capability
  Blocks** (Spaces) + AI ADR.

## Boundaries with documented foundations (compose, don't rebuild)
- **Sessions & Scheduling (ADR-004):** a **WorkoutSession = a Session sub-type `workout`** (attended/planned/ad-hoc)
  + a Health-owned `workout_sessions` extension. Scheduling engine + `dueIn()` place assigned workouts on the
  Calendar/Journal agenda. The rich workout **runtime** (rest timer, pause/resume, per-set logging) is the Sessions
  runtime (G6 templates + interruption). `[FACT: sessions docs]`
- **Routines:** has an **`exercise` interactive step-type** whose "exercise-session mode" **drives an underlying
  workout session**; Routines G_new resolved **"Exercises = a NEW module"** = Health. `[FACT: intake/routines.md
  L55,L64,L70,L76]`
- **Purposes & Goals (capstone):** wants to **auto-source body metrics** (e.g. weight) as a purpose metric (PG6).
  Health is that provider. `[FACT: intake/purposes-and-goals.md PG6]`
- **Check-ins:** already tracks **mood/energy** daily → boundary vs Health's workout energy/mood + body metrics.
- **Gamification / Journal:** workout/meal/streak = XP + daily-summary sources (provider seam).
- **Spaces:** Health surfaces specialized **capability Blocks** → feeds the Spaces accumulator (below).

## Core — RESOLVED design (Forks 1-4, Victor 2026-07-13)
The shared spine his Notion didn't cover, now designed as OS-composing primitives.

- [x] **Fork 1 — Health Metrics (UNIFIED). YES.** One metric system: every tracked attribute = a `metric`
      (kind: `body-measure` · `performance-capacity` · `test-result` · `biomarker`) with **unit · direction
      (higher/lower-better) · category**. Values = **time-series** (value·date·**source** manual/photo/wearable/
      **derived**·life-context·optional photo). **Targets** live on a metric (value + date). Collapses Notion's
      Body-Measures + Exercise Performance History (raw per-set → derives KPIs like 1RM) + Performance Testing Lab
      (protocols that PRODUCE metric values). **Composes** the generic metric/time-series primitive (same shape as
      `purpose_metric_values`); **provider to Purposes** (PG6 auto-source). Values come from: direct measure
      (weight/circumference) · derived-from-logs (1RM ← performance) · test-protocol (VO2max ← Testing protocol).

- [x] **Fork 2 — Health Goals (UNIFIED). YES.** One goal system; types = **metric-target** (biceps→40cm ·
      bench-1RM→100kg · weight→75kg) · **discipline** (blue belt · first muscle-up) · **capacity** (10k<50min) ·
      **body-composition** (recomp/cut/bulk — absorbs Notion's *Nutrition Goals* phases) · **event-prep** (dated).
      Goal = {target metric/outcome · values · horizon short/med/long · status · **derived progress** (from Health
      Metrics) · review cadence}. **Specializes the Purposes target/metric primitive** (capstone); optionally
      ladders to a life Purpose. **Goal DRIVES programming (HL11): manual in the Core** (user builds plan aligned
      to goal), **AI/import generation = opt-in augmentation.**

- [x] **Fork 3 — Adaptation / Intelligence engine (Core, cross-pillar). Experiments = self-experimentation.**
      Decomposed: **Protocols** (Testing + Recovery libraries) → **Knowledge** (kind=`protocol`); **Responses**
      (per training-type/food: energy·digestion·"works/doesn't") → observation logs; **Experiments** (N-of-1: A
      control vs B test, run a duration, measured via **Health Metrics + responses**, → **Winner + Key Learning**)
      — verified from real rows ("Solid vs Liquid pre-workout", "30g vs 45g protein", "breakfast 7am vs 9am");
      **Profiles** (derived: accumulated response profile) → **feed the AI planner** (log→experiment→profile→better
      plan). Hypothesis sources: self · **community claims** · **doctor prescriptions** (imported via
      extension-model, then validated on the user's own body). ⭐ **Experiments = candidate GENERIC OS primitive**
      (N-of-1 hypothesis testing, reusable by Habits/Sleep/Productivity) — built Health-first, seam designed to
      generalize → **surfaces a candidate ADR** (personal-experiment framework). All ZK; imported claims/
      prescriptions ride the external-data ADR.

- [x] **Fork 4 — Disciplines (first-class, BINDS). YES.** A **Discipline** (Muay-Thai · Calisthenics · running)
      binds {a **Knowledge** subject (technique/theory) + a **Skill** (progression/mastery — Skills #2) + a
      training approach + its own **Session sub-types** (class/sparring ≠ strength workout)}. **Optional per goal**
      — a goal is discipline-linked ("train Muay-Thai") or generic ("build biceps"). Composes Knowledge + Skills
      (#2 forward-dep stub) + Sessions; NOT a standalone silo.

## Core — Safety & Medical facet (Victor 2026-07-14, Health-owned)
A 5th Core facet formalizing safety data his Notion already hinted at (exercise **Risk Level** + "Supervision
required" · ingredient **Allergens** · **Overtraining Indicators** · Recovery science). Three intertwined pieces:

- **Autonomy-with-clarity (principle).** The user has full sovereignty over his own body/life — **he can do
  whatever he wants** — and the OS is **explicit** that it *records, advises, and safety-nets, but never gatekeeps,
  prescribes, credentials, or blocks*. Non-paternalistic; the **extension-model principle applied to the body** (OS
  = safety net, not warden). A one-time acknowledgment + a standing Core rule; always free to proceed. `[INTENT Victor]`
- **Medical-attention flagging (advisory, dismissible, NEVER blocking).** The module watches danger signals —
  overtraining · extreme/rapid weight change · extreme caloric deficit · concerning biomarkers · injury/pain
  patterns · warning responses — and **pinpoints** "this warrants medical attention" (a `safety_flag` + Notification).
  Surfaces, notifies, logs; the user dismisses/decides. Thresholds informed but soft. `[INTENT Victor]`
- **Medical Profile (fast medical input set, read MODULE-WIDE, Health-owned).** Conditions · allergies/
  intolerances · injuries/limitations · medications · supplements · **doctor prescriptions** · clearances ·
  contraindications. The whole Health module reads it to (a) drive the flags, (b) **constrain/inform plans** —
  injury excludes exercises (via catalog Risk Level), allergy excludes foods (via Allergens), prescription sets
  nutrition targets — (c) personalize. Entered by hand **or imported** (doctor's prescription/report) via the
  **extension-model** (manual/AI/import triad). **Most-sensitive → ZK-encrypted.** A prescription can **spawn an
  Experiment** (validate on the user's own body). Health-owned, **exposed as a provider**. `[INTENT Victor 2026-07-14]`

## Health as an OS EXTENSION — integration architecture (the RESHAPE, 2026-07-13)
Principle (Victor): Health is **not an island** — it OWNS the irreducibly fitness/nutrition entities, COMPOSES the
documented foundations for everything generic, and plugs into every relevant module via the **provider seams**. The
18 Notion tables collapse: the *instance/log/schedule/notes/goal/tag* layers are **borrowed**; only the
*domain-specific* entities are Health-owned.

### A. What Health OWNS (the irreducible domain model)
- **Training:** Exercise **Catalog** (movement pattern·muscles·equipment·form-cues) · Exercise **Plans**
  (periodization: progression model·deload·energy system) · **workout-session extension** (+ per-set logs:
  planned vs actual, RPE, form quality, PR) · **protocol libraries** (Performance-Test · Recovery).
- **Nutrition:** **Ingredient + Dish** libraries (macros) · **Nutritional Plan** (caloric strategy·framework·
  supplements) · **Daily Meal Plan** + **Meal** instances (macros·purpose·source·cost) · **Shopping** list ·
  **Experiments** · **Response** logs.
- **Core (design-fresh):** **Body-Metrics** time-series (weight·body-fat·circumferences) · **Health Goals**
  (body-measure·discipline·capacity targets) · **Adaptation engine** (profile→experiment→learn) · **Disciplines**
  (Muay-Thai/Calisthenics).

### B. What Health COMPOSES (borrow — never rebuild)
| Concern (Notion layer) | OS foundation it composes | Health keeps |
|---|---|---|
| Workout instance + runtime (Assigned Session; rest timer/pause/energy/satisfaction) | **Sessions & Scheduling** — `workout` sub-type + runtime (ADR-004) | the `workout_sessions` extension + set logs |
| "Assigned today" (plan → day); meal/workout scheduling; reschedule | **Scheduler + `dueIn()`** → Global Calendar renders | plan→block projection rules |
| Session/meal templates (`AI Generated`, `Generation Method`) | **Session templates** (G6) + the authoring triad | plan/meal template content |
| Catalogs + protocol "labs" (Exercises·Ingredients·Dishes·Test·Recovery — technique/instructions/knowledge) | **Knowledge** (kinds: `exercise`·`ingredient`·`protocol`; mastery·references·graph) | structured fitness fields; Knowledge holds the learnable content |
| Descriptions/notes on any entity | **Notes & Pages** (`pages`, no inline notes) | — |
| Tags · pillar/discipline surfaces · loggers | **Spaces** (universal tags · saved views · capability Blocks) | "Training"/"Nutrition"/"Muay-Thai" Spaces; workout-logger + photo-capture Blocks |
| Health Goals · body-measure targets · progress | **Purposes & Goals** target/metric primitive (capstone) | fitness goal semantics; body-measure targets |
| Body-Metrics time-series | generic **metric/measurement** primitive (shared w/ purpose_metric_values) | the body-specific measures |
| Photo food/measure analysis · plan-by-LLM · library import | **AI-ADR + external-data-ADR + Spaces Blocks + R2/attachments** (extension-model, opt-in) | which fields the capability fills |
| Procurement cost · meal cost | **Finance** (budget/transactions touch-point) | shopping/meal entities |
| Disciplines' technique + skill progression | **Knowledge + Skills** (#2) | the discipline↔training link |

### C. Integration Contract (Health as an OS citizen — provider seams)
- **PROVIDES →** Journal (daily contribution: workouts·meals·macros·calories burned/consumed·weight); `dueIn()`
  (scheduled workouts·meals·tests → Calendar/agenda); **Purposes** (body-metrics auto-sourced as purpose metrics,
  PG6; goal progress); **Gamification** (workout streaks·PRs·goal progress → XP/achievements); **Notifications**
  (workout/meal reminders·test-due·deload); **Finance** (nutrition/shopping cost).
- **CONSUMES ←** Sessions (workout runtime + scheduler); Knowledge (exercise/food/protocol content + disciplines);
  Notes & Pages (notes/tags); Spaces (tags·views·capture Blocks); Preferences (units kg/lb·module toggle·dietary
  defaults); Check-ins (subjective energy/mood/sleep — Health owns objective, cross-references); Routines (the
  `exercise` step drives a Health workout); Tasks (health to-dos, optional); the AI/external ADRs (opt-in modes).
- **Sensitivity:** Health = most-sensitive data → all ZK-encrypted; every AI/import/wearable/photo path = opt-in
  extension-model (Sessions S5 already flags Health effects need consent).

### D. Dependencies & sequencing (why Health's CORE is documentable NOW)
- **Composes (all documented ✅):** Sessions · Knowledge · Notes & Pages · Tasks · Finance · Check-ins · Preferences.
- **Forward-dep STUBS (resolve at their turn):** **Spaces** (#8 — tags/views/capture Blocks + accumulator),
  **Purposes** (#9 — goal/metric primitive + body-measure targets), **Skills** (#2 — disciplines), **Gamification**
  (#10), **Notifications** (#11), **Routines** (#4 — exercise step), + the **two ZK ADRs** (AI/LLM · external-data)
  for AI/import/photo. → Health CORE (manual, composing ✅ foundations) is documentable now; the augmentation layers
  stub cleanly to these — consistent with how Habits/Finance were documented before Purposes.

### E. Layered picture
```
        ┌─────────── HEALTH (domain module) ───────────┐
        │  OWNS: catalogs · plans · body-metrics ·      │
        │        goals · adaptation engine · disciplines │
        └───▲────────▲────────▲────────▲────────▲───────┘
   composes │        │        │        │        │  provides→ Journal · Calendar ·
        ┌───┴──┐ ┌───┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴────┐   Purposes · Gamification ·
        │Sessions│ │Knowledge│ │Notes&│ │Spaces│ │Finance│   Notifications · Finance
        │(ADR-004)│ │ (kinds) │ │Pages │ │tags/ │ │(cost) │
        └────────┘ └─────────┘ └──────┘ │views/│ └───────┘
                                        │Blocks│
                                        └──────┘
   forward-dep stubs: Purposes(#9) · Skills(#2) · Gamification(#10) · Notifications(#11) · Routines(#4) · 2 ZK ADRs
```

## GAP MAP (what the plan cannot settle — for Victor, ONE batch)
`[likely …]` = my read; the rest need your intent. Big decisions: **HL1 (scope/pillars) · HL3 (plan↔Sessions↔
Routines boundary) · HL4 (exercise catalog → Knowledge?) · HL6 (nutrition depth) · HL7 (body-metrics entity +
Check-ins boundary).**

- [x] **HL1 — RESOLVED (Victor): Health = a goal-driven engine, TWO sub-modules + a progress spine.**
      **Physical Training** + **Nutrition** (documented as sub-contexts, the Learning-split precedent) + a
      cross-cutting **Body-Metrics & Progress** spine. Plans short/medium/long term. Goal-driven from the top
      (disciplines + capacities + body-measure targets → generate the program). See ⭐ Vision above. Open
      sub-questions become HL11-HL15 below; sleep/vitals/hydration = later additions (not now).

- [ ] **HL2 — Workouts compose the Sessions framework `[likely CONFIRM]`.** A WorkoutSession = a Session sub-type
      `workout` + a Health `workout_sessions` extension; the rest-timer/pause/per-set runtime = the Sessions
      runtime; scheduled workouts flow via `dueIn()`. Health does **not** build its own session spine. Confirm.

- [ ] **HL3 — ExercisePlan ↔ Sessions template ↔ Routine (draw the boundary).** An ExercisePlan (weekly split;
      "today's assigned exercises") projects onto days. Is the plan **(a)** a Sessions **template** + the scheduler
      generating workouts, **(b)** a **Health-owned plan** entity, or **(c)** a **Routine** (the exercise
      step-type)? These three currently all touch "assigned exercise today." `[my lean: a Health-owned ExercisePlan
      that emits scheduled `workout` sessions via the scheduler; a Routine may *reference* a workout as one step —
      but the plan itself is Health's]`.

- [ ] **HL4 — Exercise catalog (TrainingExercise): Health library vs Knowledge objects.** An exercise (bench press:
      muscle groups, form cues, technique, demo video) is reference/knowledge. Is it a **Health-owned exercise
      library**, or **Knowledge objects** (kind=`exercise`/`movement`) Health composes (the Languages→Knowledge
      pattern)? `[my lean: a Health exercise catalog for the structured fields (muscles/equipment/type), but its
      technique/cues notes are pages + it *may* register as Knowledge objects for mastery — confirm appetite]`.

- [ ] **HL5 — Set logging + derived volume/PR `[likely CONFIRM CR-005]`.** Per-set log (reps · weight · form
      rating · rest) as children of the workout extension; **volume = sets×reps×weight** (cardio =
      duration×intensity) **derived**; **PR detection** per exercise (heaviest/most-volume). Confirm the model +
      units handling (kg/lb per Preferences).

- [ ] **HL6 — Nutrition pillar depth.** NutritionPlan → Recipe → MealLog; **macros summed, calories derived**
      (CR-006). Decisions: (a) a **meal is a LOG entry, not a Session** (no timer) — confirm it's Health-owned data,
      not Sessions; (b) **food source** — manual macros only, a **custom food/recipe library**, or an **external
      food DB / barcode** (→ extension-model, opt-in, HL8)? (c) Recipe = reference (Knowledge-like) or Health-owned?
      `[my lean: custom food + recipe library, manual macros first; external food DB is an opt-in extension later]`.

- [ ] **HL7 — Body metrics / measurements entity (+ Check-ins boundary).** v1 implied "track metrics" but listed no
      entity. Define a **time-series body-metrics** entity (weight · body-fat · measurements · vitals; like
      `purpose_metric_values`) — **the source Purposes auto-pulls (PG6)** + Gamification + charts. Draw the
      **Check-ins boundary**: Check-ins owns daily **mood/energy/subjective**; Health owns **objective body
      measurements** — or do they overlap? `[my lean: Health owns objective measurements; Check-ins owns subjective
      pulse; a workout's energy/mood rating stays on the workout]`.

- [ ] **HL8 — Privacy / extension-model (Health = most sensitive) `[likely CONFIRM]`.** All Health data encrypted
      (L2/L3, ZK). Any external reach — **wearable/Apple-Health/Google-Fit import, food-DB, barcode** — goes through
      the **extension-model guard** (opt-in, on-device, user-owns-risk); Sessions effects into Health need explicit
      consent (S5). Confirm wearable-sync is an intended *future opt-in extension*, not core.

- [ ] **HL9 — Integration / provider seams `[likely CONFIRM]`.** Health registers: **journal contribution**
      (workouts/meals/macros/weight per date), **`dueIn()`** for scheduled workouts (→ Calendar/agenda), **streaks →
      Gamification**, **body metrics → Purposes** auto-sourced metrics (PG6), **Routines exercise step → workout
      session**. Confirm it composes the seams.

- [ ] **HL10 — Linking · pages · tags · domains `[likely CONFIRM]`.** Health links to **Purposes** (health domain),
      **Habits** (a "work out" habit/streak), **Tasks**; standalone pages for plans/workouts/recipes; shared scoped
      tags; **ADR-002 additions** to `entity_type` enums (`workout_session · exercise · meal · nutrition_plan · …`).

### Vision-driven gaps (HL11-HL15 — the goal-driven engine)

- [ ] **HL11 — Goal-driven programming (the core mechanic).** How do goals (disciplines · capacities ·
      body-measure targets) **generate** the program (exercise selection · variations · plan · schedule)? Manual
      mode: user assembles. What's the **program entity** model (a training program = goals + a periodized
      schedule of workouts across weeks/months = short/med/long term)? Relationship to **Purposes' target/metric
      primitive** (shared vs Health-owned fitness target) — Health owns fitness programming; laddering to life
      Purposes resolves at #9. `[decision needed: the program/goal data model + how much auto-generation vs manual
      in the CORE (manual) tier]`.

- [ ] **HL12 — The three authoring modes (manual · AI · import) — scope the CORE vs extensions.** Confirm the
      **manual tier is the documentable core now**; **AI (LLM builds program/plan)** + **import (exercise library /
      doctor prescription)** are **extension-model augmentations** (opt-in, ZK-guarded) stubbed against the two ZK
      ADRs (AI/LLM + external-data). Is the **manual/AI/import triad** a Health-local design, or should it be
      **generalized** (it also fits Languages, Nutrition, others)? `[my lean: generalize the pattern; build Health's
      manual core now, stub AI/import]`.

- [ ] **HL13 — The training↔nutrition closed loop.** A workout's **calorie burn** is derived (from
      volume/duration/intensity/body data) → feeds the **Nutrition intake target**. Nutrition targets derive from
      **goals + burn** on a "healthy path." Define: burn-estimation model (manual/formula/AI?), and how intake
      targets recompute against goals + expenditure. `[decision: derivation model + how prescriptive vs advisory]`.

- [ ] **HL14 — Nutrition depth + food capture (supersedes/extends HL6).** Beyond manual macros + recipe library:
      **photo food logging** — capture a meal photo → a **capability analyzes it (AI vision) → macros inferred →
      stored** (travel-flexible). This is a **Spaces capability Block** + the **AI ADR** + extension-model. Confirm:
      manual + custom food/recipe = core; **photo-analysis + external food DB = opt-in extensions**. Nutrition
      authority modes: doctor-prescription-import · self · LLM (HL12 triad).

- [ ] **HL15 — Body-measures as goals + progress analysis (extends HL7).** Body measures (per-part sizes · weight ·
      body-fat · performance/resistance metrics) are **time-series WITH target values** = the goal substrate for
      Physical Training. **Progress analysis** compares measured-vs-target over time (charts, trends, PRs). This is
      the **provider Purposes auto-pulls (PG6)**. Capture modes incl. **photo-based measure capture/analysis**
      (extension). Define the measure/target/progress model + Check-ins boundary (objective vs subjective).

### Spaces requirements (preliminary — finalized at Health accept → spaces.md accumulator)
Health surfaces rich specialized **capability Blocks** → strong input to Spaces:
- **Workout logger** (sets/reps/rest-timer/PR) · **meal/macro logger** · **photo-capture-and-analyze** (food +
  body measures, AI vision) · **body-metric/goal trend charts** · **exercise-library builder/importer** ·
  **program/plan generator** (manual + AI).
- Taggable workouts/meals/exercises/measures; **"Physical Training" / "Nutrition" / discipline (e.g. "Muay-Thai")
  Space** views; an imported exercise library or a shipped program = a **Template/starter-pack**.
- The **manual/AI/import authoring triad** is a candidate generalized Spaces+extension pattern.

### Not-blocking (resolved in Transform unless flagged)
- Terminal states per capability — in the contract.
- **ADR-002 additions** (new Health tables + enum extensions + `workout_sessions` extension coordinated with
  ADR-004) → folds into the standing amendment.
- Wearable/food-DB integrations → their own extension-model design, not core.

---
## Closing resolutions (Victor 2026-07-13)
- [x] **HL13 — energy loop: burn = ALL THREE (formula · wearable · manual), USER CHOOSES; intake target
      RECOMPUTES DYNAMICALLY** against each day's burn (training day → eat more). Formula default (MET×duration×
      bodyweight), wearable overrides when connected (extension-model), manual fallback.
- [x] **HL2** workouts = Sessions `workout` sub-type (compose, don't rebuild). **HL3** Health-owned plan emits
      scheduled workout sessions; Routine `exercise` step references one. **HL4** exercise catalog = Health-owned
      structured entity + Knowledge kind for technique. **HL5** volume=sets×reps×weight · cardio=duration×
      intensity (CR-005) · PR auto-detected · units kg/lb from Preferences. **HL6** manual macros + Ingredient/
      Dish libraries = Core; food-DB/barcode/photo = opt-in extensions. **HL7** Health owns objective Metrics,
      Check-ins owns subjective — cross-reference. **HL8** all ZK-encrypted; wearable/food-DB/photo/prescription =
      opt-in extension-model. **HL9** provider seams per Integration Contract §C. **HL10** standalone pages +
      universal tags/Spaces; ADR-002 `entity_type` additions (workout_session·exercise·meal·metric·discipline·
      experiment…). **HL11-HL15** resolved by the Core design + reshape (goal-driven programming manual-Core/AI-
      augment · authoring triad · energy loop · food/measure capture Blocks · body-measures as Metrics+Goals).

---
## ⭐⭐⭐ Re-harvest — System 1.0 + "…Management" hubs (2026-07-14): "what we missed"
Source: 19 individual DB pages + 3 "…Management" hub pages + the "System" index (`1a07ba8dd1d4809da489e7bbb5225a45`),
fetched 2026-07-14 via MCP (6 parallel agents). **A DIFFERENT layer than the System-2.0 18-DB design captured above**
— the older **System 1.0** databases + the actual organizing hub pages. Per the approach correction, **ALL Notion =
CONTEXT**; the authoritative layer is the co-created current-intent (CI-1..CI-5 below). Value: distinctive design DNA
the 2.0 polish abstracted away. `[FACT: Notion System 1.0 + Management hubs]`

### The 6-point delta (facts)
- **A. Clinical biomarker + derived-metabolic spine.** `Health Development / "Fisical Body"` = 40 props: anthropometrics
  (age·height·weight·waist·hip·body-fat%) + full blood panel (~26 markers: ALT·AST·BUN·CRP·Calcium·Ferritin·HDL·LDL·
  Hemoglobin·INR·Insulin·Magnesium·Phosphorus·Platelets·Potassium·RBC·Sodium·T4·TSH·WBC·cortisol·creatinine·hbA1c·
  testosterone·vitamin-D) + **derived formulas** BMR·BEE·LBM·body-fat-mass. `Fisical Development` = per-lift **1RM/MR
  benchmarks, bilateral (left/right)** (Bench·Squat·Deadlift sumo+conv·Biceps·Triceps·Quads·Calves·Posterior). `[FACT]`
- **B. General Health-Monitoring model (a 3rd spine).** `Health Management` hub = **Profile → Health Domains → Health
  Factors → Factor Results** + **Exams → Assigned Exams**. Whole-body monitoring, distinct from fitness-progress. `[FACT]`
- **C. Functional / body-system nutrition.** Dishes + Ingredients classified by **"area of action" — 8 systems**:
  Digestive & Gut · Immune & Inflammation · Antioxidant & Detox · Cell Repair & Mitochondria · Hormonal & Metabolic ·
  Muscular & Structural · Neurological & Cognitive · Systemic Resilience. Ingredients also carry **whole-food type**
  (Leafy Greens·Cruciferous·Roots/Tubers·Bioactive Fruits·Nuts/Seeds·Legumes·Whole Grains·Animal Proteins·Spices·
  Functional Beverages). `[FACT]`
- **D. Cooking-as-skill.** Dishes carry a `knowledge` status (don't-know → learning → know-how-to-cook). `[FACT]`
- **E. "Physical Roles" — capability units.** `Fisical Roles` = Objectives · a "Can do" statement · a mastery ladder
  (know-nothing → learning → able → mastered) + linked Exercises/Projects/Purposes. `[FACT]`
- **F. Duties/Obligations/Purposes wiring + gamification.** ~every 1.0 Health DB relates to Duties·Master Duties·
  Obligations·Master Obligations·Purposes·Projects; assignments carry reward/penalty. `[FACT]`
- **Hub note:** the 3 "…Management" pages are bare DB-index hubs (no prose) — design intent is in the schemas, not
  narrative. Data-hygiene: verbatim typos in source ("Fisical", "attuation", "Inflamation", "Atophagy", "equipament"). `[FACT]`

### Current-Intent RESOLVED (Victor 2026-07-14, co-created — AUTHORITATIVE, supersedes on conflict)
- [x] **CI-1 — Core gains a Monitoring spine. YES.** Fold **Health Domains → Factors → Factor Results** into the Metrics
      model as a **grouping hierarchy over metrics** (a Factor-result IS a metric value). **Exams** = **user-configured,
      scheduled + reminded** medical events (compose Sessions ADR-004 + Scheduler + Notifications), with **results
      incremented back into the metrics** → the OS **organizes the user's medical life alongside routines**. `[INTENT]`
- [x] **CI-2 — Biomarkers + derived metrics first-class. YES.** `biomarker` kind ships a **starter clinical panel**
      (editable, Knowledge-backed reference catalog; values always user-entered or imported) + a **derived-metric
      mechanism** (deterministic on-device formulas: BMR·BEE·LBM·body-fat-mass·1RM — no AI). Strength metrics get
      **bilateral + per-lift** structure. `[INTENT]`
- [x] **CI-3 — Nutrition functional axis. YES (+ research).** Adopt the **8-system "area of action"** + **whole-food
      type** as shipped, taggable taxonomies → **system-targeted nutrition**. ⚠ **RESEARCH task** (victor:research):
      validate/refine the 8-system taxonomy — adopt as an **editable starter**, may reshape. **Cooking-as-skill =
      OPT-IN**: default = a dish is just documented (+ optional recipes as pages); if the user enables it, cooking
      becomes a tracked Skill/Knowledge. `[INTENT]`
- [x] **CI-4 — Physical Roles ADOPTED (name + concept). YES.** A **Physical Role** = the **trainable-capability goal
      type** (**subsumes Fork-4 Disciplines + Fork-2 capacities into one concept**): owns **Objectives · a Can-do
      definition · derived mastery** + generates/links the exercises that build it. Examples: calisthenics · swimmer ·
      muay-thai · jiu-jitsu · triathlete. **A heavy Skills resource** (#2 — Skills consume Roles). **Complex +
      professional-grade**: supports **import from a professional setup** (extension-model) + auto-setup drawing
      external sources, for a great UX of "how to train each role." **Medically-aware**: reads the Medical Profile →
      excludes/adjusts exercises for the user's limitations — the **autonomy-with-clarity** principle ("a tool for your
      development, not your harm"; advisory, user always overrides). `[INTENT]`
- [x] **CI-5 — Duties/Obligations/Purposes wiring CONFIRMED.** Assigned workouts/meals/exams surface as **Duties/
      Obligations** (provider seam → #3 Duties, its first concrete consumer) + link Purposes/Projects; reward/penalty →
      Gamification (#10). Forward-dep **STUBS** — do not over-spec Duties (No-Guessing). `[INTENT]`
- [x] **CI-6 — Bidirectional external integrations (INTENT-only, forward-looking). YES — as intent.** The user truly
      wants **open external integrations he can plug at his own risk**: **INPUT ←** Google Health · wearables · other
      open health-data sources (→ feed Metrics / biomarkers / activity / sleep); **OUTPUT →** push OS information to
      **medical systems / medical services** for a genuine **two-way flow** connecting these scenarios. All **opt-in,
      user-owns-risk, extension-model**; OUTPUT especially = a **ZK egress dent** (data leaves the vault) → strictest
      consent. **Displayed as INTENT / forward-dep STUB only** — actual wiring needs per-service API/tool research once
      the core + services are complete (not spec'd now). Reinforces both ZK ADRs; the **output-to-medical** dimension
      is a NEW, larger ZK consideration than pure ingestion. `[INTENT 2026-07-14]`
- [x] **CI-4 refinement — Role authoring = manual → LLM → extension-import** (the confirmed triad). Import source = a
      **curated OS-owned Role database** pulled into the OS (like the Skills external Skill-DB), carrying **geography ·
      language · culture · location variation** (locale-variant model). Manual = core now; LLM + curated-import = ext. `[INTENT]`

### Coherence + realism validation (Step 2 — 2026-07-14)
All five CIs **compose existing seams and stay local/ZK** (derived formulas = deterministic on-device, no AI/server →
pure core). Flags (all non-blocking):
- **R1 — biomarker interpretation is advisory-only.** A shipped panel + reference ranges edges toward medical advice →
  must ride **autonomy-with-clarity** (advisory, never diagnostic/blocking); medical = **most-sensitive ZK class**.
  Fold into the Safety & Medical facet.
- **R2 — 8-system taxonomy validity uncertain** → the CI-3 research task; ship as an editable starter.
- **R3 — Physical Roles authoring = manual → LLM → extension-import** (confirmed triad; same posture as Skills):
  build the **manual Role core now**; **LLM** generation + **import from a curated OS-owned Role database** =
  extension-model augmentations stubbed to the AI/external ADRs. The curated Role-DB carries **geography · language ·
  culture · location variation** (the Skills locale-variant model) → content-curation burden, deferred to a design-pass.
- **R4 — external integrations (CI-6) = the ZK frontier.** INPUT ingestion rides the external-data ADR; **OUTPUT to
  medical services is data EGRESS** (beyond any prior module) → the sharpest opt-in/consent case, most-sensitive class.
  Intent-only now; forces an explicit **egress guard** in the extension-model when built.
- **C1 (reconciliation) — Physical Roles MERGES Fork-4 Disciplines + Fork-2 capacity-goals** into one trainable-
  capability concept; the Core model is updated to reflect the merge (Disciplines ≡ Physical Roles).

---
**STATUS: WHOLE — ENHANCED (2026-07-14).** Intake now includes: v1-plan seed + ⭐ Victor's Vision + ⭐⭐ 18-database
System-2.0 design + ⭐⭐⭐ **System-1.0 + Management-hub re-harvest (6-point delta A–F)** + OS-extension reshape + Core
resolved (Forks 1-4) + **current-intent CI-1..CI-5 (authoritative)** + coherence+realism validation (R1-R3 + C1). All
HL gaps closed. Forward-dep stubs recorded (Spaces #8 · Purposes #9 · Skills #2 · Gamification #10 · Notifications #11 ·
Routines #4 · Duties #3 · 2 ZK ADRs). **Ready for TRANSFORM (retro-enhance)** → the aspect docs at `docs/features/health/`.
