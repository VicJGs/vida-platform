# Service Spec — foundation/ai (XS-ai #45, LIF-167)

> Entity Delivery Flow §4 — operations · operation-flow · invariants · composition for the AI-application
> service tier. Owning ADR: **ADR-015 §3.1–3.8** (reuses ADR-014 §3.3 egress · ADR-010 sandbox · ADR-004 §3.2.5
> write rail). Ground truth once built: `docs/core/ai/current-*` (born S1, D6). Ratifies `interpretation.md`.

## Operations (by slice)

| #   | Operation                            | Leg          | Kind             | Composes                                       |
| --- | ------------------------------------ | ------------ | ---------------- | ---------------------------------------------- |
| S1  | `AI_MODE` + per-use-choice invariant | XCU-18       | pure enum + rule | —                                              |
| S1  | `buildAiDisclosure(mode)`            | XCU-20       | pure             | EgressTarget                                   |
| S1  | `stampAiProvenance(row)`             | XCU-24       | pure helper      | —                                              |
| S1  | ingestion↔ai split seam (decl)       | XCU-17       | contract         | ingestion #44                                  |
| S2  | `checkModelCall(req)`                | XCU-19       | pure decision    | egress `checkEgress`                           |
| S2  | `askModel(req)`                      | XCU-22/19/27 | async guard      | egress `assertEgressPermitted` + mediator port |
| S3  | `assertToolPermitted(defId, tool)`   | XCU-21       | decision         | enforcer `checkAction`                         |
| S3  | `boundPromptInput(input)`            | XCU-23       | pure rule        | —                                              |
| S4  | `createAiConnectionRegistry`         | XCU-25       | registry + port  | — (store port → M2)                            |
| S4  | `OnDeviceRuntimePort` contract       | XCU-26       | port             | — (runtime → M2)                               |

## Operation-flow — `askModel(req)` (S2, load-bearing, order fail-closed)

1. **Resolve mode** (`on_device | cloud`); unknown → `UnknownAiMode`.
2. **On-device path:** nothing leaves the vault → no egress; call the `onDevice` port (M1 absent →
   `on_device_unavailable`); attach the on-device residual disclosure (model-acquisition leak). **Never
   silently upgrade to cloud** (IR-8).
3. **Cloud path:** build the **minimal `EgressSlice`** (scope-min, XCU-19 — only the task's slice, never the
   vault) → `egressGuard.assertEgressPermitted({ target:{kind:'model'}, slice, userInitiation })`. This **is** the
   egress gate (per-target consent + union-of-consents + never-auto-transmit + audit persisted once, XCU-27) —
   composed from #43, not re-built. `EgressDenied` reasons propagate verbatim.
4. **Mediator call:** the mediator **injects the BYO-key credential + makes the provider call + returns the
   response**; the agent/capability **never sees the key** (IR-6). M1 mediator absent → `model_unavailable`
   (deny-safe, no network).
5. **Every call re-hits steps 3–4** — no cached consent across hops (IR-8).

## Invariants (all doc-cited; enforced by the Verification Gates)

- **INV-1 — Server blind in both modes; cloud is device→provider direct.** `[FACT: ADR-015:46,52]`
- **INV-2 — Mode is a per-use informed choice, not a global setting; on-device preferred.** `[FACT: ADR-015:20,46]`
- **INV-3 — A cloud call IS an egress; it rides #43, adding only scope-min + model semantics.** `[FACT: ADR-015:54,70]`
- **INV-4 — Honest content-egress bound: plaintext slice + IP/identity + cross-call profile disclosed; no-train
  requested-not-guaranteed.** `[FACT: ADR-015:48-50]`
- **INV-5 — Redaction is a blast-radius trim, not a privacy control.** `[FACT: ADR-015:54]`
- **INV-6 — The agent never holds the key; `askModel` is mediator-injected.** `[FACT: ADR-015:58]`
- **INV-7 — Tool-set IS the granted envelope; anything outside fails closed; no ambient authority; no bypass of
  the ADR-004 §3.2.5 write path.** `[FACT: ADR-015:56]`
- **INV-8 — Every `askModel` re-hits the egress gate; no silent on-device→cloud upgrade.** `[FACT: ADR-015:58,51]`
- **INV-9 — Injection can misword the model but cannot exfiltrate past a consent gate the agent doesn't
  control (provenance-into-prompt + consented-slice-not-agent-composed + tool-set-is-envelope).** `[FACT: ADR-015:60]`
- **INV-10 — AI output flagged `source=ai` + persisted encrypted; AI drafts, the user owns.** `[FACT: ADR-015:64]`
- **INV-11 — On-device is not "leaks nothing": model-acquisition residual disclosed; runtime telemetry-off,
  no-ambient-network.** `[FACT: ADR-015:51]`
- **INV-12 — No schema at M1; ports deny-safe/fail-closed; durable stores + real reach are M2.** `[FACT:
ADR-015:113-115; xcut-ingestion-ai.md:5]`

## Composition (owns vs delegates — from interpretation ORGANIZATION)

- **Owns:** mode model · disclosure builder · provenance stamp · `askModel` (scope-min + audit + re-hit-gate) ·
  agent tool-gate + injection bounding · connections config registry · on-device runtime seam · the AI deny/error taxonomy.
- **Delegates:** the egress gate + credential custody (#43/#44) · the enforcer boolean/union (#31) · sandbox +
  tool-registry contents (ADR-010/#116) · all UIs (P6) · durable stores + real reach (M2).

## Build shape (mirrors egress #43 / ingestion #44)

Factory-of-closures (`createAiService(egressGuard, ports?)`, no `this` — memory
factory-service-no-this-for-intra-calls); deny-safe default ports; **no schema**; live-store Verification Gate
on S2/S3 over real `capability_grants` + the built egress guard. @vida/core test-runtime Node 24 (better-sqlite3 ABI).
