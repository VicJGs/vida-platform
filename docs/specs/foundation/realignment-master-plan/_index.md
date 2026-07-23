# Master Plan: Vida Platform Foundation-Realignment Campaign

**Type:** planning (foundation) — the master gating + phasing system for the whole realignment.
**Status:** APPROVED at gate 1 (2026-07-23, Victor). **Part 0 COMPLETE** (scenario + ratified `capability-framework.md`). **Part 1.0 COMPLETE** (legacy quarantine; CLAUDE.md foundation lock; definition-of-aligned → framework §5). **Part 1.1 COMPLETE** (staleness sweep: 10 stale / 7 gap / 7 aligned; As-is exemption ratified → §1.3). **Next: Part 1.2 doc re-runs — notes-and-pages FIRST** (in-degree-14 hub). Parts 2–3 forward-declared (own gate-1 later).
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
| 1.2 | **Doc re-runs** — re-run each stale context through the documentation-blueprint methodology (gap-Qs, ADR-grounding, capability coverage, fill by context/intent). Per-context LITE gate. Ordered by dependency: **Notes & Pages first** (in-degree-14 hub), then substrate feeders, then leaves. Docs may cite substrates + owning ADRs, NOT place them in code (boundary rule). | per-context LITE |
| 1.3 | **Architecture-doc realignment** — rewrite/refresh `docs/core/architecture/*` from the ADRs so the 5 substrate frameworks get a documented **conceptual** home (which framework/ADR owns them — NOT a directory; that's 2.0). | LITE |
| 1.4 | **Doc-tier cross-consistency** *(rescoped per B1)* — make the `[INTENT]` amendments consistent **across the 24 context docs** (entity_tags/sessions/measurability/economy referenced identically everywhere; no contradictions). **Explicitly does NOT** rewrite ADR-002 §5/§7/§8 from a consolidated schema — that is **DB-11's** job (ADR-016), out of scope here. | LITE |

**Exit gate:** `victor:quality-gate-foundation` + independent critic + Victor approval → Part 1 done.

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

---
*Gate 1: this revised plan is presented for Victor's approval. Not executed until approved.*
