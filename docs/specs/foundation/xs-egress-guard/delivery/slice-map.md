# Slice Map — XS-egress-guard (#43, LIF-171)

> Entity Delivery Flow §2 Decomposition output. **Build-from-docs / Decide mode** (§8): P3 fixed **2 legs**
> `[FACT: decomposition.md:44]`; this records the slices + per-slice Verification-Gate ledger.
> All slices tagged **backend** (XS substrate, **no frontend twin** — the P6 face `fe-integrations-ai-surfaces`
> rides the finished service `[FACT: PLAN-p6-frontend-track.md:189]`).
> Envision Gate: **N/A** (pure backend, renders no user surface — §3.75 one-question test = No).

## The M1 scope (doc-determined — see interpretation R-1…R-4)

Egress-guard at M1.1.2 builds the **finished decision/mediation service + its persistence PORTS**; the durable
audit STORE, per-target consent STORE, real egress targets, credential injection, provider call, and the audit/
consent UI are **M2/P6**. Grounds for deferring the STORE: `[FACT: xcut-ingestion-ai.md:5 "M2-facing … seams
captured now"]` + DB-4 authored no egress table (Step-0 grep) + `[FACT: PLAN-p6:189 finished-twin]`. Separately,
the grant _envelope_ takes **no new column/table** (X5, `[FACT: capability-framework.md:199]`) — that governs how
`external_out_ok` is read, **not** audit storage. Ports ship an **M1 default adapter** (deny-safe consent +
in-memory audit) so the service is live-testable now and M2 swaps the real adapters (field-encrypted `[E]` +
append-only, interpretation IR-8/IR-9) — no schema, no drift.

## Slices (build order)

| #   | Slice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Plane   | Legs   | Depends on                                             | Verification Gate (blocking)                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Egress gate core (XCU-06)** — `assertEgressPermitted` / `checkEgress` over an `EgressAct`; runs the enforcer `external_out` boolean, then the strict rails: **per-target consent** (via `EgressConsentPort`), **union-of-consents** (sensitive-read × external grant), **never-auto-transmit** (user-initiation proof required), and the **`EgressAuditRecord` producer** (via `EgressAuditPort`). Typed `EgressDenied` taxonomy. Fail-closed. M1 default ports (deny-safe consent · in-memory audit).                                                      | backend | XCU-06 | CapabilityEnforcer `#31` + `capability_grants`         | Vitest: permit path returns an audit record · deny per reason (`external_out_not_granted` · `sensitive_consent_missing` · `target_consent_missing` · `not_user_initiated`) · never-auto-transmit rejects a proof-less act · union requires **both** consents · typed-error assertions · **live-store smoke** (real `capability_grants` row → enforcer boolean → permit/deny) |
| S2  | **Compositional treat-fetch-as-egress (XCU-08)** — `assertFetchEgress` for an `external_in` fetch by a cap that **also holds a sensitive read**: the fetch URL/params are treated as an egress slice → reuses S1's **per-target consent + audit + never-auto-transmit**. The **boolean in/out union** (does the grant permit both a sensitive read and an external reach) is **delegated to `#31`** `[FACT: enforcer.ts:92-101]`; S2 adds only the _egress-act treatment_ of the fetch (consent + audit on the URL/params). "A fetch is an outbound request." | backend | XCU-08 | S1 (ports + taxonomy) + enforcer `#31` (boolean union) | Vitest: sensitive-read + `external_in` fetch → egress-gated (per-target consent + audit required) · a non-sensitive `external_in` fetch → NOT re-gated as egress (enforcer boolean only) · fetch URL/params captured into the audit slice · **live-store smoke** on a real compositional grant                                                                               |

## Why this order

- **S1 first** — it owns the `EgressAct`/`EgressDecision`/`EgressAuditRecord` types, the two persistence ports,
  the union computation, the never-auto-transmit guard, and the deny taxonomy that S2 reuses wholesale.
- **S2 next** — XCU-08 is the _compositional_ application of S1's machinery to an outbound fetch; it adds only the
  "a fetch by a sensitive-read cap is egress" rule (IR-3) on top of S1's gate.

## Coverage check (Decide — every P3 leg homed)

XCU-06 → S1 · XCU-08 → S2. **0 legs unhomed.** XCU-06u (audit VIEW + union presentation) = P6, OUT
`[FACT: xcut-ingestion-ai.md:20]`. No `structural` ECs (Envision N/A) → no Visual-Gate MUSTs to map.

## Explicitly out of scope (delegated — see interpretation ORGANIZATION)

- `external_out` **boolean** decision + in/out union across action checks → **CapabilityEnforcer `#31`** (BUILT).
- per-source external-in **layer** classification → **XS-ingestion `#44`**.
- **credential custody + provider call** (mediator injects the token; guard never holds it) → mediator/ingestion (XCU-09).
- the **model call / cognition** → **XS-ai `#45` / ADR-015** (a cloud call _rides_ this guard).
- **durable audit STORE + per-target consent STORE + real targets** → **M2** (the ports' real adapters, U-1/U-2).
- **audit-trail VIEW + conspicuous union presentation** → **P6 UI** (XCU-06u).
