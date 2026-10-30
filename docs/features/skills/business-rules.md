<!-- Business rules — features/skills · Phase 2 · Prefix: SK- (Skills rules; distinct from the intake's SK1-SK8 gaps). -->

# Business Rules — Skills

Invariants. Mostly `[INTENT]` (recovered/reframed module; v2 = a 2-table floor). Every capability enumerates
terminal states (in `contract.md`).

- **SK-1 — A Skill is a cross-domain capability.** One of six Domains (Professional·Technical·Creative·Social·
  Mental·Physical), goal-driven (why-important · target-mastery). `[FACT Notion; INTENT]`
- **SK-2 — Configurable leveling (ladder = data).** Each skill defines its own progression ladder (belts/ranks/
  milestones/CEFR) via ordered **Levels** with completion criteria + success indicators; ship ladder templates.
  Never one universal scale. `[INTENT CI-1]`
- **SK-3 — Three-way fill + locale variance.** A skill's definition/ladder/activities fill **manual · LLM · imported
  from our curated external Skill-DB** (opt-in, consent-gated — extension-model). Definitions are **context-variant**
  (language·location·geography·culture) → the Library stores canonical defs **with locale variants**; not-found →
  manual/AI/**community-template import** (pull, not submit). `[INTENT CI-1]`
  ✅ **COHERENCE RESOLVED (Victor 2026-07-14):** the **community is EXTERNAL to the OS** — not a feature, pipeline,
  or code. The OS's **only bridge is its existing import/export** of **generic, non-personal templates**; the
  decision to export/share is **solely the user's** (their sovereignty, outside the vault). This **preserves SU-1**
  (no in-OS sharing/collaboration) **+ ZK-1** (the OS never transmits data). The external Skill-DB likewise = public
  reference data pulled via **import** (anonymous/bulk — no metadata leak). **No in-OS "submit to community"
  pipeline exists.** `[FACT ZK-1/SU-1; resolved]`
  **ADR-014/015 layering:** the import is device-mediated **public-reference** whole-set bulk (X1/X2/X3 — provenance +
  signature/version) under `external_in_ok` (X5), add-only dedup by (name, locale) (X8), revocable stop-future-keep-
  imported (X9), a declared per-source normalization contract (X10); the generic-template **export** is X4 egress
  (`external_out_ok`, per-target consent, **never auto-transmit**). The **LLM** draft is an ADR-015 model call (X11
  split) in `on_device`/`cloud` modes (AI1, server-blind), cloud = egress + scope-min (AI3); an imported/community def
  is untrusted content whose provenance travels into any prompt (AI5); generated rows carry `source=ai` (AI6). `[INTENT;
ADR-014 X1/X2/X3/X4/X5/X8/X9/X10/X11; ADR-015 AI1/AI3/AI5/AI6]`
- **SK-4 — Mastery is DERIVED (hybrid) — and honest about the unmeasurable.** Current level/progress compute from
  gates + activities + assessments + linked Knowledge mastery + practice consistency; manual override is flagged.
  ⚠ **REALISM:** many real-life abilities (empathy, leadership, taste) **cannot be objectively measured digitally** —
  for these, mastery is explicitly **qualitative / self-rated / evidence-based**; the system **never fakes a number**.
  The Skill Composer's measurement config chooses per skill (objective-derived vs qualitative) — this **is** the ADR-011
  **`measurement_kind`** taxonomy (`quantitative`/`milestone` objective · **`qualitative`** self-rated) × `binding_mode`=
  **`derived-pull`**; skills **references** the taxonomy, it does **not** store a pursuable `measurement_kind` column
  (skills is not in the M1 pursuable set — the pursuable Target-Mastery target lives in Purposes, SK-10). `[INTENT CI-1;
ADR-011 M1/M2; validation 2026-07-14]`
- **SK-5 — The Skill Composer defines measurement.** Per skill the user configures _what it is · which OS components
  it interacts with · what's tracked · how progress/mastery is measured_, in **Quick** or **Advanced** mode. This is
  how the module handles the hardness of measuring real-life ability; it also **subsumes cross-domain** (chosen per
  skill). `[INTENT CI-2]`
- **SK-6 — Dispatch, don't duplicate.** `Activity.Type` routes work to the owning module: **Project→Projects ·
  Study→Knowledge · Practice→Sessions · Assessment/Review→Knowledge/review**. Skills orchestrates (like Routines). `[INTENT CI-2]`
- **SK-7 — Practice composes Sessions; reflection is the shared engine.** Actions = scheduled `practice` Sessions
  (`dueIn`); **Dev-logs compose the reflective/Adaptation engine SHARED with Health** (progress-feeling·what-worked·
  next-plan·insights; N-of-1 experiments on your own learning). Practice time **derived**. `[INTENT CI-1/CI-3; FACT ADR-004]`
- **SK-8 — The Skill Graph (real dependencies).** A **global canonical graph** (~50+ skills · dependencies · shared
  foundational nodes) + the user's **personal instance**; edges = requires/unlocks/synergy. The graph
  **recommends a path** and **detects synergies** ("these goals share skill Y"). Extensible: AI · our additions ·
  manual · community. `[INTENT CI-3 + assistant build-ons, Victor-approved]`
- **SK-9 — Mastery decays; maintenance is advisory.** Unpracticed skills decay (SRS via Knowledge's review-curve →
  `dueIn`/Notifications); **advisory + per-skill configurable, never nagging** (autonomy-with-clarity). `[INTENT CI-3]`
- **SK-10 — Ladders to Purpose + feeds Gamification.** Target-Mastery = a **Purpose target** — the pursuable that
  carries `measurement_kind`/`binding_mode` (M1/M2, **Purposes-owned**); progress auto-sources a purpose metric
  (capstone stub). Level-ups/mastery/streaks emit the **`grant_currency(XP)`** feeder effect (E2 — `award_xp` is its XP
  case) that Gamification applies; skills emits the signal, **never writes XP** (skills = the OS's real leveling game).
  `[INTENT CI-2; ADR-011 M1/M2; ADR-012 E2]`
- **SK-11 — Evidence + insight-compounding.** Artifacts (project/recording/cert) **prove** mastery via pages/
  attachments + Project-activities. Dev-log Key Insights accumulate into a personal **principles store** (as
  Knowledge objects). `[INTENT CI-3]`
- **SK-12 — ZK + extension-model + autonomy.** All ZK-encrypted; every AI/external-DB/community/wearable path is
  opt-in, consent-gated; decay/recommendations advise, never gatekeep. `[FACT ZK-1; extension-model]`
- **SK-13 — Compose, don't rebuild.** Reuse Sessions·Knowledge·Projects·Purposes·Spaces·the reflective engine·the
  neural graph — Skills adds the capability spine + Composer + Graph, not parallel machinery. `[INTENT reshape]`
- **SK-14 — External + AI paths are ADR-014/015-layered.** The Skill-DB import is device-mediated **public-reference**
  whole-set bulk ingest (X1/X2/X3) under `external_in_ok` (X5), add-only + revocable (X8/X9); the AI-draft is an
  ADR-015 model call (X11) in `on_device`/`cloud` modes (AI1), cloud = egress + scope-min (AI3), untrusted imported
  content carries provenance into any prompt (AI5), generated rows carry `source=ai` (AI6). **Not agentic** — the draft
  is a scoped generate, not a tool-wielding agent (no AI4 envelope). `[INTENT; ADR-014/015]`

## Terminal states

Skill (planning · active · honing/maintaining · completed) · Definition fill (manual · AI-generating→**fail→manual**
· importing→**not-found→manual/community-import**) · Level (upcoming/locked · active · complete) · Action (planned ·
in-progress · complete/**skipped**) · Mastery (insufficient-data · derived · manual-override) · Graph (no-deps ·
recommended-path · synergy-detected) · Decay flag (none · at-risk · **dismissed**).

## Completion checklist

- [x] rules + [FACT/INTENT] · [x] terminal states · [x] no `{{…}}`
