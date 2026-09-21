# Seam Contract — XS-ai (#45, LIF-167)

> Entity Delivery Flow §4 — the service API this tier exposes to its consumers (M2 module `askModel` runtime +
> P6 AI UIs) and the seams it consumes. No consumer ships at M1; the contract is fixed now so the M2 wiring is a
> zero-signature-change port swap. `[FACT: xcut-ingestion-ai.md:5; interpretation.md R-1]`

## Consumed seams (all BUILT — composed, never re-implemented)
| Seam | From | Used by | Contract point |
|------|------|---------|----------------|
| `enforcer.checkAction(defId, {type:'external_out'})` → `{allowed,reason?}` | CapabilityEnforcer #31 | S2 cloud gate | `external_out_ok` boolean; fail-closed default `[FACT: docs/core/capability/current-spec.md:24]` |
| `enforcer.checkAction(defId, {type:'sensitive', module})` | CapabilityEnforcer #31 | S2 union · S3 | sensitive-module consent (SENSITIVE_MODULE_CLASSES {finance,health}) `[FACT: capability/current-spec.md:30]` |
| `enforcer.checkAction(defId, {type:'binding'\|'effect', …})` | CapabilityEnforcer #31 | S3 tool gate | tool ∈ envelope → allowed; else fails closed (XCU-21) |
| `egressGuard.checkEgress(act)` → `EgressDecision` (pure) | EgressGuard #43 | S2 `checkModelCall` | non-throwing cloud-call decision `[FACT: docs/core/egress/current-spec.md:19]` |
| `egressGuard.assertEgressPermitted(act)` → `EgressAuditRecord` | EgressGuard #43 | S2 `askModel` | throws `EgressDenied`; persists the AI-egress audit once (XCU-27) `[FACT: egress/current-spec.md:20]` |
| `EgressTarget{ integrationId, kind:'model', label }` | EgressGuard #43 types | S2 | the model target kind **already exists** (R-3) `[FACT: egress/current-spec.md:26]` |
| `EgressSlice{ summary, sensitiveModules }` · `UserInitiationProof` | EgressGuard #43 types | S2 scope-min | the scoped outgoing slice + never-auto-transmit proof `[FACT: egress/current-spec.md:28]` |

## Exposed surface (what M2 / P6 consume)
```ts
// foundation/ai/service.ts
createAiService(egressGuard: EgressGuard, ports?: AiPorts): AiService
interface AiService {
  checkModelCall(req: AiRequest): AiDecision            // pure, non-throwing (S2)
  askModel(req: AiRequest): Promise<AiResponse>         // asserts egress + audit, then mediator/on-device (S2)
}
interface AiPorts { mediator?: AiMediatorPort; onDevice?: OnDeviceRuntimePort }  // M1 both absent → deny-safe

// foundation/ai/modes.ts (pure)
AI_MODE = ['on_device','cloud'] as const
buildAiDisclosure(target: EgressTarget): AiModeDisclosure   // XCU-20
stampAiProvenance<T>(row: T): T & { source: 'ai' }               // XCU-24 (written via each module's service)

// foundation/ai/agent.ts
createAiAgentGate(enforcer: CapabilityEnforcer): AiAgentGate
interface AiAgentGate {
  assertToolPermitted(defId: string, tool: AiTool): void         // XCU-21 fails closed
  boundPromptInput(input: PromptInput): BoundedPromptInput        // XCU-23 provenance + consented-slice rule
}

// foundation/ai/connections.ts
createAiConnectionRegistry(ports?: { store?: AiConnectionStorePort }): AiConnectionRegistry
// register/get/list per-provider config; key custody = mediator, else `key_not_mediated`; in-memory (M2 store)
```

## The ingestion↔ai split seam (XCU-17)
A model-involving pipeline splits by ADR ownership: **ADR-014 (ingestion #44) moves the data** (consent +
egress + on-device parse), **ADR-015 (this tier) governs the model call**. A photo→OCR→insight pipeline is
both: ingestion consents+moves the image (egress to a vision model via `fetchThroughMediator`), the AI tier's
`askModel` governs the recognition + the on-device-vs-cloud choice, ADR-010 sandboxes any acting the result
drives. `[FACT: ADR-014:76 (§3.7); ADR-015:66 (§3.7); xcut-ingestion-ai.md:33]`. **Contract:** ingestion's
mediator hands a fetched-then-to-be-cognized payload to this tier's `askModel(req)`; the AI tier owns cognition,
never the fetch. No shared runtime object — the seam is the `askModel` signature + the shared `EgressTarget`/
`EgressSlice` vocabulary.

## Port contracts (M1 deny-safe; M2 swaps a live adapter — zero signature change)
```ts
interface AiMediatorPort {   // XCU-22 — injects BYO-key, calls provider, returns response; agent never sees key
  call(target: EgressTarget, slice: EgressSlice): Promise<AiResponse>   // M1: absent → model_unavailable
}
interface OnDeviceRuntimePort {  // XCU-26 — telemetry-off, no-ambient-network, no-silent-upgrade
  run(req: AiRequest): Promise<AiResponse>                              // M1: absent → on_device_unavailable
}
interface AiConnectionStorePort { // XCU-25 — durable ai_connections (M2, field-encrypted [E])
  put(c: AiConnection): void; get(id: string): AiConnection | null; list(): AiConnection[]
}
```

## Typed errors (parity with `EgressDenied` / `IngestionDenied` / `CapabilityDenied`)
`AiDenied(defId, reason)` where reason ∈ `AiDenyReason` = `{ model_unavailable · on_device_unavailable ·
external_out_denied · sensitive_unconsented · not_user_initiated · tool_not_granted · key_not_mediated ·
unknown_mode }` (cloud-path egress reasons propagate from `EgressDenied` verbatim) · `UnknownAiMode(mode)`.
