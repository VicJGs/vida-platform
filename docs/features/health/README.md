<!-- Health umbrella index — a domain module with a shared CORE + two module-sized pillar sub-contexts
     (Training, Nutrition). Layout confirmed 2026-07-13 (Victor): umbrella + sub-contexts. -->

# Health — Vida Platform (umbrella)

**What it is.** A **goal-driven Training + Nutrition engine** that plans, executes, and measures the user's
physical health across **short / medium / long term**. Not exercise+nutrition CRUD — a system that sets goals on
the body, generates the work to reach them (by hand, by AI, or by import), tracks what actually happens, and
**learns how the user's body responds** to refine the plan. `[INTENT: Victor Vision 2026-07-13; 18-DB Notion "System"]`

**Structure — a shared Core + two pillars (finer levers on one spine).** `[INTENT: Fork "Core spine, finer levers"]`

| Sub-context                 | What it owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Docs                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **Core** (the shared spine) | **Health Metrics + Monitoring** (unified body-measure[bilateral]·performance[per-lift]·test·**biomarker panel** time-series · **derived** BMR/BEE/LBM/1RM · **Domains→Factors** grouping · scheduled **Exams**) · **Health Goals** (unified: metric-target·**physical-role**·body-comp·event-prep) · **Adaptation engine** (Protocols·Responses·**Experiments**·Profiles) · **Physical Roles** (trainable capabilities — calisthenics/swimmer/muay-thai/jiu-jitsu/triathlete; merges Disciplines+capacities) · **Safety & Medical** (Medical Profile · advisory safety flags · autonomy-with-clarity) · the **energy bridge** · planning horizon | [core/](core/)           |
| **Training** (pillar)       | Exercise **Catalog** · **Plans** (periodization, Role-generated, medically-aware) · workout-session **extension** + per-lift/bilateral set logs · protocol libraries                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | [training/](training/)   |
| **Nutrition** (pillar)      | **Ingredient/Dish** libraries (**functional-area** + whole-food type · opt-in cooking-skill) · **Nutritional Plan** · **Daily Meal Plan** + Meal instances · **Shopping** · Response logs                                                                                                                                                                                                                                                                                                                                                                                                                                                        | [nutrition/](nutrition/) |

**Two levers, one object.** Training and Nutrition are two levers acting on **the body**; the Core holds what both
share — the body's state (Metrics), its direction (Goals), its adaptation (Experiments/Profiles), and the
**energy balance** (calories burned ↔ consumed). Modality (strength/cardio/skill/mobility · dietary framework) is a
**dimension/property**, not a table. `[INTENT]`

**An OS extension, not an island.** Health OWNS the irreducibly fitness/nutrition entities and **composes** the
documented foundations for everything generic:

- **Sessions & Scheduling (ADR-004)** — a workout = a `workout` session sub-type + runtime; the scheduler + `dueIn()`
  place assigned workouts/meals on the Global Calendar. `[FACT: sessions docs reserve `workout`/`workout_sessions`]`
- **Knowledge** — Exercise/Ingredient/Dish/Protocol catalogs = Knowledge kinds (technique·mastery·graph); a
  **Physical Role** binds a Knowledge subject + a Skill (#2 — Roles are a heavy Skills resource); **opt-in cooking**
  = a Skill/Knowledge object. `[FACT: knowledge kinds registry; INTENT CI-4/CI-3]`
- **Notes & Pages / Spaces** — descriptions→pages; pillars/Physical-Roles = **Spaces** (universal tags + views);
  workout-logger + photo-capture = **capability Blocks** (Spaces #8 forward-dep). `[INTENT]`
- **Purposes & Goals** — Health Goals specialize the target/metric primitive; body-metrics **auto-source** purpose
  metrics (PG6). `[INTENT capstone #9]`
- **Finance** — nutrition/shopping **cost** is a Finance touch-point. **Preferences** — units (kg/lb)·module toggle·
  dietary defaults. **Check-ins** — subjective energy/mood/sleep (Health owns objective, cross-refs). `[INTENT]`

**Integration Contract (provider seams).** **Provides →** Journal (daily workouts/meals/macros/weight) · Calendar
(`dueIn`) · Purposes (metrics + goal progress) · Gamification (streaks/PRs) · Notifications (reminders/deload) ·
Finance (cost). **Consumes ←** Sessions · Knowledge · Notes&Pages · Spaces · Preferences · Check-ins · Routines
(the `exercise` step drives a workout) · the AI/external ADRs. Full detail: `core/contract.md`. `[INTENT: intake §C]`

**Sensitivity.** Health = the most-sensitive data → **all ZK-encrypted**; every AI/import/wearable/photo/
prescription path = **opt-in extension-model** (Sessions S5 flags Health effects need consent). `[FACT: ZK-1; sessions S5]`

## Status

| Sub-context |     Intake      |     Transform     |                   Verify                    |
| ----------- | :-------------: | :---------------: | :-----------------------------------------: |
| Core        | ✅ (CI-1..CI-6) | ✅ enhanced 07-14 | ✅ gate PASS 07-13 · **re-gate PASS 07-14** |
| Training    |       ✅        | ✅ enhanced 07-14 | ✅ gate PASS 07-13 · **re-gate PASS 07-14** |
| Nutrition   |       ✅        | ✅ enhanced 07-14 | ✅ gate PASS 07-13 · **re-gate PASS 07-14** |

## Forward-dep stubs (resolve at their turn)

Spaces (#8 — tags/views/capture Blocks) · Purposes (#9 — goal/metric primitive, body-measure targets) · Skills
(#2 — **Physical Roles are a heavy Skills resource**; opt-in cooking-skill) · **Duties (#3 — assigned workouts/meals/
exams surface as Duties/Obligations; Health = Duties' first consumer)** · Gamification (#10) · Notifications (#11) ·
Routines (#4 — exercise step) · **two ZK ADRs** (AI/LLM · external-data) for AI/import/photo/prescription modes +
**bidirectional external integrations (CI-6: wearables/Google-Health INPUT · medical-services OUTPUT/egress — INTENT
only)** · candidate **ADR: N-of-1 Experiment framework** (generalizable) · candidate **design-pass: curated Physical-
Role library** (locale-varying) · **research: validate the 8-system functional-nutrition taxonomy (R2)**. `[INTENT: intake §D + CI-1..CI-6]`
