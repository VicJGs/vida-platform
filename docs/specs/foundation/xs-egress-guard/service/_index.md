# Service Spec — XS-egress-guard (#43, LIF-171)  ·  IMPLEMENTATION-PLAN (§XXVI gate 2)

> The service/ spec set (operations · operation-flow · invariants · contract · composition) for the
> `foundation/egress` mediation service. Contract = `../delivery/seam-contract.md`; composition = the
> interpretation ORGANIZATION section. Every rule is `[FACT: path:line]` or grounded `[INTERPRETATION]`.
> Pattern: factory-of-closures (no `this` — `createCapabilityEnforcer` precedent `[FACT: enforcer.ts:118-228]`).

## Files (mirrors every `foundation/<svc>/` — `[FACT: foundation tree]`)
- `packages/core/src/foundation/egress/types.ts` — acts, decision, audit record, ports, `EgressDenied` error.
- `packages/core/src/foundation/egress/service.ts` — `createEgressGuard(enforcer, ports?)`.
- `packages/core/src/foundation/egress/index.ts` — barrel (mirrors `effects/index.ts`).
- `packages/core/src/foundation/egress/__tests__/service.test.ts` — Vitest.
- `packages/core/src/foundation/egress/CLAUDE.md` — layer doc (D6 substrate note).
- Re-export from `packages/core/src/index.ts` (the `@vida/core` barrel) as the other foundation services are.

## Resolved pre-flight assumptions (PF)
- **PF-1** — `checkEgress` is pure (builds, no write); `assertEgressPermitted` persists once on permit (see flow).
- **PF-2** — `createEgressGuard` returns an `EgressGuard` interface declared in `types.ts` (mirrors `CapabilityEnforcer`).
- **PF-3** — `enforcer` param typed `CapabilityEnforcer`, imported from `../capability` (its `index.ts` exports it).
- **PF-4** — `at` = `Date.now()` (Unix ms) at record time (production service code — `Date.now()` is fine here).
- **PF-5** — live-store smoke reuses the foundation test-DB harness (real `capability_grants` seeded via
  `createCapabilityEnforcer.grant`); run under **Node 24** (better-sqlite3 ABI — the LIF-168 follow-up).

## Operations
| op | signature | leg |
|----|-----------|-----|
| `assertEgressPermitted` | `(act: EgressAct) => Promise<EgressAuditRecord>` — throws `EgressDenied` | XCU-06 |
| `checkEgress` | `(act: EgressAct) => Promise<EgressDecision>` — non-throwing | XCU-06 |
| `assertFetchEgress` | `(act: FetchEgressAct) => Promise<EgressAuditRecord>` — builds an `EgressAct` (source→target, params→slice) then routes through the one core gate | XCU-08 |

## Operation-flow — the core gate (`checkEgress`; `assert*` throw on `!permitted`)
Order is load-bearing (fail-closed short-circuits earliest):
1. **never-auto-transmit** — `act.userInitiation?.kind !== 'user_action'` → deny `not_user_initiated`.
   `[FACT: ADR-014:64; ADR-015:58 (§3.4a)]` (IR-2).
2. **target resolvable** — `act.target.integrationId` empty/unset → deny `target_unresolved` (R-3).
   `[FACT: ADR-014:78 (§3.8)]`.
3. **external_out boolean** — `enforcer.checkAction(act.defId, {type:'external_out', target: integrationId})`;
   `!allowed` → deny `external_out_not_granted`. Delegated to `#31` `[FACT: enforcer.ts:79,99-101]`.
4. **union — sensitive half** — for **each** `m ∈ act.slice.sensitiveModules`:
   `enforcer.checkAction(act.defId, {type:'sensitive', moduleClass: m})`; any `!allowed` → deny
   `sensitive_consent_missing`. Steps 3+4 together ARE the compositional union (both must pass)
   `[FACT: enforcer.ts:92-98 "enforced ACROSS the two action checks"]` (IR-4).
5. **per-target consent** — `await ports.consent.hasTargetConsent(act.defId, act.target)`; `false` → deny
   `target_consent_missing`. The finer-than-boolean per-target gate (R-2) `[FACT: ADR-014:64]`.
6. **permit (build, do NOT persist)** — build `EgressAuditRecord { defId, target, sliceSummary:
   act.slice.summary, sensitiveModules, unionConsented: act.slice.sensitiveModules.length > 0, at: Date.now() }`
   and return `{ permitted:true, audit:record }`. **`checkEgress` is pure — it never writes** (PF-1).

**Persistence is on the asserting path only (PF-1).** `assertEgressPermitted` calls `checkEgress`; on
`!permitted` throws `new EgressDenied(reason)`; on permit it `await ports.audit.record(decision.audit)` **once**
then returns the record. A speculative `checkEgress` therefore records nothing — the audit trail holds exactly
the egresses asserted-and-permitted (INV-5). `assertFetchEgress` constructs `EgressAct` from the fetch
(`target = act.source`, `slice = { summary: act.fetchParams, sensitiveModules: act.slice.sensitiveModules }`)
then calls `assertEgressPermitted` — one gate, one record, a fetch is an egress act `[FACT: ADR-014:42]` (R-4).

**`unionConsented`** = `sensitiveModules.length > 0` (vacuously false for a non-sensitive egress — it records
whether a sensitive×external union was actually required + satisfied, not a blind `true`).

## Invariants (INV-*)
- **INV-1 — Fail-closed default.** Every missing/negative input → deny (no user-initiation, unresolved target,
  boolean off, missing sensitive consent, no per-target consent). Permit is only the explicit step-6 match.
  `[FACT: enforcer.ts:81-88; ADR-010 fail-closed]` (IR-5).
- **INV-2 — Boolean necessary, not sufficient.** Step 3 passing never alone permits; steps 4–5 still gate.
  `[FACT: ADR-014:64,66]` (IR-1).
- **INV-3 — Union = both halves.** A slice reading a sensitive module egresses only if BOTH the `sensitive`
  checks AND the `external_out` boolean pass. `[FACT: ADR-010 §3.5; enforcer.ts:92-98]` (IR-4).
- **INV-4 — A fetch is an egress act.** `assertFetchEgress` applies the identical gate; its params become the
  audited slice. A non-sensitive fetch has an empty `sensitiveModules` → step 4 is a no-op, the boolean governs.
  `[FACT: ADR-014:42; capability-framework.md:200 (X6)]` (IR-3).
- **INV-5 — Audit is what+when, not content; sensitive; append-only.** The record names target + slice summary +
  sensitive tags + `at`, never the plaintext payload; the M2 store field-encrypts it (`[E]`,
  `[FACT: capability-framework.md:62 R3/EN-2]`) and is append-only
  (`[FACT: schema-audit-appendix.md:485 ledger convention]`) (IR-8/IR-9).
- **INV-7 — An unresolvable def is a bug, not a deny.** If `enforcer.checkAction` throws `CapabilityNotFound`
  (def_id not in the registry), egress-guard lets it **propagate** — it is a programming error, not a policy
  denial (fail-closed governs *policy* inputs, not a missing def). `[FACT: enforcer.ts:174]`. `EgressDenied`
  carries `defId` (parity with `CapabilityDenied(defId, reason)` `[FACT: types.ts:125-134]`).
- **INV-6 — No credentials, no network, no store at M1.** The guard decides + produces the record; it never holds
  a token (mediator/XCU-09), never makes the provider call (ADR-015/#45), and the M1 ports are a deny-safe consent
  default + an in-memory audit sink. `[FACT: ADR-014:68,82; xcut-ingestion-ai.md:5]` (R-1/R-2).

## M1 default ports (no schema)
```ts
const denySafeConsent: EgressConsentPort = { async hasTargetConsent() { return false } } // R-2, fail-closed
const inMemoryAudit = () => { const log: EgressAuditRecord[] = []
  return { port: { async record(e) { log.push(e) } } as EgressAuditPort, log } }          // R-1, testable
```
`createEgressGuard(enforcer)` defaults to `denySafeConsent` — so out of the box egress is DENIED until a caller
supplies a consent adapter (fail-closed by construction). Tests inject a stub consent port + the in-memory audit.

## Build Steps (per-slice; each closes with its Verification Gate before the next)
- **S1 (XCU-06):** `types.ts` (all types + `EgressDenied`) → `service.ts` (`createEgressGuard` + steps 1–6 +
  default ports) → `index.ts` + `@vida/core` re-export → `CLAUDE.md` → tsc 0 → Vitest (permit path · each deny
  reason · never-auto-transmit · union both-halves · fail-closed default consent) + **live-store smoke** (a real
  `capability_grants` row via `createCapabilityEnforcer` → permit/deny) → Verification Gate PASS.
- **S2 (XCU-08):** `assertFetchEgress` in `service.ts` (act constructor → core gate) → tsc 0 → Vitest
  (sensitive-read fetch → union-gated · non-sensitive fetch → boolean only · params captured to audit) +
  live-store smoke on a compositional grant → Verification Gate PASS.
- **Currency §XXIX:** birth `docs/core/egress/current-{spec,business-rules}.md` (D6), promote INV-1…6; commit with code.

## Acceptance (§4)
All ops typed + exported; INV-1…6 test-proven incl. live-store; tsc 0; eslint 0; `@vida/core` suite green;
current-* docs born. No new DB table/migration (R-1/R-2 M1 scope). `/critique` → SHIP.
