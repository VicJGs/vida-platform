# Task: xs-egress-guard
# Status: done
# Linear: LIF-171
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1) — CONFIRMED build-from-docs (baseline: zero prior egress code)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan
# Picked up: 2026-09-20

## Goal
Egress guard — external-out leak enforcement (XCU-06/08; ADR-015).

## Dependencies
- (none)

## Progress
<!-- SESSION checklist — the Default (Entity Delivery Flow) ## Task List, mirrored to the native panel. -->
- [x] Step 0 — document-context BASELINE (read built code as a source) → scenario = Default (build-from-docs)
- [x] Step 1 — Interpretation layer (delivery/interpretation.md) — R-1…R-4 all **doc-determined** (audit store M2 [E]+append-only · per-target consent M2 · target=integration-identity anchor · one gate, fetch-is-egress-act); ZERO open decisions
- [x] Step 1.5 — ░Envision Gate░ N/A (pure-backend, no user surface) — STATED
- [x] Step 2 — ░Decomposition Gate░ **APPROVAL 1 ✅** (Victor 2026-09-20). slice-map + seam-contract; gate-1 /critique REVISE→4 fixed + 2 nits; then Victor drift-catch → stripped all "decision/ratify/lean" framing, re-grounded R-1…R-4 as FACT (R3/EN-2 · ledger append-only · ADR-014 §3.8/§3.1)
- [x] Step 3 — read foundation services (enforcer · effects/gate · capability/types) → pattern stated (factory-of-closures · types.ts+service.ts+index.ts+__tests__ · Error subclasses)
- [x] Step 4 — service spec set authored (service/_index.md = IMPL-PLAN: ops · flow · INV-1…7 · Build Steps)
- [~] Step 5 — /preflight BLOCKED→1 fixed (PF-1 checkEgress-pure/assert-persists) + 5 assumptions folded → re-preflight PASSED · gate-2 /critique SHIP (2 nits → INV-7) → **AWAITING APPROVAL 2**
- [ ] Step 7–9 — implement S1 then S2 (types→service→wiring), tsc 0, per-slice Verification Gate (live-store)
- [ ] Step 10–11 — /critique SHIP · Currency §XXIX current-* born + committed
- [ ] Step 3 — read 3 existing foundation services → state the pattern
- [ ] Step 4 — service contract (/api-contract seam) → approved
- [ ] Step 5–6 — /adr-check approach (+ /adr-new if significant)
- [ ] Step 7 — implement per slice: types → service logic → handler/route → D6 current-* docs
- [ ] Step 8 — tsc --noEmit 0
- [ ] Step 9 — per-slice Verification Gate PASS (Vitest logic + failure paths + live-store smoke)
- [ ] Step 10 — /critique → SHIP
- [ ] Step 11 — Currency Rule §XXIX — current-* refreshed, committed with code

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-20 | Adopted P5 stub as active head (#43, `#`-order). Step 0 baseline (Explore sweep): **zero prior egress code** → scenario corrected Entity Re-scope → **Default**. Specs ratified (ADR-014 §3.3, ADR-015 §3.3-3.4, capability-framework X4/X6, xcut-ingestion-ai XCU-06/08); decomposition = **2 legs** (XCU-06 + XCU-08, both service-boundary; XCU-06u UI is P6, out of scope). | Step 1 — Interpretation layer |
| 2026-09-20 | **① BACKEND COMPLETE.** Full Entity Delivery Flow: interpretation + Decomposition Gate (Approval 1 → Victor drift-catch: stripped all "decision/lean" framing, re-grounded R-1…R-4 as FACT) → IMPL-PLAN + /preflight (BLOCKED-1 checkEgress-pure fixed) + gate-2 (Approval 2) → built `foundation/egress/` (types·service·index·CLAUDE) `createEgressGuard` (6-step fail-closed flow · XCU-06 `assertEgressPermitted`/`checkEgress`-pure · XCU-08 `assertFetchEgress` · M1 deny-safe/no-op ports, no schema). S1+S2 Verification Gates PASS (14/14 live-store); @vida/core **1050→1064**; tsc 0; eslint clean. Pre-ship /critique SHIP. Currency `docs/core/egress/current-*` born (EG-1…10). | COMMIT (branch→PR) + /task-complete — awaiting go |

## Build Steps
<!-- UNIT-level — mirrors service/_index.md §Build Steps (the IMPLEMENTATION-PLAN §5). -->
- [x] S1 (XCU-06): `foundation/egress/types.ts` (acts · decision · audit · ports · `EgressDenied(defId,reason)` · `EgressGuard`)
- [x] S1: `service.ts` `createEgressGuard(enforcer, ports?)` — flow steps 1–6 + M1 default ports (deny-safe consent · no-op audit)
- [x] S1: `index.ts` barrel + `@vida/core` re-export + `CLAUDE.md`
- [x] S1: **Verification Gate PASS** — tsc 0 · eslint clean · Vitest 10/10 (permit · each deny reason · never-auto-transmit · union both-halves · deny-safe default · PF-1 check-is-pure · INV-7 propagate) live-store on real `capability_grants` · full suite 1050/1050 (+10, no regression)
- [x] S2 (XCU-08): **Verification Gate PASS** — tsc 0 · eslint clean · Vitest 14/14 (10 S1 + 4 S2: fetch union-gated · boolean-only · params→audit · boolean-deny) live-store
- [x] Currency §XXIX: `docs/core/egress/current-{spec,business-rules}.md` born (D6) — EG-1…10 promoted
- [x] Step 10 /critique → **SHIP** (2 non-blocking nits: M2 [E]/append-only doc-only forward-flag · test-cast comment folded)
- [x] Step 11 Currency §XXIX confirmed — current-* match the code
- [x] COMMIT — branch `xs-egress-guard` → PR #55 → merged `529236c` (main); `/task-complete` done

## Notes
