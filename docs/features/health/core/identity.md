<!-- Identity — features/health/core · /documentation Phase 2 · sources: docs/intake/health.md (⭐⭐ 18-DB Notion
     design + Core resolved Forks 1-4) · Victor Vision 2026-07-13. Health has NO v2 schema (recovered domain). -->

# Identity — Health: Core  (level: Feature / Health shared spine)

**What it is.** The **shared spine** both Health pillars (Training, Nutrition) act on — **the body, its direction,
and its adaptation**. Six things live here: **Health Metrics + Monitoring** (what the body *is*, measured over time
and organized into health domains → factors + user-scheduled medical **exams**), **Health Goals** (where it's
*going*), the **Adaptation engine** (how the user *learns* what works on his own body), **Physical Roles** (the
**trainable capabilities** he trains toward), and **Safety & Medical**. Plus the **energy bridge** (calories burned ↔
consumed) that couples the two pillars into a loop. `[INTENT: Core resolved Forks 1-4 + CI-1..CI-6, 2026-07-14]`

**The desire behind it.** The user wants to set concrete targets on his body — *"increase biceps/quads/resistance
to specific numbers; become a calisthenics athlete, a muay-thai/jiu-jitsu fighter, a triathlete"* — then have the
whole system pull toward them, tracking what actually changes and **learning how his individual body responds** (to
training, to food, to timing, to a doctor's prescription, to a claim he wants to test) so the plan gets smarter over
time. He also wants the OS to **organize his medical life** alongside his routines — scheduling and reminding exams,
folding results back into the metrics — and, eventually, to **connect (at his own risk) to wearables, Google Health,
and medical services** for a two-way flow of information. The Core is the part that makes Training and Nutrition
*one coherent pursuit* rather than two apps. `[INTENT: Victor Vision + CI-1/CI-6]`

**The six Core capabilities.**
- **Health Metrics + Monitoring (unified).** Every tracked attribute — body-measure (weight·body-fat·biceps/quads/…
  circumference, **bilateral** where paired), performance-capacity (**per-lift 1RM/max-reps**·VO2max), test-result,
  **biomarker** (a shipped, editable **clinical panel** — blood work, hormones, metabolic) — is one `metric` with a
  unit, a **direction** (higher/lower-better), and a **time-series** of values (source: manual·photo·wearable·**derived**).
  Metrics are **grouped into Health Domains → Factors** (a monitoring hierarchy); **derived metrics** (BMR·BEE·LBM·
  body-fat-mass·1RM) are computed on-device from other metrics. **Exams** (user-configured, scheduled + reminded
  medical events) produce metric values. Collapses Notion's Body-Measures + Performance-History + Testing-Lab +
  Health-Development + Domains/Factors/Exams into one spine. `[INTENT Fork 1 + CI-1/CI-2]`
- **Health Goals (unified).** One goal system; the goal is the **pursuable** carrying `measurement_kind` × `binding_mode`
  (ADR-011 M1/M2) — the former metric-target · **physical-role** · body-composition · event-prep "types" are now
  (measure-kind × binding × the metric/role subject) combinations, not a bespoke enum. Progress is a **nullable override**
  (`NULL ⇒ derive`, M3) that **derives** from Metrics via the M5 read seam. A goal **drives programming** (manual in Core;
  LLM/import opt-in). `[INTENT Fork 2/CI-4; ADR-011 M1/M2/M3/M5]`
- **Adaptation engine.** Protocols (→ Knowledge) · Responses (observation logs) · **Experiments** (N-of-1: A control
  vs B test → winner + learning) · **Profiles** (derived response profile → feeds the AI planner). `[INTENT Fork 3]`
- **Physical Roles.** The **trainable-capability** unit (merges the old Disciplines + capacity goals): calisthenics ·
  swimmer · muay-thai · jiu-jitsu · triathlete. Each owns **Objectives · a "Can-do" definition · derived mastery** +
  **generates/links the exercises** that build it, and binds a Knowledge subject + a Skill (#2 — Roles are a heavy
  Skills resource). **Professional-grade + medically-aware** (reads the Medical Profile to exclude/adjust exercises
  for the user's limitations). Manual in Core; **LLM + curated-import** (the OS-owned, locale-varying Role library)
  are opt-in augmentations. `[INTENT Fork 4 merged / CI-4]`
- **Safety & Medical (Health-owned).** A **Medical Profile** (conditions · allergies · injuries · medications ·
  supplements · **prescriptions** · clearances · contraindications) read **module-wide** to drive **advisory
  safety flags** (pinpoint when medical attention is warranted — never block) and to **constrain/inform plans**
  (injury excludes exercises · allergy excludes foods · prescription sets targets). Governed by **autonomy-with-
  clarity**: the user can do whatever he wants; the OS records/advises/safety-nets, never gatekeeps. `[INTENT Victor 2026-07-14]`

**What couples the pillars.** The **energy bridge**: Training emits calories-burned (formula·wearable·manual, user
chooses); Nutrition's intake target **recomputes dynamically** against that burn (training day → eat more). Goals
and Metrics are read by *both* pillars; the Adaptation engine profiles *both* training and food responses. `[INTENT HL13]`

**What it is NOT.**
- **Not a pillar.** It owns no exercises and no recipes — those are Training/Nutrition. It owns the *shared*
  body/goal/adaptation spine. `[INTENT]`
- **Not the metric/goal *primitive* owner.** It **specializes** the Purposes target/metric primitive (capstone #9);
  body-metrics are a **provider** Purposes auto-sources (PG6), not a parallel system. `[INTENT]`
- **Not a session engine.** Workouts are Sessions (ADR-004) — the Core does not re-implement timing/scheduling. `[FACT]`
- **Not an AI/wearable/exchange service (yet).** Plan-by-LLM · food-photo analysis · wearable/prescription import ·
  and the intended **bidirectional external integrations** — INPUT from Google Health / wearables / open health
  sources, OUTPUT to medical systems & services — are **opt-in extension-model** layers on top of the manual Core.
  INPUT is **device-mediated ingestion (ADR-014 X1)**, layered (X2), gated on `external_in_ok` (X5); the AI leg rides
  **ADR-015** (on_device/cloud per-use AI1, cloud = egress + scope-min AI3, `source=ai` provenance AI6). The integrations
  are **INTENT / forward-dep stubs only** (actual per-service wiring waits until the core + services are complete);
  **OUTPUT-to-medical is data EGRESS** and rides the **X4 egress guard** (`external_out_ok` + union-of-consents + audit +
  never-auto-transmit — Health CI-6 is ADR-014's named egress example). Never core, never non-consensual.
  `[FACT: ZK-1; extension-model — INTENT CI-6; ADR-014 X1/X2/X4/X5; ADR-015 AI1/AI3/AI6]`
- **Not a warden.** Safety & Medical **advises and safety-nets — it never gatekeeps, prescribes, credentials, or
  blocks.** Autonomy-with-clarity: the user's body, the user's call; flags are dismissible. `[INTENT Victor 2026-07-14]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
