<!-- Business rules — features/health/core · Phase 2 · sources: docs/intake/health.md (Core resolved Forks 1-4 +
     closing resolutions HL13/HL2-HL10) · v1 CR-005/CR-006. Prefix: HC- (Health Core). -->

# Business Rules — Health: Core

Invariants the shared spine enforces. Every capability enumerates terminal states (loading/empty/error/success) in
`contract.md`. Governed by the No-Guessing Principle; most rules are `[INTENT]` (recovered domain, no v2 code).

- **HC-1 — One unified Metric.** Every tracked attribute is a single `metric` entity of kind
  `body-measure | performance-capacity | test-result | biomarker`, with a `unit`, a `direction`
  (higher-better / lower-better), a category, and an optional **`side`** (left/right/bilateral, for paired measures &
  per-limb 1RM). The `biomarker` kind ships an **editable starter clinical panel** (blood work · hormones · metabolic
  markers) as a Knowledge-backed reference catalog. No separate body-vs-performance-vs-test systems. `[INTENT Fork 1/CI-2]`
- **HC-2 — Four value sources.** A metric value enters by **direct measure** (weight/circumference), **derived**
  (computed on-device — 1RM from Training's set logs; BMR·BEE·LBM·body-fat-mass from other metrics), **test protocol**
  (e.g. VO2max via a Testing protocol), or **exam result** (a scheduled medical Exam, HC-20). Every value carries its
  `source` (manual·photo·wearable·derived·exam·import·**ai**) + optional photo + life-context — `source` is **value
  provenance** (ADR-011 M2 keeps it distinct from a goal's `binding_mode`); `wearable`/`import` enter via device-mediated
  ingestion (ADR-014 X1) under `external_in_ok` (X5); `ai` tags LLM/photo-analysis-derived values (ADR-015 AI6).
  `[INTENT CI-1/CI-2; ADR-014 X1/X5; ADR-015 AI6]`
- **HC-3 — Goals are unified; the goal is the pursuable; progress is DERIVED.** One goal system. The `health_goal`
  carries `measurement_kind` (CHECK ∈ `quantitative·milestone·rate·qualitative`, ADR-011 **M1**) × `binding_mode`
  (CHECK ∈ `manual·derived-pull·event-trigger`, **M2** — distinct from value `source`); the former metric-target ·
  **physical-role** · body-composition · event-prep "types" are (kind × binding × the metric/role subject) combinations,
  not a bespoke enum. A goal's progress is a **nullable override slot** (`NULL ⇒ derive`, **M3**) — `progress()` computes
  from its target metric(s) vs current values over the horizon via the M5 seam; never hand-typed for measurable goals.
  Qualitative/role goals may be rated via review + derived mastery (HC-9). `[INTENT Fork 2/CI-4; ADR-011 M1/M2/M3]`
- **HC-4 — A Goal drives programming; manual is the Core.** A goal informs/generates the Training plan + Nutrition
  plan. In the Core the user builds the plan aligned to the goal; **AI-generation and library/prescription import
  are opt-in augmentation layers** (extension-model). AI generation rides **ADR-015**: `on_device`/`cloud` per-use
  (AI1), a cloud call is **egress + scope-minimization** (AI3), generated rows carry `source=ai` (AI6).
  `[INTENT Fork 2/HL12; ADR-015 AI1/AI3/AI6]`
- **HC-5 — Body-metrics are a Purposes provider (PG6) via the M5 read seam.** Body-measure targets specialize the
  Purposes target/metric primitive; body-metric series are **auto-sourced** as purpose metrics — Purposes reads them
  through Health's **M5 queryable-measure read seam (R7)** (`body_weight`/`body_fat`/`1rm`…), never a direct table read;
  outage → last-known + flag. `[INTENT capstone #9; ADR-011 M5 §3.6 + R7]`
- **HC-6 — The energy loop is closed and dynamic.** Calories **burned** are estimated by the user's chosen method
  (**formula** MET×duration×bodyweight [default] · **wearable** [extension] · **manual**); the Nutrition intake
  target **recomputes dynamically** against each day's burn. Volume = sets×reps×weight; cardio = duration×intensity
  (CR-005); macros summed, calories = P×4+C×4+F×9 (CR-006). `[INTENT HL13; FACT v1 CR-005/CR-006]`
- **HC-7 — Experiment = N-of-1 lifecycle.** An experiment states a hypothesis, defines **A (control) vs B (test)**,
  runs a duration, is **measured via Health Metrics + subjective responses**, and resolves to a **winner + key
  learning**. Hypotheses come from self · community claims · **doctor prescriptions** (imported, then validated on
  the user's own body). `[INTENT Fork 3; FACT verified rows]`
- **HC-8 — Learning feeds the plan.** Responses + resolved experiments accumulate into a derived **Profile** (how
  this body responds to a training type / food / timing); the Profile is context the AI planner consumes. `[INTENT Fork 3]`
- **HC-9 — A Physical Role is the trainable-capability unit (merges Disciplines + capacities).** A Role (calisthenics
  · swimmer · muay-thai · jiu-jitsu · triathlete) owns **Objectives · a "Can-do" definition · a derived mastery
  level** (`deriveMastery()` = a **per-child weighted rollup** over the linked exercises/goals, default equal-weight —
  ADR-011 **M3/M4**; a nullable override, `NULL ⇒ derive`; the up-ladder role→purpose rides `contributions`,
  Purposes-owned), **generates/links the exercises** that build it, and **binds** a Knowledge subject (technique) + a Skill
  (progression — #2; Roles are a heavy Skills resource). It is **medically-aware**: it reads the Medical Profile
  (HC-16) to exclude/adjust exercises for the user's limitations ("a tool for your development, not your harm").
  Optional per goal (a goal may target a Role or be generic). Authoring: **manual = Core; LLM + curated-import** (the
  OS-owned, locale-varying Role library — geography/language/culture/location) = opt-in extension. `[INTENT Fork 4 merged / CI-4/R3]`
- **HC-10 — ZK + extension-model, always.** All Health data is encrypted (most fields E). Every external/AI path —
  wearable sync, food-DB, barcode, photo analysis, LLM plan/meal generation, prescription import — is **opt-in,
  on-device-preferred, user-owns-risk**, and never a precondition of the manual Core. `[FACT: ZK-1; extension-model; sessions S5]`
- **HC-11 — Units follow Preferences.** kg/lb, cm/in, kcal/kJ resolve from `user_preferences`; stored canonical,
  displayed per preference. `[INTENT HL5]`
- **HC-12 — Protocols are Knowledge.** Testing + Recovery protocols are reusable methods modeled as Knowledge
  (kind=`protocol`), not Core tables — the Core references them. `[INTENT]`
- **HC-13 — Compose, don't rebuild.** The Core never re-implements sessions/scheduling/tags/views/notes — it
  composes Sessions·Knowledge·Notes&Pages·Spaces·Preferences (see `contract.md` §Consumes). `[INTENT reshape §B]`
- **HC-19 — Monitoring is a grouping over Metrics, not a parallel system.** **Health Domains** (cardiovascular ·
  metabolic · hormonal · sleep · immune · digestive · …) ⊃ **Health Factors** (measurable sub-indicators) organize
  metrics into a monitoring hierarchy; a **Factor result IS a metric value** (HC-1), never a separate store. Domains
  & Factors are **user-extensible** (ship a starter set). `[INTENT CI-1]`
- **HC-20 — Exams are user-configured scheduled medical events.** An **Exam** (blood panel · checkup · imaging) is
  set up by the user with a **schedule + reminders** (composes the **Scheduler + Notifications**; like a meal, it is a
  scheduled due-item surfaced via `dueIn()`, not a Session with runtime), and its **results are entered back as metric
  values** (HC-2 `source=exam`) — organizing the user's medical life alongside routines. The Core defines/schedules;
  it does not perform the exam. `[INTENT CI-1]`
- **HC-21 — Derived metrics are computed, on-device, deterministic.** BMR·BEE·LBM·body-fat-mass·1RM (and any future
  formula metric) are **computed from other metric values** — no AI, no server. The formula is declared on the
  metric; the value is a cache, the source rows are truth. `[INTENT CI-2; DERIVED-over-stored HC-3]`
- **HC-22 — External integrations are opt-in, bidirectional, INTENT-only.** INPUT (Google Health · wearables · open
  health sources → metric values, `source=wearable/import`) is **device-mediated ingestion (ADR-014 X1)**, layered
  `native·public-reference·user-managed` (X2), gated on **`external_in_ok`** (X5), reconciled/add-only-deduped (X8) —
  never a server-side fetch. **OUTPUT to medical systems & services is data EGRESS** and rides the **X4 egress guard**
  (per-target consent + **union-of-consents** + audit + **never auto-transmit**) gated on **`external_out_ok`** (X5) —
  the most-sensitive class leaving the vault; Health CI-6 is ADR-014's named egress example. Both are **forward-dep
  stubs** — not wired until per-service research after the core is complete; never a precondition of the manual Core.
  `[INTENT CI-6/R4; ADR-014 X1/X2/X4/X5/X8]`

### Safety & Medical (Health-owned facet)

- **HC-14 — Autonomy-with-clarity (never a warden).** The user has full sovereignty over his own body/life — he
  can do whatever he wants. The OS **records, advises, and safety-nets, but never gatekeeps, prescribes,
  credentials, or blocks.** A one-time explicit acknowledgment + a standing rule; the user is always free to
  proceed. Extends the extension-model constitution (OS = safety net) to the body. `[INTENT Victor 2026-07-14]`
- **HC-15 — Medical-attention flagging is ADVISORY.** Danger signals (overtraining · extreme/rapid weight change ·
  extreme caloric deficit · concerning biomarker · injury/pain pattern · warning response) raise a **`safety_flag`**
  (surface + Notification) that **pinpoints when medical attention is warranted** — dismissible, logged, **never
  blocking**. Thresholds informed but soft. `[INTENT Victor]`
- **HC-16 — The Medical Profile is read MODULE-WIDE (Health-owned provider).** Injuries/contraindications filter
  the exercise catalog & plans (via Risk Level); allergies/intolerances filter foods & plans (via Allergens);
  conditions/prescriptions inform plans & nutrition targets. Health owns it and **exposes it as a provider**;
  filtering is advisory (excluded items are flagged, not forcibly removed). `[INTENT Victor]`
- **HC-17 — Medical data = most-sensitive; ZK + extension-model.** All medical fields encrypted; **imported**
  doctor input (prescription/report) is opt-in, on-device-preferred (extension-model); the OS never transmits
  plaintext medical data. `[FACT ZK-1; extension-model]`
- **HC-18 — A prescription can spawn an Experiment.** A doctor's (or community/self) prescription may become an
  N-of-1 Experiment (HC-7) to validate it on the user's own body — linking Safety & Medical to the Adaptation
  engine. Imported prescription/report content is **untrusted ADR-014-ingested input** → when it feeds an LLM it carries
  **provenance into the prompt** (ADR-015 **AI5**), the egress slice is user-reviewed, and injected tool-calls can't
  auto-widen the scope. `[INTENT Victor; ADR-014 X1; ADR-015 AI5]`
- **HC-23 — Biomarker interpretation is advisory, never diagnostic (R1).** A shipped panel + any reference ranges
  **inform and flag** (HC-15) — the OS **never diagnoses, prescribes, or blocks**. Ranges are soft context under
  autonomy-with-clarity; biomarker data is the **most-sensitive ZK class**. `[INTENT R1; extends HC-14/HC-17]`

## Terminal states (every Core capability)

Metric series (empty=no readings · error=unit mismatch) · Monitoring (Domain/Factor empty→no metrics linked) · Exam
(scheduled · due · **overdue** · logged→results in) · Goal (no target set · unmeasurable→review-rated · achieved) ·
Physical Role (no exercises yet · in-progress mastery · mastered) · Experiment (planning · running A/B · inconclusive
· resolved) · Profile (insufficient data) · Medical Profile (empty→no constraints · populated) · Safety flag
(**none** · raised/active · **dismissed** · acknowledged). Detailed in `contract.md`.

## Completion checklist

- [x] rules enumerated + labeled [FACT/INTENT] · [x] terminal states noted · [x] no `{{…}}`
