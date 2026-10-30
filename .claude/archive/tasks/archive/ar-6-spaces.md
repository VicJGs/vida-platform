# Task: ar-6-spaces
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/foundation/ar-6-spaces/_index.md
# Created: 2026-07-28
# Status: done (2026-07-29 · merged fad233b · LIF-77)
# Linear: LIF-77
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base

## Goal
Build the Spaces substrate per ADR-006–010 — `entity_links`/`entity_tags` + backlinks + saved Views (ADR-007 folded) — homing `core/src/foundation/{spaces,views}`.

## Context
Profile: Add Backend Component
Files involved: `core/src/foundation/{spaces,views}` · `core/src/db/schema/foundation/` + migration 003 · `packages/types/src/` (space/view/link types) · `core/src/validators/`
Integration points: consumes DB-6 Repository (sync_queue enqueue) + DB-9 canonical enums/Zod; owns `entity_links`/`entity_tags` read by AR-8 (backlink resolver + neural-graph data-prep); unblocks AR-7 (intra-tier edge AR-7 ← AR-5 + AR-6).

## Open Questions
- ~~`effects/` home overlap~~ RESOLVED (Step-0): `foundation/effects` = the exactly-once effect RAIL (framework §2/R1/R2), ridden by sessions/economy/measurement → **AR-7**, not AR-6. AR-6 = `foundation/{spaces,views}` only. No SP/V capability references R1/R2.
- ~~"ADR-006–010" scope range~~ RESOLVED (Step-0): AR-6 = **ADR-006 (SP1–SP7) + ADR-007 (V1–V5) only**, per capability-framework §3/§6. ADR-008 CB1–CB6 (capability registry/block_instances) = AR-7; ADR-009 templates / ADR-010 authoring = later.
- Unwritten dep edge AR-7 ← AR-5 + AR-6 (non-blocking; write into delivery-plan §5 + Linear when convenient).
- Doc-nit for the build: `foundation/spaces/CLAUDE.md` under-lists (SP1–4 only; should be SP1–SP7); `foundation/views/CLAUDE.md` omits V3. Fix during implementation.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Next M1.0 head | AR-6 Spaces | sole ready root of remaining substrate spine; unblocks AR-7 + is hard prereq for AR-8 (§5.1.1:207); highest downstream leverage among ready nodes | 2026-07-28 |
| Scope = mechanical, not a grain choice | Build SP1–SP7 + V1–V5 to framework predicates | capability-framework §3 defines the buildable unit; there is no Option-1/fuller dial — the boundary is the framework's capability IDs + each ADR's §"does NOT". Corrected a manufactured fork (Victor). | 2026-07-28 |
| Deferral boundary (assigned elsewhere, not chosen) | enabled_blocks *definitions*+block_instances→AR-7 (CB1–6); backlink *resolver*→AR-8; predicate-DSL grammar + layout visual specs + unify⇄separate surface→build-time (ADR-006 §3.3 / ADR-007 §"does NOT"); page_tags retirement→N&P build (M1.1, no live floor) | each boundary cited to an ADR §"does NOT" or the framework's capability split — no invented scope | 2026-07-28 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] **[B] §2.1 Documentation-Gathering Protocol run** (delivery-plan §2.1, BINDING) — routed source set enumerated (spec §1.1); every §3.1 shape traces to [FACT: doc:line] (incl. ADR-002 §5.20 owed-ledger); zero derived shapes
- [x] document-context BASELINE — floor grepped (foundation/{spaces,views} = stubs) + ground-truth from ADR-006/007 + framework §3 + §5.20 + architecture docs
- [x] Forward spec written + PLAN gate cleared (§XXVI g1) — independent critique ×2 (REVISE→SHIP), Approval 1 (2026-07-29)
- [x] IMPL-PLAN gate (§XXVI g2): /preflight (BLOCKED→PASSED) → 2nd independent critique (REVISE→SHIP) → Approval 2 (2026-07-29)
- [x] Read 3 existing patterns — AR-5 sessions substrate (schema/registry/migration/service) stated as the template
- [x] /adr-check equivalent — every shape validated vs ADR-006/007 + §5.20 (the gathering protocol)
- [x] TypeScript types + validators first (view.ts + z.enum)
- [x] Schema + migration 003 + services implemented (spaces + views substrates)
- [x] Full error handling — typed fail-loud errors (UnknownEntityType/InvalidTagNesting/InvalidSpaceNesting/…)
- [x] Registered — migration in runner.ts, exports in schema/index + core barrel
- [x] tsc --noEmit (root turbo) passes — 10/10 zero errors
- [x] tests pass — spaces 14/14 + enum-parity 7/7 (VIEW_LAYOUT); core 123/124 (lone fail = pre-existing vault 1MB load-flake, green alone)
- [x] /critique → SHIP verdict — 3 independent critiques (g1 ×2, g2, post-impl); each caught a real defect, all resolved
- [x] Currency Rule (§XXIX) — docs/core/spaces/current-{spec,business-rules}.md born (promoted from spec)

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt (Approval 2, 2026-07-29). -->
- [x] 1. `@vida/types/src/view.ts` — VIEW_LAYOUT C2 tuple (only new enum); barrel. (DEVIATION: no space.ts — no fixed spaces enum; entity_type is the open registry in core/_registry.ts. File-org only, no contract change.)
- [x] 2. `core/validators/view.ts` — z.enum(VIEW_LAYOUT); barrel
- [x] 3. `db/schema/foundation/spaces.ts` — 6 Drizzle mirrors; exported from schema/index.ts
- [x] 4. `db/migrations/003_spaces.ts` — hand-SQL DDL; registered in runner.ts (version→3)
- [x] 5. `db/schema/_registry.ts` — NO change (no 'view') ✓
- [x] 6. `foundation/spaces/{types,registry,service,index}.ts` — registry + SpacesService (empty [E] BR-13; BR-14 idempotent+revive; BR-15 resolve-then-soft-delete; BR-2 validate; BR-3 cycle guard)
- [x] 7. `foundation/views/{types,engine,provider-registry,service,index}.ts` — ViewProviderRegistry (empty) + ViewsService + ViewEngine (V3/V4/V5)
- [x] 8. Fixed directory stubs (spaces SP1–SP7, views +V3) + core barrel export
- [x] 9. Tests: 13-case spaces.test.ts + VIEW_LAYOUT wired into enum-parity.test.ts
- [x] 10. Verify: typecheck 10/10 · core 123/124 (lone fail = pre-existing vault 1MB load-flake, green alone) · spaces 13/13 · parity 7/7 · deferral grep clean

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-28 | initialized task + scaffolded spec stub | run the loop: Step-0 baseline → plan (/documentation-component) → critique → preflight |

## Notes
