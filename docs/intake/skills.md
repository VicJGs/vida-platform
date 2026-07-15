# Intake — skills  (level: domain module; Wave R — recovered/reframe; EXECUTION #2)

> Fill order: exec #2. Skills was **separated from Learning** (2026-07-01) — v2's 2 tables are a **deliberately
> downgraded floor**, not the ceiling; this intake captures the fuller envisioned module. Boundaries are half
> pre-drawn: Knowledge names Skills a **consumer compound set**; **Health Disciplines bind a Skill**. `[FACT:
> _scope-reconciliation-v1.md L44-58; knowledge/contract.md L63; health/core Fork 4]`

## Current (enforced reality — the thin floor) `[FACT: ADR-002 §5.10 L2475-2520; learning.ts L173-192]`
- **`skills`** — `id` · `parent_skill_id` (self-hierarchy) · `name` **E** · `description` **E** · `mastery_level`
  P (novice/beginner/intermediate/advanced/expert/master) · `practice_hours` P (minutes) · `last_practiced` P ·
  `proficiency_test_score` P · timestamps · `deleted_at`.
- **`skill_resources`** — polymorphic junction, **`resource_type` CHECK ('course','book') only** · `resource_id`.
- **Zero service logic.** `entity_type` reserves `'skill'` in `entity_links`/`pages`. `[FACT: ADR-002 L1347]`

## Legacy (life-os v1 — also thin, context only)
Skills lived inside Learning: `SkillCard` · `SkillForm` · **`MasteryTimeline`** · SkillsPage · SkillDetailPage +
`skillsApi`. A skill with a mastery level, practice hours, resources, and a mastery-over-time timeline. Not
materially richer than v2. `[FACT: ../life-os/src/features/learning/{components/skills,pages}/]`

## Boundaries with documented foundations (compose, don't rebuild)
- **Knowledge** — Skills is a **consumer compound set**: a skill's learning/mastery composes Knowledge's generic
  engine (objects · methods · derived mastery). Retire the narrow `skill_resources` CHECK → `entity_links` (the
  call Knowledge already made for `resource_type`). `[FACT: knowledge/contract.md L63; business-rules.md L36]`
- **Health** — a **Discipline binds a Skill** (Muay-Thai technique = a Skill's progression). Health is a consumer. `[FACT: health/core Fork 4]`
- **Sessions & Scheduling** — skill **practice** = a `practice` session sub-type; practice_hours derive from logged
  sessions (not a hand-typed column). `[FACT: ADR-004]`
- **Purposes** — a skill goal (reach X mastery) ladders to a life Purpose (capstone). **Education/Languages** —
  also compose Skills (a course builds a skill; a language IS a skill family). `[INTENT]`

## Victor's Notion "Abilities" design (System 2.0, 5 databases) — a rich INTENT SOURCE (dated ~years; NOT the ceiling)
> ⚠ **FRAMING (Victor 2026-07-14):** this Notion is **information/context, not the core**. It was designed years
> ago, before the real-code structure; his intent has since **evolved** (new developments · improvements ·
> integrations · new features). It informs the spec — it does **not** dominate it. The **authoritative layer is
> Victor's CURRENT intent** (elicited below), synthesized with code (FACT) + v1 + this.
Source: Notion "System 2.0" → **Abilities Management** (`2167ba8dd1d4803baffed3c544faed3d`), fetched 2026-07-14 via
MCP. Enriches the thin "skills" floor (context, not replacement). **REFRAME (Victor 2026-07-14): the module KEEPS the name "Skills"**;
it adopts the **"Abilities" design** — a **universal, cross-domain capability-forging engine**; a **higher-order
module** (like Purposes) that links every life domain. `[FACT: 5 data sources]`

**5-layer structure: Ability → Levels → Activities → Actions → Development Tracker.**
- **`Abilities`** — the capability. `Domain` (Professional·Technical·Creative·Social·Mental·Physical) · `Current
  Level` (Foundational-Beginner→Beginner→Intermediate→Advanced→Master) · `Progress` (Not-Started→Honing) · Status ·
  Priority · Practice Frequency · Time Investment · Total Practice Time · Start/`Target Mastery Date` · **Why
  Important** · relations → **Levels · Projects · Targets · Physical-Roles-Activities · Development-Tracker**. Cross-
  domain + goal-driven.
- **`Ability's Levels`** — sequenced curriculum stage. `Sequence`(1-5) · **Completion Criteria** · **Success
  Indicators** · **Typical Challenges** · Key Skills · Duration Target(weeks) · Status(Upcoming/Active/Complete) ·
  → Parent Ability · Activities. A leveled path with objective+subjective advancement gates.
- **`Ability's Activities`** — per-level practice task (reusable). **`Type`** (Review·Assessment·Project·Study·
  **Practice**) · Difficulty · Duration · Frequency · Instructions · Prerequisites · Success Criteria · Materials ·
  Tips · Times Completed · → Level · Actions.
- **`Ability's Actions`** — scheduled/executed instance. Scheduled Date · **Best Time** (granular Morning…Night) ·
  Duration/Actual · Energy Required/After · Focus Required · **Quality** · Completed · → Activity.
- **`Ability's Development Tracker`** — reflective practice log. Session Date · Duration · **Progress Feeling**
  (Breakthrough·Fast·Steady·Slow·Stuck) · Focus/Motivation/Energy/Distractions · **What Worked Well** · **What to
  Improve** · **Next Session Plan** · Recovery Needed · Environment · Key Insights · → Ability · Activity.

**How it maps onto the OS (composes, doesn't rebuild).**
- **Actions → Sessions** (`practice` sub-type, scheduled via `dueIn()`); **Development Tracker → the session log +
  a reflective-practice pattern** (twin of Health's Adaptation engine). `[FACT ADR-004]`
- **Activity `Type` DISPATCHES to the right module:** Practice/Study → Sessions/Knowledge · **Project → Projects** ·
  Assessment/Review → Knowledge/review. `[INTENT]`
- **An ability's theory/mastery → a Knowledge compound set** (KN consumer). `[FACT knowledge/contract L63]`
- **Goal-driven → Purposes/Targets** (Target Mastery Date · Related Targets). **Cross-domain links → entity_links**
  to Health (Disciplines bind an Ability), Relationships, Finance, Projects, **Physical Roles** (a NEW module
  surfaced by System 2.0 — flag for scope-reconciliation). `[INTENT]`
- **Higher-order / cross-cutting** — references Projects·Targets·Physical-Roles·Health across domains → like
  Purposes, it sits ABOVE domain modules. Sequencing: CORE (Ability→Levels→Activities→Actions→Tracker) documentable
  now composing ✅ foundations; forward-dep STUBS: Purposes(#9)·Physical-Roles(new)·Health(✅ consumer). `[INTENT]`

> **⭐ Meta-discovery:** the Notion **"System 2.0"** page is Victor's whole-OS design (Routines·Duties·Habits·
> Obligations·Purpose·Targets·Projects·Physical Roles·Health·Abilities·Relationships·Financial·…). **Harvest it for
> every remaining module** (as done for Health + Abilities). Surfaced NEW modules to reconcile: **Physical Roles ·
> Obligations · Complementations**. `[FACT: System 2.0 page]`

## GAP MAP (Abilities — most of the spec is now the Notion design)
- [x] **SK1 — RESOLVED (Victor + Notion): module stays "Skills"; adopts the "Abilities" design** — a universal cross-domain capability-forging engine
      (Ability→Levels→Activities→Actions→Tracker), higher-order/cross-cutting, goal-driven, spanning Professional·
      Technical·Creative·Social·Mental·Physical. The 2-table v2 was the floor; the 5-DB Notion is the design.
- [x] **SK2 — Mastery = a LEVELED curriculum with gates (resolved by design).** Not a flat scale: each Skill has
      ordered **Levels** (`Sequence` 1-5) with **Completion Criteria + Success Indicators (objective+subjective) +
      Typical Challenges**; `Current Level` (Foundational-Beginner→Master) + `Progress` (Not-Started→Honing) are
      tracked/derived from level+activity completion. Levels are per-skill (user-definable curriculum). `[FACT Notion Levels]`
- [x] **SK3 — Decomposition = Levels → Activities → Actions (not sub-skill trees).** The progression structure IS
      the Level curriculum; `parent_skill_id` kept optional for grouping; related skills via **entity_links**. `[FACT Notion]`
- [x] **SK4 — Practice composes Sessions.** **Actions = scheduled `practice` Sessions** (ADR-004, `dueIn`);
      **Development Tracker = the practice log** (reflective: progress-feeling/focus/insights/next-plan); Total
      Practice Time **derived** from logged actions. `[FACT Notion Actions/Tracker; ADR-004]`
- [x] **SK5 — Knowledge composition CONFIRMED.** A skill's theory/content/mastery → a **Knowledge compound set**;
      Skills owns the *leveling · activities · doing · reflection · proficiency*. `[FACT knowledge/contract L63]`
- [x] **SK6 — Assessment/evidence = Activity Types + level gates.** `Activity.Type` includes **Assessment · Review
      · Project · Study · Practice**; level advancement is gated by **Completion Criteria + Success Indicators**;
      evidence/artifacts via **pages** + **Project-type activities** (→ Projects). `[FACT Notion Activities]`
- [x] **SK7 — Cross-domain links via entity_links; retire the narrow junction.** Consumed by **Health**
      (Disciplines bind a Skill), links **Projects · Targets/Purposes · Physical-Roles · Relationships · Finance ·
      Education · Languages** across the 6 Domains (Professional/Technical/Creative/Social/Mental/Physical).
      **Retire `skill_resources` CHECK('course','book') → entity_links.** `[FACT Notion relations; knowledge precedent]`
- [x] **SK8 — Spaces/pages/tags CONFIRMED.** Skill standalone pages + universal tags/Spaces; a Skill Space groups
      its Levels/Activities/practice-Sessions/Knowledge/evidence.

## Skills as an OS EXTENSION (the reshape)
**OWNS:** the capability-forging spine — `skills` (cross-domain, goal-driven, leveled) · `skill_levels` (sequenced
curriculum + gates) · `skill_activities` (typed practice tasks) · `skill_actions` (scheduled instances) ·
`skill_dev_logs` (reflective practice log). **COMPOSES:** Sessions (Actions=`practice` sub-type + scheduler;
Dev-log=session log) · Knowledge (theory compound set; Study/Assessment activities) · Projects (Project activities)
· Purposes/Targets (goal-driven mastery, capstone stub) · Notes&Pages/Spaces (pages·tags·evidence Blocks) ·
Preferences (units·toggle). **PROVIDES →** Journal (practice done) · Gamification (level-ups/streaks/mastery) ·
Purposes (skill-goal progress) · Health (Disciplines bind a Skill). **Higher-order/cross-cutting** (like Purposes)
but its CORE composes ✅ foundations → documentable now; STUBS: Purposes(#9)·Physical-Roles(new). `[INTENT reshape]`

### Spaces requirements (→ spaces.md accumulator)
Capability Blocks: **level/curriculum tree view · progress/mastery timeline · practice logger · reflective
dev-log · evidence/portfolio**. A skill = a Space; `Activity.Type` dispatches work to Sessions/Knowledge/Projects.

## Current / evolved intent — the AUTHORITATIVE layer (Victor 2026-07-14, co-created)
The years-old Notion is context; THIS is the module's real target. **Skills = a game/fiction-like growth engine
that produces real-life outcomes** — a digital planning/environment for deliberately forging oneself. `[INTENT Victor]`

- [x] **CI-1 — Configurable leveling + THREE-WAY FILL + locale-awareness.** Each skill defines its own progression
      ladder (belts/ranks/milestones/CEFR — data, not code; ship templates). The ladder/activity/definition info is
      filled **(a) manual · (b) LLM · (c) imported from our curated external Skill-DB** (opt-in, consent-gated —
      **extension-model**; the OS-core goal = facilitate the user's life). Definitions are **CONTEXT-VARIANT**
      (language · location · geography · culture — a martial art / a craft differs by place/school) → the library
      stores canonical defs **with locale variants**; graceful fallback when a skill isn't in our data (→ manual/
      AI/**community submission**). Mastery is **DERIVED (hybrid)** — from gates + activities + assessments + linked
      Knowledge mastery + practice consistency; manual override flagged. `[INTENT Victor CI-1]`
- [x] **CI-2 — the "Skill Composer" (state-of-art definition/integration layer).** Because measuring real-life
      abilities digitally is hard, the user CONFIGURES per skill: (a) what the skill IS · (b) **which OS components
      it interacts with** (the integration recipe — SUBSUMES cross-domain: chosen per skill) · (c) what's tracked ·
      (d) **how progress/mastery is truly defined**. **Two modes: Quick** (template + defaults, fast) **+ Advanced**
      (full custom) — first-class **UI/UX** for both. Reuses Spaces composability + Knowledge compound-set builder +
      Health metric/goal config. Plus the **dispatch model** (Activity.Type → Projects/Knowledge/Sessions/review),
      **Purposes laddering** (Target-Mastery = purpose target, auto-sourced metric), **Gamification** (level-ups/
      mastery/streaks = the OS's real leveling game). `[INTENT Victor CI-2]`
- [x] **CI-3 — the SKILL GRAPH (game/fiction, real dependencies).** A **global canonical skill graph** — a curated
      **~50+ skill library** with **real interlinked dependencies + shared foundational skills** (nodes many
      masteries require) = the "game world"; the user plays their character through it. Plus the **user's personal
      instance** (adopted skills + derived progress). "Mastery" has **real-world dependencies** (edges + external
      factors captured). Extensible by **AI · our additions · manual · community submission** (rare-not-found →
      submit). Real-life outcomes via **dispatch** to real modules. Rendered on the neural graph (a **Life Skill
      Tree** view). **⭐ Assistant build-ons (approved-pending):** the graph **recommends a path** ("to master X →
      A→B→C first") + **detects synergies** ("these goals share skill Y — level once, advance all") — serves the
      "shared skill patterns" insight. Plus: **mastery decay/maintenance** (advisory + per-skill configurable; SRS
      via Knowledge review-curve), **evidence/portfolio** (artifacts prove mastery), **insight-compounding** (dev-log
      Key Insights → a personal principles store, as Knowledge objects), the **reflective/Adaptation engine SHARED
      with Health** (one engine, N-of-1 experiments on your own learning), and a **"Becoming" identity view**
      (aggregate abilities × 6 domains → laddering to Purpose; full view built at capstone #9). `[INTENT Victor CI-3 + assistant]`
- [x] **CI-4 — Keep from v2 code:** `parent_skill_id` → the **skill-graph/tree** grouping; `proficiency_test_score`
      → generalize into **assessments/metrics**. `[INTENT]`

> **Big surfaced sub-systems (candidate ADRs / design-passes):** the **external Skill-DB + locale-variant model**
> (extension-model data source) · the **Skill Composer** (definition/measurement builder, Quick+Advanced) · the
> **global-vs-personal Skill Graph + community submission** · path-recommendation/synergy engine. All ZK; all
> AI/import/community = opt-in extension-model.

---
**STATUS: WHOLE (2026-07-14).** Sources synthesized (code + v1 + Notion-as-context) + **current-intent layer
co-created (CI-1..CI-4, authoritative)**. Module keeps name **Skills**, adopts+**evolves** the Abilities design into
a game-like, dependency-graphed, user-composable growth engine producing real-life outcomes. **Ready for TRANSFORM**
→ 5 aspect docs at `docs/features/skills/`.
