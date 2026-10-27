# foundation/ai — substrate (ADR-015)

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is

Two AI modes (on-device/agentic ZK-safe / cloud via user key); dedicated layer, server blind; source=ai provenance

## Owning ADR

ADR-015

## Capabilities (framework §3)

AI1-AI6

## Status

Service tier built by **XS-ai #45** (2026-09-21): the AI-application decision/mode/agent-gate/config tier over
the built enforcer #31 + egress guard #43 — `modes.ts` (XCU-18/20/24 · `resolveMode`/`buildAiDisclosure`/
`stampAiProvenance`) · `service.ts` (`createAiService` — `checkModelCall`/`askModel`; cloud call = egress via #43,
mediator-injected, XCU-22/19/27/26) · `agent.ts` (`createAiAgentGate` — tool-set=envelope fails-closed +
injection bounding, XCU-21/23) · `connections.ts` (`createAiConnectionRegistry` — mediator-custodied config,
XCU-25). Two modes, server blind in both; deny-safe/fail-closed ports; **NO schema** (durable stores + real
mediator/on-device runtime = M2). Currency: `docs/core/ai/current-*` (BR-AI-1…13). Spec: `docs/specs/foundation/xs-ai/`.
Deferred (homed): module `askModel` runtime → M2 (LIF-145) · all AI UIs → P6 `fe-integrations-ai-surfaces` ·
sandbox execution + tool-registry contents → ADR-010 / #116 CAP-authoring (M4) · local-model choice/redaction UX → build-phase.
⚠ Barrel note: `buildAiDisclosure` (not `buildDisclosure` — ingestion owns that name). Both AI ports absent at M1 = deny-safe.
