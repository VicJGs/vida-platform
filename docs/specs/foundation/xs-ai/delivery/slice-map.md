# Slice Map — XS-ai (#45, LIF-167)

> Entity Delivery Flow §4 — the decomposition. **All slices `backend`** (service tier); **0 frontend, 0 shared**
> — every AI *surface* (mode-choice, egress-review, management page) is P6 UI (XCU-18u/19u/25u), OUT of this
> build `[FACT: xcut-ingestion-ai.md:35,37,44]`. Mode: build-from-docs, ratifying `interpretation.md` R-1…R-6.
> Precedent shapes: ingestion #44 (5 slices) · egress #43 (2 slices). `foundation/ai/` is empty (only CLAUDE.md).

## The split
| Track | Slices | Why |
|-------|--------|-----|
| **backend** (this build) | S1–S4 (11 legs XCU-17…27) | The AI decision/mode/agent-gate/config tier — pure engine + deny-safe ports, no schema |
| **frontend** | — | P6 `fe-integrations-ai-surfaces` owns XCU-18u/19u/25u (mode picker · egress review · AI management page) |
| **shared** | — | none |

## Slices (each a Verification-Gate unit; S2 is the load-bearing live-store slice)

### S1 — Modes · disclosure · provenance · the split seam (PURE, no deps)
**Legs:** XCU-18 (two-mode) · XCU-20 (honest cloud-egress disclosure) · XCU-24 (`source=ai` provenance) ·
XCU-17 (the ingestion↔ai split seam, declared).
**Files:** `foundation/ai/types.ts` (all AI types + typed errors) · `foundation/ai/modes.ts`
(`AI_MODES` = `['on_device','cloud']`; `resolveMode(mode)`; `buildAiDisclosure(mode) → AiModeDisclosure`;
`stampAiProvenance(row) → row & {source:'ai'}`; the per-use-choice + on-device-residual invariants).
**Shape:** all pure/deterministic — no enforcer, no egress, no port. Twin of ingestion S1 (`classification.ts`).
**Verification Gate:** Vitest logic + failure paths (unknown mode → `UnknownAiMode`; disclosure matrix exact;
provenance idempotent). No live store needed (pure).
**Homes:** XCU-17 is primarily a **seam contract** (`seam-contract.md`) realized by S2's `askModel` signature —
S1 declares the AI-side entry the split routes to; no runtime here.

### S2 — `askModel` core: mediated primitive · cloud-as-egress · scope-min · AI-egress audit (LOAD-BEARING)
**Legs:** XCU-22 (`askModel(scoped_slice)` mediator primitive) · XCU-19 (cloud call = egress + scope-min) ·
XCU-27 (AI-egress audit).
**Files:** `foundation/ai/service.ts` — **`createAiService(egressGuard, ports?): AiService`**
(factory-of-closures, no `this`). `ports = { mediator?: AiMediatorPort; onDevice?: OnDeviceRuntimePort }`.
- `checkModelCall(req) → AiDecision` — **pure**, non-throwing. Order (load-bearing, fail-closed): 1 mode
  resolvable → 2 **cloud** path: forward the caller's `EgressSlice` (scope-min — the tier never widens it, XCU-19)
  → route `egressGuard.checkEgress({target:{kind:'model'}, slice, userInitiation})` → deny reason passthrough;
  **on-device** path: no egress (nothing leaves) → permit → 3 return with the always-attached disclosure.
- `askModel(req) → AiResponse` (XCU-22) — cloud call IS a push egress (XCU-19→XCU-06): **asserts** via
  `egressGuard.assertEgressPermitted` first (persists the AI-egress audit record, XCU-27; a deny propagates the
  egress reason verbatim), **then** the mediator injects the credential + calls the provider; M1 mediator absent →
  `model_unavailable` (deny-safe, no network); the agent **never sees the key**. On-device mode → the `onDevice`
  port (M1 absent → `on_device_unavailable`).
**Shape:** guard/decision over the built enforcer + egress; egress/ingestion-twin. **Re-hits the egress gate
every call** (IR-8 no-silent-upgrade).
**Verification Gate — LIVE STORE:** real `capability_grants` via `createCapabilityEnforcer` + the built
`createEgressGuard`: external_out gate · sensitive-union · never-auto-transmit · cloud→egress permit/deny ·
scope-min slice shape · mediator absent deny-safe · audit record persisted once · on-device no-egress path.

### S3 — Agentic actor: tool-set = envelope (fails closed) · prompt-injection bounding
**Legs:** XCU-21 (agent tool-set IS the granted envelope) · XCU-23 (prompt-injection bounding).
**Files:** `foundation/ai/agent.ts` — `createAiAgentGate(enforcer): AiAgentGate`:
- `assertToolPermitted(defId, tool) → void` (XCU-21) — delegates each tool to `enforcer.checkAction` as its
  `binding`/`effect` action; **fails closed** for any tool outside the granted envelope; no ambient authority.
- `boundPromptInput(input) → BoundedPromptInput` (XCU-23) — attaches origin provenance (trusted/untrusted) to
  ingested content; asserts the outgoing egress slice is **user-consented content, not agent-composed free text**
  (the injected-tool-call still hits S2's egress gate; cannot auto-widen scope or invent a target).
**Shape:** decision gate over the enforcer; pure + live-store for the tool gate.
**Verification Gate — LIVE STORE:** real grants: granted tool permits · ungranted tool fails closed · injected
"call a tool you weren't granted" fails closed · untrusted-provenance carried · egress-slice-is-consented rule.

### S4 — `ai_connections` config registry
**Legs:** XCU-25 (`ai_connections` config). *(XCU-26 on-device runtime is fully realized in S2 — the port +
deny-safe default + telemetry-off/no-ambient-network invariants live where askModel dispatches it; there is no
additional M1 code for it here.)*
**Files:** `foundation/ai/connections.ts` — `createAiConnectionRegistry(ports?): AiConnectionRegistry`:
`register`/`get`/`list` per-provider config (`mode · provider · defaultScope · requestedNoTrain`); the config
carries **no key at all** — the BYO-key is mediator-custodied (`keyCustody: 'mediator'`, the only accepted value,
else `key_not_mediated`), so it is **never in agent/sandbox reach by construction**; in-memory (durable
`ai_connections` [E] = M2).
**Shape:** registry mirroring the built capability/effect/integration registries (in-memory, deterministic).
**Verification Gate:** Vitest — register/get/list deterministic · custody refusal (`key_not_mediated`) ·
unknown-mode fail-loud · requested-not-guaranteed no-train flag preserved.

## Leg → slice coverage (all 11 homed; 0 unhomed, 0 double-homed)
| Leg | Slice | Leg | Slice |
|-----|-------|-----|-------|
| XCU-17 | S1 (seam decl) + S2 (realized) | XCU-23 | S3 |
| XCU-18 | S1 | XCU-24 | S1 |
| XCU-19 | S2 | XCU-25 | S4 |
| XCU-20 | S1 | XCU-26 | S2 (on-device port + dispatch + deny-safe + invariants) |
| XCU-21 | S3 | XCU-27 | S2 |
| XCU-22 | S2 | | |

## Build order
S1 (pure, no deps) → **S2 (load-bearing, live-store)** → S3 (agent gate, live-store) → S4 (config/registry).
Each slice's Verification Gate PASSES before the next begins — no batching, no owed gates (§XXVI / EDF §9).

## Out of this build (delegated / deferred — from interpretation R-4/R-6 + U-1…U-4)
- Egress gate + credential custody → egress #43 / ingestion #44 (BUILT; composed, not re-built).
- Sandbox execution + user-authored tool-registry contents → ADR-010 / #116 CAP-authoring (M4).
- All AI UIs (XCU-18u/19u/25u) → P6 `fe-integrations-ai-surfaces`.
- Durable stores (`ai_connections`/`ai_conversations`/AI-egress audit rows) + real mediator/provider calls +
  on-device runtime + model acquisition → M2.
- Local-model choice / provider order / redaction UX (U-1) · tool-registry contents (U-2) · ai_* DDL (U-3) ·
  native AI + attested-cloud (U-4) → build-phase / deferred.
