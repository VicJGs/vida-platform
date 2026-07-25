# Master Plan: Vida Platform Foundation-Realignment Campaign

**Type:** planning (foundation) — the master gating + phasing system for the whole realignment.
**Status:** ✅ **PART 1 COMPLETE — EXIT GATE ACCEPTED (2026-07-25, Victor).** Part 0 + Parts 1.0/1.1/1.2/1.3/1.4 all done; the Part-1 exit gate ran both lenses (foundation quality-gate + independent adversarial critics over the whole corpus) → verdict REVISE (1 blocker: `preferences` never re-run — sweep row-24 mis-triaged "aligned"→ actually stale-by-omission on E9/N6/N7 + ADR-014 Layer-3) → fixed (preferences Tier-2 re-run, LITE-gated: plan SHIP + post-impl SHIP; knowledge SP1 fill; gamification PII half-line; cosmetics) → re-verified: **34/34 docs aligned, corpus-wide zero forward-stale confirmed, cross-consistency AGREE**. **Next: Part 2 (repository structure) — forward-declared, earns its own gate-1.** Part 3 (build roadmap) after Part 2 exits.
**Date:** 2026-07-23  ·  **Session:** build-roadmap-resequence (reframed as this campaign; the roadmap resequence becomes Part 3)
**Grounded in:** `docs/specs/foundation/current-state-baseline/baseline.md` (the ground-truth input).
**Critique:** independent adversarial pass logged blocking B1–B4 + N1–N4; all incorporated in this revision (see Change Log).
**No-Guessing:** assumptions labeled [ASSUMPTION]/[UNKNOWN]; the plan fills gaps by context (docs/ADRs) or Victor's explicit intent, never by guess.

---

## Scope of THIS gate-1 approval (umbrella framing — per critique N2)

This plan fully gates **Part 0 + Part 1** in detail. **Parts 2 and 3 are FORWARD-DECLARATIONS** — their detail genuinely depends on Part 1's output (you cannot design a substrate's code home before the arch-doc realignment says which framework owns it), so **each is re-planned through its own gate-1 after the prior part exits.** Approving this plan approves the campaign *spine* + Parts 0–1 concretely; it does **not** approve Part 2's "likely ADR-018" or Part 3's structure sight-unseen.

---

## Done when (campaign end state)

The platform's **documentation, repository structure, and build roadmap are mutually coherent and derived from the established foundation** (ADRs 001–017 + the capability framework):
(a) every documented context is aligned — divergence resolved, stale docs re-run, gaps filled by context or intent;
(b) the repository structure is derived from those docs, with every stale file/dir organized or quarantined;
(c) a features-first build roadmap exists off that sound foundation, with the first deliverable, delivery path, and goals set and gated.

**This does NOT include:** building any feature/screen/engine; authoring schema tables (DB-3/DB-4); the ADR-002 §5/§7/§8 **schema-level** reconciliation (owned by **DB-11** per ADR-016 — a build-phase task); or the encryption/sync/auth hardening pass (ADR-017).

---

## The documented-context surface (precise scope — per critique B2)

[FACT: file census] The docs are **22 feature directories** → **24 `structure-data.md` files** (the extra 2 from sub-contexts: `finance/fiscal-legal`, `health/{core,nutrition,training}`, `knowledge/flashcards`, `learning/education`), and **each context carries 5 aspect files** (`identity`, `contract`, `conventions`, `business-rules`, `structure-data`) → **~120 aspect files** total, plus the 8 `docs/core/architecture/*` docs.

- **Count reconciliation:** ADR-002 §5.20 still says "19" (stale); true `structure-data` count is **24**. The 19→24 schema-level fix is **owed to DB-11, not this campaign** (per ADR-016).
- **Re-run granularity (locked):** the unit of re-run is the **context** (24 of them). `structure-data.md` is the spine; sibling aspects (`business-rules`, `contract`, `conventions`, `identity`) are updated **only where a driver touches them**. R1 is sized against these 24 units / up to ~120 aspect files.

---

## The gating + phasing system (the reusable framework)

- The campaign runs as **3 sequential PARTS**; each PART is a set of PHASES with an entry condition and an exit gate.
- **Foundation-first sequencing (hard):** Part 2 does not start until Part 1 exits; Part 3 does not start until Part 2 exits. You cannot derive structure from stale docs, nor sequence a build on an unset structure.
- **Every unit inside a part runs the §XXVI Per-Step Build Gate** — doc units use the **LITE** variant (short PLAN → critique → approval); structural/code units use the **full double-gate**.
- **Each PART (and Part 0's foundation reference) exits through:** domain quality-gate + an **independent adversarial /critique** (fresh subagent) + **Victor approval**. No part closes on self-review.
- **The Part-1/Part-2 boundary rule (per critique N3/N4):** in Part 1, docs may **cite** a substrate primitive and its **owning ADR** (the *conceptual* home — which framework/ADR owns it); they may **NOT** decide its **code/directory** home — that is Part 2.0. This keeps doc re-runs from silently making structural calls and defeating the foundation-first order.

### The capability-framework coverage rule (Part 1's core mechanic — made enforceable per critique B4)

The rule measures every context against the ADR-mandated capabilities. To be *testable* rather than aspirational, Part 0 produces the framework as a **gated deliverable** where each capability has a **mechanical presence/absence predicate**, e.g.:
- *Tagging* → the doc names `entity_tags` (ADR-006), not the retired `page_tags`. (grep-checkable.)
- *Measurability* → if the module is in ADR-011's measurable set, its doc carries `measurement_kind` + `binding_mode`. (grep-checkable.)
- *Sessions* → if the module has timed/scheduled activity, it references the `sessions` supertype (ADR-004), not a flat table.
- *Economy* → if the module is an ADR-012 `grant_currency` feeder, its doc names the effect + currency it emits.
- *Structure/phasing* → the doc carries the two-tier **As-is (FACT floor) / Intended** split.

A failed predicate = a **gap**, filled by context (docs/ADRs) or by Victor's explicit intent. Coverage = every applicable predicate passes.

---

## Part 0 — Formalize the scenario + build the foundation reference (setup, GATED — per critique N1)

- Scaffold a new **project-foundation scenario** (`/new-scenario`) capturing this gating+phasing methodology, with its description/observation.
- **Deliverable (gated):** `docs/specs/foundation/capability-framework.md` — enumerates every capability from ADRs 004–015, each with its testable presence predicate + which modules it applies to. **Acceptance:** every ADR 004–015 capability appears with ≥1 mechanical predicate and an applies-to list. **Gate:** LITE (critique + approval) — this is the most load-bearing artifact; Part 1 inherits any error in it.
- [ASSUMPTION] Scenario name: `documentation-realignment` (docs-focused, matching your "project-foundation and documentation" framing). Alt: `foundation-realignment` if it should cover all 3 parts.

## PART 1 — Documentation realignment  ⟵ PRIORITY (fully gated by this plan)

**Done when:** all 24 documented contexts + `docs/core/architecture/*` pass the **definition of aligned** (below); divergence resolved; every gap filled or explicitly marked owed-to-intent.

**Definition of "aligned" (the gate predicate — per critique B3), per context:**

> **RATIFIED 2026-07-23 (Part 1.0):** the canonical, mechanical form of this predicate is **`capability-framework.md` §5**
> (each line carries its capability ID + anti-signal). The checklist below is the original sketch; where they differ,
> **framework §5 governs.** The Part 1.1 sweep runs framework §5 + the §3 predicates.

- [ ] Tagging model = `entity_tags` (ADR-006), not `page_tags`.
- [ ] Carries `measurement_kind`/`binding_mode` iff it's an ADR-011 measurable.
- [ ] Timed/scheduled activity references the ADR-004 `sessions` supertype.
- [ ] If an ADR-012 feeder, names its emitted effect + currency.
- [ ] Carries the two-tier As-is (FACT floor) / Intended split + names the ADRs it's subject to (004/006/008/011/012 as applicable).
- [ ] No claim contradicts any ADR 001–017.

| Phase | Work | Gate |
|-------|------|------|
| 1.0 ✅ | **Legacy quarantine + foundation lock** — DONE 2026-07-23: 4 legacy files → `docs/_legacy/` (+README); CLAUDE.md foundation-locked (Reference section repointed to ADR-001–017 + framework; Data-Domains retired tokens fixed: `page_tags`→`entity_tags`, `flashcard_*`→review engine, `xp_history`→`consequence_ledger`, `purpose_*` junctions→`contributions`, `pomodoro_sessions`→`sessions`); definition-of-aligned ratified → framework §5. (ADR-path drift did not reproduce — already correct.) | LITE ✅ |
| 1.1 ✅ | **Staleness sweep** — DONE 2026-07-23 (`docs/specs/foundation/staleness-sweep.md`): 5-agent scoring of all 24 contexts + 8 arch docs. Result: **10 stale / 7 gap / 7 aligned** (contexts); 4 stale / 4 partial (arch). Surfaced + ratified the **As-is exemption** (F1 → framework §1.3). Carries the Part 1.2 dependency-first re-run ordering. | analysis, persisted ✅ |
| 1.2 | **Doc re-runs** — re-run each stale context through the documentation-blueprint methodology (gap-Qs, ADR-grounding, capability coverage, fill by context/intent). Per-context LITE gate. Ordered by dependency: **Notes & Pages first** (in-degree-14 hub), then substrate feeders, then leaves. Docs may cite substrates + owning ADRs, NOT place them in code (boundary rule). **IN PROGRESS:** ✅ notes-and-pages (Tier 0 hub) done 2026-07-23 (`part-1.2-reruns/notes-and-pages.md`; SP1/SP2/SP3/SP4 + S1 retired). ✅ **sessions-and-scheduling (Tier 1) done 2026-07-23** (`part-1.2-reruns/sessions-and-scheduling.md`; **gap** re-run — added S4 catalogue + S5 lifecycle enum + R1 idempotency rail `effect_event_id`/`applied_effects`/`UNIQUE` to the effect foundation; retired a forward `xp_history` regression → `consequence_ledger`; critique SHIP). ✅ **projects (Tier 1) done 2026-07-23** (`part-1.2-reruns/projects.md`; **stale** wrong-model, drivers 011/014/015 — the mixed case: decomposed bespoke `measurement_type` → `measurement_kind` (M1) × `binding_mode` (M2) × M5/R7 source-seam; `progress 0-100 NOT NULL` → nullable override `NULL ⇒ derive`+`progress()` (M3); per-child + `contributions` rollup (M4); retired `purpose_projects`→`contributions` while KEEPING `project_habits` (M7/C1); named ADR-014 X1/X5 + ADR-015 AI1/AI4/AI6 consumer contracts; investigation reframe (C3); `entity_tags` (C2). All 5 aspects; critique SHIP). ✅ **health/core (Tier 1) done 2026-07-24** (`part-1.2-reruns/health-core.md`; **stale** wrong-model, drivers 011/006/014/015 — the mixed case + the cleaner-R6 sibling of projects: decomposed bespoke `health_goals.type` → `measurement_kind` (M1) × `binding_mode` (M2) × the existing `metric_id`/`role_id` M5-seam subject; `progress`/`mastery` → nullable override `NULL ⇒ derive` (M3); role `mastery` = per-child weighted rollup (M4); named the M5 measure read-seam, `entity_tags`+open registry (SP1/SP2), X1/X2/**X4 egress**/X5/X8 (ADR-014), AI1/AI3/AI5/AI6+`source=ai` (ADR-015). **No As-is floor** — recovered domain, no v2 schema (code-grep confirmed). Guards: `physical_roles.type`/`health_metrics.kind` kept (C1/C2); economy out of scope (C3, rides Sessions S4). Critique SHIP → 3 notes folded). ✅ **habits (Tier 1) done 2026-07-24** (`part-1.2-reruns/habits.md`; **stale** wrong-model, drivers 011/012/006/004 — the mixed case **with a real As-is FACT floor** (live schema, opposite of health/core): three live-FACT retirements — `purpose_habits`→`contributions` (M7), `page_tags`/inline `habits.tags`→`entity_tags` (SP1), `xp_history`→`consequence_ledger` (E3) — under R6 two-tier + gap-adds M1/M2 (habit-pursuable, new HB-13), E2 `grant_currency`/S4 `award_xp`, S4/R1/R2 completion effect rails, M4/M5. Economy IN scope (012 driver). Guards: `project_habits` KEPT (C1), inline tags = As-is (C2), streak cache already M3-aligned (C3), no X*/AI\* (C4). Critique **REVISE→fixed** — the 1 blocking item was `grant_currency` mis-placed in the ADR-004 S4 catalogue (member is `award_xp`; grant_currency = ADR-012 E2 generalization) → corrected at all 6 occurrences + 3 notes folded). All five LITE gates passed. Next: Tier 1 — `finance`. | per-context LITE |
| 1.3 | **Architecture-doc realignment** — rewrite/refresh `docs/core/architecture/*` from the ADRs so the 5 substrate frameworks get a documented **conceptual** home (which framework/ADR owns them — NOT a directory; that's 2.0). | LITE |
| 1.4 | **Doc-tier cross-consistency** *(rescoped per B1)* — make the `[INTENT]` amendments consistent **across the 24 context docs** (entity_tags/sessions/measurability/economy referenced identically everywhere; no contradictions). **Explicitly does NOT** rewrite ADR-002 §5/§7/§8 from a consolidated schema — that is **DB-11's** job (ADR-016), out of scope here. | LITE |

**Exit gate:** ✅ PASSED (2026-07-25) — `victor:quality-gate-foundation` + 6 independent adversarial critics (per-cluster, live-doc audit) + Victor acceptance. REVISE→fixed→re-verified; 34/34 aligned, zero forward-stale. Part 1 done.

## PART 2 — Repository structure from documentation  *(FORWARD-DECLARATION — re-planned via its own gate-1 after Part 1 exits)*

**Intent (not yet detailed):** derive the target repo structure from the realigned docs (package boundaries; `core/src` homes for sessions/spaces/capability/measurability/economy; `schema/` organization; models/services; apps); produce a disposition ledger for every censused file/dir (keep/migrate/quarantine/delete); execute the reorganization (quarantine legacy → `Old/_legacy`, stand up the correctly-shaped skeleton, unwire the v1 `schema.ts` monolith). Structure only — no feature code. **Likely ADR-018** (retire Phase-0 architecture; re-derive from docs). Full double-gate per unit; exit gate + approval.

## PART 3 — Build Roadmap  *(FORWARD-DECLARATION — the original `build-roadmap-resequence`, re-planned via its own gate-1 after Part 2 exits)*

**Intent (not yet detailed):** rewrite `docs/roadmap.md` features-first off the realigned docs+structure — capture build intent (first deliverable + [RP] + goals), dependency map + cluster decomposition, write roadmap, foundation gate + independent critic, projectize + gated `/track-sync`. Exit gate → campaign done.

---

## Assumptions (to correct at approval — gate 1)

- [UNKNOWN — confirm] **"RP to deliver"** — I read it as the concrete release/product shipped as the first deliverable (the web-SPA tester vehicle per ADR-017). I don't know what "RP" abbreviates. Non-blocking for gate 1 (it lands in Part 3.0); confirm when convenient.
- [ASSUMPTION] Scenario name `documentation-realignment`, scoped to Part 1's methodology; Parts 2–3 reuse existing scenarios (default / build-roadmap).
- [ASSUMPTION] The container becomes this **master campaign**; `build-roadmap-resequence` is reframed as Part 3 (task/tracker reframe deferred until this plan is approved — no churn before approval).
- [ASSUMPTION] `docs/core/architecture/*` realignment (conceptual homes) lives in Part 1; directory/code homes live in Part 2.

## Risks

- **R1 — Scope in Part 1.2** (up to 24 contexts / ~120 aspect files). Mitigate: Phase 1.1 triage gates *which* contexts actually need re-runs against the mechanical predicates; aligned contexts pass untouched.
- **R2 — Re-runs surface NEW architectural decisions** (as Tasks did). Mitigate: each becomes an ADR via the per-context gate; never absorbed silently.
- **R3 — Part 2 structure churn if Part 1 wasn't truly complete.** Mitigate: hard exit gate on Part 1; Part 2 cannot start early; Part 2 is re-planned fresh.
- **R4 — Unwiring the v1 schema breaks the (already-dead) web-adapter path.** Low blast radius (0 importers today); handled in Part 2.
- **R5 — Doc re-runs silently make structural calls** (the Part-1/Part-2 leak). Mitigate: the boundary rule (cite conceptual home + ADR, never place code home) applied in 1.2 + 1.3.

## Out of scope

- Building any feature, screen, or engine.
- Authoring schema tables (DB-3/DB-4).
- The **ADR-002 §5/§7/§8 schema-level reconciliation** (owned by DB-11 — ADR-016).
- Detailed planning of Parts 2–3 (forward-declared; each earns its own gate-1 later).
- The encryption/sync/auth hardening pass (ADR-017).
- Any tracker restructure before this plan is approved.

## Change Log
| Date | Change |
|------|--------|
| 2026-07-23 | Initial draft. |
| 2026-07-23 | Critique REVISE incorporated: B1 (1.4 rescoped, DB-11 reconciliation → out-of-scope), B2 (count precision + re-run granularity), B3 (definition-of-aligned checklist), B4 (capability-framework as gated Part-0 deliverable + mechanical predicates), N1 (Part 0 gated), N2 (umbrella framing; Parts 2–3 forward-declared), N3/N4 (Part-1/Part-2 boundary rule + R5). |
| 2026-07-23 | **APPROVED at gate 1 by Victor.** Part 0 authorized to execute next session. Scenario-name assumption `documentation-realignment` stands (unconfirmed); "RP" still [UNKNOWN] (deferred to Part 3.0). |
| 2026-07-23 | **Part 0 COMPLETE** — scenario `documentation-realignment` scaffolded (name confirmed by Victor); `capability-framework.md` authored (85 caps from ADRs 004–015), independent critique REVISE→fixed, RATIFIED (LITE gate). |
| 2026-07-23 | **Part 1.0 COMPLETE** — legacy quarantine (`docs/_legacy/` + README, 4 files), CLAUDE.md foundation lock, definition-of-aligned ratified → framework §5. LITE gate: plan approved by Victor. Next: Part 1.1 staleness sweep. |
| 2026-07-23 | **Part 1.1 COMPLETE** — 5-agent staleness sweep (`staleness-sweep.md`): 10 stale / 7 gap / 7 aligned (contexts), 4 stale / 4 partial (arch). Surfaced the **As-is exemption** (retired token in a flagged As-is floor that [INTENT] retires ≠ stale) → confirmed by Victor → codified into framework §1.3 (moved purposes/gamification/knowledge stale→aligned). Part 1.2 re-run order set. Next: Part 1.2 doc re-runs, notes-and-pages first. |
| 2026-07-23 | **Part 1.2 — notes-and-pages (Tier 0 hub) re-run DONE** (`part-1.2-reruns/notes-and-pages.md`; **stale** wrong-model): imposed R6 two-tier; retired SP1 `page_tags`→`entity_tags`, SP2 `entity_type CHECK(33)`→open registry, SP3 `parent_tag_id`, SP4, S1 pomodoro→`focus_sessions`/`session_id`. Critique REVISE→fixed→approved. |
| 2026-07-23 | **Part 1.2 — sessions-and-scheduling (Tier 1) re-run DONE** (`part-1.2-reruns/sessions-and-scheduling.md`; **gap**, drivers 004/002). Additions-not-retirements: named the S4 effect catalogue + S5 lifecycle `status` enum on the schema spine, and added the R1 idempotency rail (`effect_event_id` + `UNIQUE` + `applied_effects` ledger) to the effect foundation many modules ride. Grounding refined the sweep (which scored only structure-data): S4/S5 already present in sibling aspects; R1 was the genuine gap. Two flagged corrections: retired a forward `xp_history` regression (contract L49 → `consequence_ledger`, ADR-012) and fixed capability-ID label drift. Independent critique **SHIP** / 0 blocking → 3 cite notes folded → Victor approved. Next: Tier 1 — `projects`, `health/core`, `habits`, `finance`. |
| 2026-07-23 | **Part 1.2 — projects (Tier 1) re-run DONE** (`part-1.2-reruns/projects.md`; **stale** wrong-model, drivers 011/014/015 — the **mixed case**: both wrong-model reframes AND gap-adds). Grounding refined the sweep (which scored only structure-data): the wrong-model token `measurement_type` threads through all 5 aspects. Core reframe = **decompose the bespoke `measurement_type` enum → the framework's orthogonal axes** `measurement_kind` (M1, shape) × `binding_mode` (M2, binding) × M5/R7 source-seam — the load-bearing call the critic scrutinized hardest and confirmed faithful (not the deferred design pass). Also: `progress 0-100 NOT NULL` → nullable override `NULL ⇒ derive`+`progress()` (M3, R6 two-tier — As-is FACT kept); per-child + `contributions` weighted rollup (M4); retired `purpose_projects`→`contributions` while KEEPING `project_habits` (M7/**C1 guard** — only the `purpose_*` trio is retired). Gap-adds: named the ADR-014 (X1 device-mediated/X5 `external_in_ok`) + ADR-015 (AI1 modes/AI4 envelope/AI6 `source=ai`) consumer contracts — cite-not-re-spec. Flagged: C3 investigation `measurement_type='artifact'`→`measurement_kind='milestone'`; C2 optional `entity_tags` (SP1) named. Independent adversarial critique **SHIP** / 0 blocking (full citation-verification ledger against ADR-011/014/015 + neighbor Purpose + CLAUDE.md) → 2 cite notes folded → Victor approved. Acceptance grep-verified across all 5 aspects. Next: Tier 1 — `health/core`, `habits`, `finance`. |
| 2026-07-24 | **Part 1.2 — health/core (Tier 1) re-run DONE** (`part-1.2-reruns/health-core.md`; **stale** wrong-model, drivers 011/006/014/015 — the **mixed case**, closest sibling to `projects`). Grounding refined the sweep (which scored only structure-data): the wrong-model goal-`type` token + derived-but-unslotted `progress`/`mastery` thread through all 5 aspects. Core reframe = **decompose the bespoke `health_goals.type` enum → the framework axes** `measurement_kind` (M1) × `binding_mode` (M2) × the **existing** `metric_id`/`role_id` M5-seam subject (no information lost — the enum carried three axes in one column). Also: `progress`/`mastery` → nullable override `NULL ⇒ derive`+`progress()`/`deriveMastery()` (M3); role `mastery` = per-child weighted rollup, up-ladder → `contributions` Purposes-owned (M4, N1-fold). Gap-adds (name-the-contract): M5 measure read-seam (R7); `entity_tags`+open taggable-type registry (SP1/SP2, ADR-006); X1/X2/**X4 egress**/X5/X8 (ADR-014 — Health is the framework's named egress example: medical OUTPUT); AI1/AI3/AI5/AI6+`source=ai` (ADR-015). **The one way this is LIGHTER than projects: no As-is FACT floor** — Health is a recovered domain with **no v2 schema** (critic grep-confirmed no `health_*` in `packages/`+`apps/`; `project.ts` exists, which is why projects had a live floor), so every edit is a clean in-place `[INTENT]` correction. Guards held: `physical_roles.type` (modality) + `health_metrics.kind` (taxonomy) kept, NOT decomposed (C1/C2); economy/E2 out of scope (C3 — not a row-19 driver; Health feeds XP via Sessions' S4 `award_xp`, already reframed). Independent adversarial critique **SHIP** / 0 blocking (full code-verified citation ledger — every §-pin exact incl. M2 §3.5 "kept-distinct-from-source" blessing, M5 §3.6 `body_weight←Health`, X4 §3.3 "Health CI-6 medical push", AI5 §3.4b) → 3 non-blocking notes folded (N1 added light M4 for role mastery; N2 literal-vs-prose `type`; N3 AI5 `[INTERP]` membership) → Victor approved. Acceptance grep-verified across all 5 aspects. Next: Tier 1 — `habits`, `finance`. |
| 2026-07-24 | **Part 1.2 — habits (Tier 1) re-run DONE** (`part-1.2-reruns/habits.md`; **stale** wrong-model, drivers 011/012/006/004 — the **mixed case with a real As-is FACT floor**, the inverse of health/core on R6). Grounding + a **live-schema grep** established the floor: `habits`/`habit_completions` + the retired `purpose_habits` (`schema.ts:413`), `page_tags` (`:121`), `xp_history` (`:1213`), and the kept `project_habits` (`:437`) are all live FACTs → every retirement is a genuine two-tier As-is→`[INTENT]` split (the projects R6 pattern). **Three live-FACT retirements:** `purpose_habits`→`contributions` (M7), `page_tags`+inline `habits.tags`→`entity_tags` (SP1 — resolved the "not yet decided" tag direction), `xp_history`→`consequence_ledger` (E3). **Gap-adds:** M1/M2 (the habit is a pursuable → `measurement_kind`=`rate`+`binding_mode`, new invariant HB-13 — pure add, no bespoke `target_type` to decompose), E2 `grant_currency(XP)` feeder, the completion's S4 effect rails (`complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp` + R1 idempotency + R2 guarded-write — the 004 driver), M4 weighted contribution, M5 `streak(habit)` seam. **Economy IS in scope** here (012 is a driver — opposite of health/core's C3). No X*/AI\* (C4). Guards: `project_habits` KEPT (C1 — only the `purpose_*` trio retires), inline `habits.tags` = As-is floor not pretended-migrated (C2), streak cache already M3-aligned — no forced nullable-override, habits has no stored `progress` col (C3). Independent adversarial critique (code-aware) → **REVISE**, 1 blocking → fixed: `grant_currency` had been mis-listed inside the **ADR-004 §3.2.2 S4 catalogue** where the member is **`award_xp`** (`grant_currency` = the ADR-012 E2 generalization) — the exact two-layer distinction the sessions-and-scheduling PLAN set; corrected at all 6 occurrences + 3 notes folded (N1 `unit` in R3 list, N2 G-M7 = anti-signal-retirement not M7-ownership, N3 N\*/E1/E4/E5 deferred-not-missed). Acceptance grep-verified across all 5 aspects (zero forward `purpose_habits`/`xp_history`). Next: Tier 1 — `finance` (last live wrong-model/economy unit before the Tier-1 forward-facing group). |
| 2026-07-25 | **Parts 1.2 (rest) + 1.3 + 1.4 DONE** — Part 1.2 completed the remaining Tier-1/Tier-2 units (finance, tasks, relationships, pomodoro, knowledge/flashcards; learning-education, books, skills, check-ins, finance/fiscal-legal, health/nutrition, routines) = **17 re-run units total**, each LITE-gated critique-clean. Part 1.3 realigned all 8 `docs/core/architecture/*` (4 rewritten · 2 surgical · 2 low-touch; `part-1.3-arch-docs.md`). Part 1.4 cross-consistency folded into the exit gate. |
| 2026-07-25 | **PART 1 EXIT GATE — REVISE→ACCEPTED.** Two lenses over the whole corpus (24 context + 8 arch docs + framework): `victor:quality-gate-foundation` + 6 independent adversarial critics (per-cluster, auditing the LIVE docs not the re-run records). **1 blocker:** `preferences` was mis-triaged **aligned** by the Part-1.1 sweep (row 24) but had **never been re-run** (pre-campaign mtime) — stale-by-omission on E9 (`user_profile` split, the owed ADR-012 §3.10 receiving amendment), N6 (channel matrix, no `sms`), N7 (quiet-hours pre-applied at registration), and the ADR-014 §3.2 Layer-3 user-managed integration surface; two owners (gamification GM-12, check-ins CK-11) delegated fields to a Preferences that never claimed them. **Fix (LITE-gated):** preferences Tier-2 re-run across all 5 aspects (plan critique SHIP → implement → post-impl critique SHIP; PR-1 plaintext guard held, PII + `focus_areas[E]` excluded, cross-consistency AGREE); `knowledge` owed SP1 `entity_tags` fill (5 sites); `gamification` PII half-line reconciled to GM-12; cosmetics (projects prose, cross-module-integration §1 review-engine row, 4 record headers). **Re-verified: 34/34 docs aligned; corpus-wide forward-anti-signal sweep = zero forward-stale (every retired-token hit is As-is-floor / negation / retire-reframe / security-model §8 v1-banner).** **R2 check:** no new architectural decision surfaced — preferences RECEIVED existing ADR-012/013/014 decisions; storage shape + `active_modules`↔`module_visibility` merge deferred to build-phase (ADR-002 §5.20). No `/adr-new` owed. **Victor ACCEPTED Part 1 (2026-07-25).** Next: Part 2 (repository structure) — forward-declared, own gate-1. |

---
*Part 1 exit gate: ACCEPTED by Victor 2026-07-25. Part 2 is re-planned through its own gate-1 before execution.*
