# Task: ar-5-sessions-base
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/foundation/ar-5-sessions-base/_index.md
# Created: 2026-07-28
# Status: done
# Cluster: M1.0 Boot & Connective Base

## Goal
Build the AR-5 Sessions substrate — the `sessions` table-per-type model plus the integration contract
(guarded-write + idempotency + effect rail + effect catalogue) that AR-7 capability, measurability, and
economy all inherit-by-reference (ADR-004 §3.2.5).

## Context
Profile: Add Backend Component
Linear: LIF-107 (task-synced) ⚠ DUP of roadmap LIF-76 — reconcile (keep one, remap slug; same class as db-9 LIF-106 vs LIF-71) · M1.0 substrate SPINE · cluster "M1.0 Boot & Connective Base"
Home: `packages/core/src/foundation/sessions`
Files involved: `packages/core/src/foundation/sessions/*` (new), `packages/core/src/db/schema/<substrate>.ts`
  (DB-3 stream-(i) slice rides this gate), consumes db-9 canonical enums (session type/status + effect
  catalogue vocabulary) + db-6 repository (co-transactional sync_queue producer).
Authority: ADR-004 (§3.2.2 enum vocabulary :60-62, §3.2.5 guarded-write/idempotency/effect rail :74-128,
  §3.4 enqueue), `docs/features/sessions-and-scheduling`.
Prereqs: db-6 ✅ + db-9 ✅ (both done 2026-07-28). in-degree 0 among substrates.
Integration points: AR-6 (Spaces) = independent 2nd root; AR-7 ← AR-5 + AR-6 (effect rail inheritance).
  Dep-graph gap to reconcile (non-blocking): delivery-plan encodes only the external edge (← db-6+db-9),
  not the intra-tier AR-7 ← AR-5 edge the ADRs imply.

## Open Questions
- **[RESOLVED — not a decision] AR-5 vs AR-7 effect-rail boundary.** Already defined by plan §5:120-122 +
  §5.1.1 (build-order-not-runtime-feed) + ADR-004 §3.2.5 ("owner"=spec-owner). AR-5 = spine + Integration
  Contract STRUCTURE (declarations/registry/lifecycle) + effect-catalogue enum vocabulary. AR-7 (← AR-5) =
  the firing runtime (applied_effects, effect_event_id UNIQUE, routing, handlers). No cycle; M1.0 declares, AR-7 fires.
- **[enum gap] db-9 has no new-session enums** — only legacy `SCHEDULED_SESSION_*` (conflated sub_type+purpose,
  missing `planned`/`missed`). AR-5 authors `SESSION_SUB_TYPE/PURPOSE/SCHEDULING_MODE/STATUS` (+ `EFFECT_TYPE`
  catalogue) via db-9's C2 tuple-as-source pattern.
- **[PLAN] spine columns + which Integration-Contract tables land in AR-5 + is `SessionRegistry` runtime in M1.0 scope (or contract-only).**

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| AR-5/AR-7 effect-rail boundary | AR-5 = spine + contract STRUCTURE + enums; rail (firing) = AR-7 | Already defined by plan §5:120-122 + §5.1.1 (build-order≠runtime-feed) + ADR-004 §3.2.5 ("owner"=spec-owner). Not a fork — corrected a false escalation. | 2026-07-28 |
| M1.0 runtime grain | Structure + contract types + THIN registry (store/validate defs); DEFER transition engine + effect firing + scheduler | ADR-017 features-first + AR-7←AR-5 acyclic + no M1.0 consumer for the transition engine (effect targets don't exist yet). Victor-approved (AskUserQuestion). | 2026-07-28 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — floor established (code from-zero; docs rich/current; ADR-004 authority)
- [~] Forward spec written + Per-Step Build Gate cleared (§XXVI) — PLAN done, Approval 1 ✅; gate 2 in progress
- [x] Read 3 existing routes/handlers — pattern stated (db-6/db-9 4-artifact: tuple→z.enum→Drizzle mirror→SQL migration)
- [x] /api-contract (integration contract) — §3 Contract authored (spine + registry API + 4-dim types); Approval 1 ✅
- [x] /adr-check — approach verified against ADR-004 (spine/contract) + ADR-012 (effect catalogue amendment) + ADR-017 (features-first grain); no ADR conflict, no ADR-new needed
- [x] Gate 2: /preflight (BLOCKED→G1/G2/G3 resolved in IMPL-PLAN) → 2nd independent /critique (REVISE→4 MUST-FIX applied) → Approval 2 ✅
- [x] TypeScript types + interfaces first · [x] schema/service logic · [x] error handling (typed errors) · [x] registration (barrels + runner)
- [x] tsc --noEmit — 10/10 zero errors · [x] tests — core 110/110, web 6/6, deferral grep clean
- [x] /critique → SHIP (post-impl independent critique: REVISE→findings 1/2/8 resolved: BR-4 dim2 containment, §4 overclaim reworded, round-trip test strengthened)
- [x] quality-gate-engineering → PASS · [x] Currency Rule §XXIX — current-spec.md + current-business-rules.md born for sessions context
- [ ] /adr-new recorded (if significant architectural choice)
- [ ] TypeScript types and interfaces written first
- [ ] Database query or service logic implemented
- [ ] Handler with full error handling implemented
- [ ] Route/registration wired
- [ ] tsc --noEmit passes — zero errors
- [ ] Tests pass: success case + 2 error cases
- [ ] /critique → SHIP verdict
- [ ] Currency Rule (§XXIX) — CURRENT-SPEC + CURRENT-BUSINESS-RULES refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors the IMPLEMENTATION-PLAN. -->
- [x] 1. Enums — `@vida/types/session.ts` (5 tuples, C2; EFFECT_TYPE=12) + index barrel
- [x] 2. Validators — `@vida/core/validators/session.ts` (5 z.enum) + index barrel
- [x] 3. Schema slice — `db/schema/foundation/sessions.ts` (3 mirrors + indexes) + schema/index barrel
- [x] 4. Migration — `db/migrations/002_sessions.ts` (hand-SQL DDL + CHECKs) + runner registration
- [x] 5. Contract types — `foundation/sessions/types.ts` (SessionTypeDef + 4 dims + typed errors)
- [x] 6. Thin registry — `foundation/sessions/registry.ts` (register/get/list; BR-3/4/1) + index barrel + core/index re-export
- [x] 7. Tests — parity fixture (+ddlFor 002 patch) · enums.test extended · registry.test (9 cases)
- [x] 8. Verify — typecheck 10/10 · core 109/109 · web 6/6 · deferral grep clean

**Minor deviations from the IMPLEMENTATION-PLAN (recorded, §XXVIII-lite — mechanical, not directional):**
1. JSON columns declared as plain `text()` not `json<T>()` — `json<T>` only casts the TS type; it does NOT
   serialize, so `create()` would bind a raw object to SQLite. The registry JSON.stringify's on write / parses
   on read (the sync-queue `payload` precedent — "app stringifies"). Intent preserved; helper choice corrected.
2. Updated one db-6 test assertion (`repository.test.ts` migration-wiring): `currentVersion === 1` →
   `>= 1` — adding migration 002 legitimately advances the global version; the db-6 charter is "its migration
   ran + sync_queue exists", not the global count. ISOLATED collateral (auto-triage).

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-28 | initialized task + scaffolded spec stub | run the loop: Step 0 document-context baseline → plan (/documentation-component) → critique → preflight |

## Notes
