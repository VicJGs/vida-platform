# foundation/ai — Current Spec

> Durable contract for the AI-application service tier (XS-ai #45). Owning ADR: ADR-015 §3.1–3.8
> (reuses ADR-014 §3.3 egress · ADR-010 sandbox · ADR-004 §3.2.5 write rail).
> Kept current with `packages/core/src/foundation/ai/`.

## What it is

The cross-cutting AI-application service — the one model by which every AI-touching module runs a model with
**our server blind in both modes** (ZK-1). Two per-use modes: **on-device/agentic** (ZK-safe — no vault content
leaves) and **cloud BYO-key** (a disclosed plaintext dent, device→provider direct). A cloud call **is an egress**
that rides the built guard #43 (per-target consent + union-of-consents + never-auto-transmit + audit); `askModel`
is a **mediator-injected primitive** (the agent never holds the key); an agent's **tool-set IS its granted
envelope** (fails closed). It DECIDES / DISCLOSES / GATES; it holds no credential, makes no network call, and
authors **no schema** — the durable stores (`ai_connections`, `ai_conversations`, the AI-egress audit) + the real
mediator/on-device runtime are M2 (behind the ports). Legs XCU-17…27 (11; ADR-015).

## Surface (`packages/core/src/foundation/ai/`)

- **S1 `modes.ts` (pure):** `resolveMode(mode) → AiMode` (XCU-18, fail-loud `UnknownAiMode`) ·
  `buildAiDisclosure(mode) → AiModeDisclosure` (XCU-20/XCU-26, the ADR-015 §3.2 honest bound per mode — cloud
  content-dent + on-device residual, verbatim) · `stampAiProvenance(row) → row & {source:'ai'}` (XCU-24, pure
  idempotent helper; the row is written by each module's own service). `AI_MODES = ['on_device','cloud']`;
  `AI_PROVENANCE = 'ai'`. XCU-17 (the ingestion↔ai split seam) is realized by S2's
  `askModel` signature.
- **S2 `service.ts` — `createAiService(egressGuard, ports?): AiService`** (factory-of-closures, no `this`;
  `ports = { mediator?: AiMediatorPort; onDevice?: OnDeviceRuntimePort }`):
  - `checkModelCall(req) → AiDecision` — **pure**, non-throwing. On-device → permit, no egress (nothing leaves).
    Cloud → the call IS an egress (XCU-19 → XCU-06): builds the model-target `EgressAct` from the caller's slice
    (scope-min — the tier only forwards the given slice, never widens it) and delegates to
    `egressGuard.checkEgress`; the deny reason propagates verbatim. `disclosure` is always attached.
  - `askModel(req) → AiResponse` (XCU-22) — on-device: runs the `onDevice` port (M1 absent → `on_device_unavailable`,
    XCU-26). Cloud: **asserts** `egressGuard.assertEgressPermitted` first (re-hits the gate every call, IR-8; persists
    the AI-egress audit, XCU-27; an `EgressDenied` becomes `AiDenied` with the reason verbatim), **then** the mediator
    injects the credential + calls (M1 absent → `model_unavailable`). The agent never sees the key.
- **S3 `agent.ts` — `createAiAgentGate(enforcer): AiAgentGate`:** `assertToolPermitted(defId, tool)` (XCU-21 — a tool
  IS a `CapabilityAction`; delegates to `enforcer.assertPermitted`, fails closed with `CapabilityDenied`) ·
  `checkTool(defId, tool) → boolean` (non-throwing) · `boundPromptInput(segments) → BoundedPromptInput` (XCU-23 —
  origin provenance into the prompt; an unknown origin is treated as `untrusted`, fail-safe). The other two
  injection mechanisms are composed, not restated (S3 tool-gate + S2 egress gate).
- **S4 `connections.ts` — `createAiConnectionRegistry(ports?): AiConnectionRegistry`:** `register`/`get`/`list`
  per-provider config (`mode · provider · defaultScope · requestedNoTrain`); the config carries **no key** — the
  BYO-key is mediator-custodied (`keyCustody:'mediator'`, the only accepted value, else `key_not_mediated`), so it
  is never in agent/sandbox reach by construction. In-memory (durable `ai_connections` [E] = M2). Deterministic list.
- **Typed errors** (each carries context, parity with `EgressDenied`/`IngestionDenied`/`CapabilityDenied`):
  `UnknownAiMode(mode)` · `AiDenied(defId, reason)` (reason ∈ `AiDenyReason` `{on_device_unavailable ·
model_unavailable}` ∪ egress `EgressDenyReason` propagated verbatim) · `AiConnectionDenied(integrationId, reason)`.

## Delegated (not owned here)

`external_out` boolean + in/out union + per-action envelope checks (tool gate) → CapabilityEnforcer #31 · the
egress gate itself (per-target consent + union + audit + never-auto-transmit) → EgressGuard #43 (XCU-06;
`assertEgressPermitted`/`checkEgress`, `EgressTarget{kind:'model'}`) · credential custody pattern → ingestion
mediator #44 (XCU-09) · agent tool-writes → ADR-004 §3.2.5 rail · sandbox execution + user-authored tool-registry
contents → ADR-010 / #116 CAP-authoring (M4) · all AI UIs (mode picker · egress review · management page) → P6
`fe-integrations-ai-surfaces` (XCU-18u/19u/25u) · durable stores + real mediator/provider calls + on-device
runtime + model acquisition → M2 · local-model choice / provider order / redaction UX → build-phase (U-1).

## Tests

`foundation/ai/__tests__/` (32): `modes` (10, pure — two-mode resolve/fail-loud · per-mode disclosure exact ·
provenance idempotent/non-mutating) · `service` (9, **live-store** on real `capability_grants` + the built egress
guard #43: on-device no-egress · cloud permit → AI-egress audit + scope-min slice · 4 egress deny reasons verbatim ·
on_device/model unavailable deny-safe · IR-8 re-hits-gate · mediator receives only (target,slice)) · `agent` (6,
**live-store**: tool-in-envelope permits · tool-outside fails closed · no-grant fails closed · checkTool boolean ·
provenance carry + unknown→untrusted) · `connections` (7, pure — register/get/list deterministic · key_not_mediated
refusal · unknown-mode fail-loud · no-train flag preserved).
