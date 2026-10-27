# foundation/ai — Current Business Rules

> The invariants the AI-application tier enforces (XS-ai #45). Each is code-enforced + test-proven; every rule
> cites ADR-015. Kept current with `packages/core/src/foundation/ai/`. Promoted from `service/_index.md` INV-1…12.

- **BR-AI-1 — Server blind in both modes.** No mode, cloud included, routes plaintext through our server; a cloud
  call is device→provider direct (ZK-1). `[FACT: ADR-015:46,52; :71]` — `buildAiDisclosure` serverPosture; the
  tier makes no network call.
- **BR-AI-2 — Mode is a per-use informed choice, on-device preferred.** Not a global setting; the caller picks
  per call. `[FACT: ADR-015:20,46]` — `resolveMode`, the discriminated `AiRequest`.
- **BR-AI-3 — A cloud call IS an egress; it rides #43, never a new path.** Per-target consent + union-of-consents
  - never-auto-transmit + audit come from EgressGuard #43; the AI tier adds only scope-min + model semantics.
    `[FACT: ADR-015:54,70; XCU-19→XCU-06]` — `checkModelCall`/`askModel` delegate to `checkEgress`/`assertEgressPermitted`.
- **BR-AI-4 — Scope-minimization by construction.** The tier only ever forwards the caller's slice — it has no
  vault access to over-send from; the outgoing `EgressSlice` is exactly what the caller supplied. `[FACT: ADR-015:54]`
  — proven: the audit `sliceSummary` == the caller's slice.
- **BR-AI-5 — The honest content-egress bound is named.** Cloud disclosure states: user-chosen slice in PLAINTEXT
  (content, not metadata) + IP/API-key identity + cross-call profile; no-train REQUESTED-not-guaranteed. `[FACT:
ADR-015:48-50]` — `buildAiDisclosure('cloud')`.
- **BR-AI-6 — The agent never holds the key; askModel is mediator-injected.** The mediator injects the credential
  - calls + returns only the response; the agent/capability never sees the key. `[FACT: ADR-015:58]` — the
    `AiMediatorPort.call(target, slice)` signature carries no credential; M1 absent → `model_unavailable`.
- **BR-AI-7 — The tool-set IS the granted envelope; anything outside fails closed.** A tool is a `CapabilityAction`;
  `assertToolPermitted` delegates to the enforcer; no ambient authority; a binding tool-write rides the ADR-004
  §3.2.5 rail. `[FACT: ADR-015:56]` — proven: an out-of-envelope / no-grant tool throws `CapabilityDenied`.
- **BR-AI-8 — Every askModel re-hits the egress gate; no silent on-device→cloud upgrade.** Each cloud hop is its
  own consented egress step. `[FACT: ADR-015:58,51]` — proven: two calls → two audit records.
- **BR-AI-9 — Prompt injection is bounded.** Untrusted-origin content carries provenance into the prompt; an
  injected tool-call still hits the tool gate (BR-AI-7); an agent-composed egress still hits the never-auto-transmit
  gate (BR-AI-3). Injection can misword the model, not exfiltrate past a gate the agent doesn't control. `[FACT:
ADR-015:60]` — `boundPromptInput` (unknown origin → untrusted, fail-safe).
- **BR-AI-10 — AI output is flagged + (when persisted) encrypted; AI drafts, the user owns.** Model rows carry
  `source='ai'`; persisted turns store encrypted (EN-2, M2). `[FACT: ADR-015:64]` — `stampAiProvenance`.
- **BR-AI-11 — On-device is not "leaks nothing".** Residual = the model-acquisition fetch (mitigable via ADR-014
  Layer-2); the runtime must ship telemetry-off, no-ambient-network, no silent upgrade. `[FACT: ADR-015:51]` —
  `buildAiDisclosure('on_device')` + the `OnDeviceRuntimePort` invariant doc.
- **BR-AI-12 — The BYO-key is mediator-custodied, never in-reach.** The `ai_connections` config carries no key;
  a non-mediator custody is refused (`key_not_mediated`). `[FACT: ADR-015:62,114]` — `createAiConnectionRegistry`.
- **BR-AI-13 — No schema at M1; ports deny-safe/fail-closed; durable stores + real reach are M2.** `[FACT:
ADR-015:113-115; xcut-ingestion-ai.md:5]` — both `AiPorts` absent by default; the AI-egress audit delegates to
  the egress no-op sink.

## Deferred (homed, out of this build)

- Local-model choice / cloud-provider order / prompt-construction + redaction UX → build-phase (U-1). `[ADR-015:74]`
- Agentic tool-registry CONTENTS (which tools may be granted) → build-phase; only the authority model is locked
  (BR-AI-7). `[ADR-015:74]`
- Concrete `ai_connections` / `ai_conversations` columns + `source=ai` DDL → ADR-002 §5.20 (U-3). `[ADR-015:113-114]`
- First-party native AI + an attested-cloud/TEE mode → later / §6 review trigger (U-4). `[ADR-015:62,120]`
- The module `askModel` runtime + all AI UIs → M2 (LIF-145) / P6 `fe-integrations-ai-surfaces`.
