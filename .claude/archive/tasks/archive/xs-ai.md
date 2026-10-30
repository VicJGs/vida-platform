# Task: xs-ai
# Status: done
# Linear: LIF-167
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
AI application services — model calls, prompt orchestration, structured extraction (XCU-17…27; ADR-014/020).

## Dependencies
- blocked by `xs-egress-guard`  ✅ BUILT (#43, LIF-171)
- blocked by `xs-ingestion`     ✅ BUILT (#44, LIF-172)

## Decomposition (Approval 1 — Entity Delivery Flow front matter)
Governing ADR-015 §3.1–3.8 (reuses ADR-014 §3.3 egress · ADR-010 sandbox · ADR-004 write rail).
⚠ task-Goal "ADR-014/020" was a typo — ADR-020 is Zustand (frontend). Corrected in interpretation.
11 legs XCU-17…27, all `service`, 4 backend slices, 0 FE (UIs = P6 fe-integrations-ai-surfaces).
M1 = pure decision/mode/agent-gate/config tier + deny-safe ports + NO schema; M2 = durable stores + real reach.
Docs: docs/specs/foundation/xs-ai/delivery/{interpretation,slice-map,seam-contract}.md + service/_index.md.

- [x] S1 — modes · disclosure · provenance · split seam (XCU-18/20/24/17) — PURE. ✅ Verification Gate PASS: @vida/core 1106/1106 (+10), tsc 0. `foundation/ai/{types,modes,index}.ts`. Barrel collision fixed: `buildDisclosure`→`buildAiDisclosure` (ingestion owns `buildDisclosure`).
- [x] S2 — askModel core: mediated primitive · cloud=egress+scope-min · AI-egress audit (XCU-22/19/27 + XCU-26 port/dispatch) — LIVE-STORE. ✅ Verification Gate PASS: 9/9 live-store, tsc 0, eslint 0. `foundation/ai/service.ts` `createAiService(enforcer, egressGuard, ports?)`. GROUNDING: cloud call = PUSH egress → `assertEgressPermitted`/`checkEgress` (XCU-19→XCU-06), NOT assertFetchEgress. Egress reasons propagate verbatim (R-4). XCU-26 port spans S2 (askModel dispatches on-device); S4 ratifies its invariants.
- [x] S3 — agent gate: tool-set=envelope fails-closed · injection bounding (XCU-21/23) — LIVE-STORE. ✅ 6/6, tsc 0. `agent.ts`. Tool IS a CapabilityAction → delegates to enforcer.assertPermitted (CapabilityDenied propagates = fail-closed). boundPromptInput: unknown origin → untrusted (fail-safe).
- [x] S4 — ai_connections config registry (XCU-25). ✅ 7/7, tsc 0. `connections.ts`. Config carries NO key (keyCustody:'mediator' only, else key_not_mediated). XCU-26 fully in S2 (no manufactured S4 work).
- [x] D6 birth docs/core/ai/current-* (BR-AI-1…13) · CLAUDE.md refreshed · §XXIX currency. Full @vida/core 1128/1128 (+32), tsc 0, eslint 0.
- [x] Pre-ship /critique → REVISE→SHIP. B1 fixed: dropped dead `enforcer` param from `createAiService` (egress already holds it; tool-gate is a separate factory) → `createAiService(egressGuard, ports?)`. N1: `origin:'untrusted' as const`. N2 (AiResponse minimal) accepted. Docs reconciled (assertEgressPermitted not assertFetchEgress — cloud call = push egress XCU-19→XCU-06). Re-verified 32/32, tsc 0, eslint 0.
