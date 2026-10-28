<!-- Identity — features/purposes-and-goals · /documentation Phase 2 · sources: ADR-002 §5.7 L1789-1953 · project.ts L109-256 · CLAUDE.md §9 · docs/intake/purposes-and-goals.md (PG1 + RESOLUTION) -->

# Identity — Purposes & Goals (level: Feature — CAPSTONE / higher-order)

**What it is.** The **meaning-spine** of the OS — its **directional plane**. Where every other module measures _what
happened_ and _what's due_, Purposes & Goals answers _where is my life going, and does my work ladder up to it._ It
is the **strategic aggregation layer**: a `Values → Purposes → Targets` spine into which any measured thing across
the OS can contribute progress. `[FACT: CLAUDE.md §9; ADR-002 §5.7]` `[INTENT: PG1 RESOLVED — Victor]`

**The desire behind it.** This is the **oldest idea in the platform** (the v0 Notion) and was always meant to be the
core; it failed in v0/v1 only for lack of the personalization + organization machinery Waves 0-2 have since built
(provider seams, the `entity_links` graph, derived progress, scoped tags). Its job: let the user **see the sides
(domains) of their life and how they steer each**, make the **upcoming seasons visibly driven by core beliefs +
purpose**, and keep the granular daily work **tethered to the end goal**. It carries a full lifecycle — **envision →
plan → act → (even) FAIL → document the failure → reshape → advance** — where failure is a first-class, documented
step that feeds back into the plan; goals accumulate into a reached purpose over time. "Ground zero to the max — the
only module that shapes the whole OS." `[INTENT: PG1 — Victor]`

**Scope — the capstone reframe (NOT the schema-only v2 floor).** `[INTENT: RESOLUTION]`

- **Values are first-class** (core beliefs) above Purposes: `Values → Purposes → Targets`; **every joint is optional**
  (standalone Values/Purposes/Targets/Dreams — SR-003 relaxed). `[INTENT PG4/PG9]`
- **Universal measurability:** every _pursuable_ entity exposes a normalized `progress ∈ [0,1]` via a
  `measurement_kind` (SOLID: quantitative/milestone/rate · ABSTRACT: qualitative). Nothing is unmeasurable — the OS
  is a **digital measurement layer over real life**. This contract is **core-owned** (the capstone ADR), _consumed_
  here — Purpose is its **rollup apex**, not its owner. `[INTENT PG2/PG3]`
- **Bindings** let a measurable auto-update (`binding_mode`: manual · derived-pull · event-trigger), riding the
  existing `INT-2` effect rail — e.g. an expense reconciled `paid` auto-completes its task, which advances its dream.
  `[INTENT PG6/PG7]`
- **Contributions** are the first-class **weighted-laddering edge** (Purpose-domain machinery) from any
  habit/routine/project/task/dream/finance-target/check-in into a goal. `[INTENT PG7]`
- **Reviews** (target + restored purpose-level) fire as `review` sessions; Purpose **registers as a provider**
  (`summary`/`dueIn`) into Journals + the Global Calendar. Dreams sit **beside** as the aspiration entity. `[INTENT
PG3/PG9/PG10]`

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules; docs/features/*]`

- **Not the operational plane.** _What happened / what's due_ (horizontal, time-based) is **Journals + Global
  Calendar**. Purpose is the **vertical, meaning-based** axis. Same provider seam, orthogonal axis → never merged.
  `[INTENT PG1]`
- **Not the measurability-contract owner.** `measurement_kind`/`binding_mode`/`progress()` are a **core cross-cutting**
  contract (the capstone ADR) landing on every pursuable module; Purpose consumes + rolls up. `[INTENT PG2]`
- **Not a task/project system.** A goal decomposes by _linking_ **Tasks** (+ sub-tasks) and **Projects › Milestones ›
  Deliverables**; `plan_steps` are a doc layer, not tracked entities. Purpose owns none of the action machinery.
  `[INTENT PG5; FACT: F2/D2]`
- **Not an automation engine.** Bindings ride the `INT-2` single-write-path; Purpose invents no event bus. `[FACT:
core INT-2]`
- **Not a Spaces association-primitive owner.** `contributions` is domain-local; the universal `entity_links`
  (reference) + `entity_tags` (grouping) are owned by the **Spaces tier** (INT-1a). `[FACT: core INT-1a]`
- **Not a reminder engine.** Review scheduling/notification is the **Scheduler** (`review` sessions + `dueIn`), not a
  Purpose-local reminder. `[INTENT PG9; FACT: ADR-004]`
- **Not the Bucket List "module."** "Bucket List" is a **Space over `dreams`** (a `#before-i-die` tag + vision-board
  view); the single aspiration entity is `dreams`. `[FACT: PG8 RESOLVED]`
- **Not a notes store / not Gamification.** Notes live in `pages`; goal/purpose completion **feeds** XP/achievements,
  Purpose never writes them. `[FACT: DATA-3; CLAUDE.md Gamification]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` remaining · [x] capstone role + two-plane distinction stated
