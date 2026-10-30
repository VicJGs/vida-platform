<!-- Identity — features/skills · /documentation Phase 2 · Module keeps name "Skills". -->

# Identity — Skills (level: Feature / higher-order module; Wave R — recovered/reframe)

**What it is.** A **game-like growth engine that produces real-life outcomes** — the platform's system for
**deliberately forging capabilities** across the six domains (Professional · Technical · Creative · Social · Mental
· Physical). A Skill is a user-**composed** capability with its own configurable progression ladder, developed
through activities that **dispatch to the real OS modules**, tracked with **derived** mastery, and connected to
other skills in a **dependency Skill Graph** the user plays their "character" through. `[INTENT: Victor current-intent
2026-07-14; Notion "Abilities" design as context]`

**The desire behind it.** The user wants a **digital planning + growth environment** that turns into **real-world
mastery** — not a hobby checklist. "Mastery" has **real dependencies** (many skills share the same foundational
patterns; some require others first), so the module models those dependencies, helps chart the path, and makes the
daily work count by routing it into real Projects/Study/Practice. Fiction-like on the surface (levels, a tech-tree
of _yourself_), real underneath. `[INTENT Victor]`

**What it owns.** `[INTENT]`

- **Skills** — cross-domain, goal-driven capabilities (configurable ladder · derived level/progress · why-important
  · target-mastery · the **Skill Composer** config).
- **The Skill Composer** — the user-facing **definition/integration layer**: per skill, configure _what it is · which
  OS components it interacts with (the integration recipe) · what's tracked · how progress/mastery is measured_ (the
  measurement choice draws the ADR-011 **`measurement_kind`** taxonomy — esp. **`qualitative`** for abilities that
  can't be faked into a number; mastery is a **`derived-pull`** measure) — in **Quick** (template+defaults) or
  **Advanced** (full custom) mode. `[INTENT; ADR-011 M1/M2]`
- **Levels · Activities · Actions · Dev-logs** — the leveled curriculum (Notion spine), typed practice tasks,
  scheduled instances, and reflective practice logs.
- **The Skill Graph** — a **global canonical library (~50+ skills)** with **real interlinked dependencies + shared
  foundational skills**, plus the **user's personal instance**; **path-recommendation** + **synergy-detection**;
  community-extensible.
- **Definition Library** — canonical skill defs **with locale variants** (language/location/geography/culture),
  filled **manual · LLM · imported**: the **import** is a device-mediated **public-reference** fetch of the external
  Skill-DB (ADR-014 X1/X2 — on-device parse, server never a fetch proxy); the **LLM** draft is an ADR-015 model call
  in `on_device`/`cloud` modes (AI1, server-blind); community defs are pulled by **import** (fallback), never an in-OS
  submission. `[INTENT; ADR-014 X1/X2; ADR-015 AI1]`

**What it composes (borrows).** `[FACT reshape]`

- **Sessions** (Actions = `practice` sub-type + scheduler) · **Knowledge** (an ability's theory/mastery = a compound
  set; Study/Assessment activities; insights = objects) · **Projects** (Project-type activities) · **Purposes**
  (Target-Mastery laddering, capstone stub) · **Spaces** (tags/views/**Life Skill Tree** Block via the neural graph)
  · **Gamification** (level-ups/mastery/streaks emit `grant_currency(XP)`, E2) · the **reflective/Adaptation engine SHARED with Health** (one
  engine; N-of-1 experiments on your own learning).

**What it is NOT.**

- **Not a session engine / not the metric owner** — practice = Sessions; mastery = derived (Core-style metrics). `[FACT]`
- **Not a fixed universal scale** — each skill defines its own ladder (belts/ranks/milestones/CEFR). `[INTENT CI-1]`
- **Not an island** — the _work_ lives in Projects/Knowledge/Sessions via the dispatch model; Skills orchestrates. `[INTENT CI-2]`
- **Not a warden, not an external service** — AI-draft · external Skill-DB import · **user-sovereign template export**
  (X4 egress — the only community bridge per SK-3; never an in-OS submission pipeline) are **opt-in extension-model**;
  decay is advisory; the user is sovereign. `[FACT ZK-1/SU-1; ADR-014 X4; extension-model]`

## Completion checklist

- [x] what/desire/owns/composes/NOT · [x] [FACT/INTENT] labels · [x] no `{{…}}`
