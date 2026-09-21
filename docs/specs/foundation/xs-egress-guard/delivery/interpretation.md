# Interpretation — XS-egress-guard (#43, LIF-171)

> Entity Delivery Flow §3 — the interpretation layer for the `foundation/egress` mediation/consent service.
> Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]` (No-Guessing Principle).
> Mode: **Build-from-docs** (§8 Decide-mode) — P3 fixed **2 legs**, no prior code exists (Step-0 baseline:
> `foundation/` has no `egress/` dir; the capability enforcer *delegates* egress mediation as unbuilt).
> Source of the split: `[FACT: docs/specs/foundation/backend-intent/decomposition.md:44]`.

## Scope in one line
Build the **per-target egress-mediation SERVICE tier** — *the strictest grant in the system* — that layers
**per-target explicit consent + union-of-consents + audit trail + never-auto-transmit** on top of the capability
enforcer's already-decided `external_out_ok` boolean, plus the **compositional-exfiltration rule (XCU-08)** that
treats *any* outbound fetch (even an `external_in` pull) as egress. `[FACT: ADR-014:64 "most tightly gated grant"]`

## Scope boundary — foundation-first, M1 seam not M2 wiring
The corpus is explicit that XCU-06/08 are **"M2-facing (no module ships these at M1), but the service-tier seams
are captured now so the corpus is complete."** `[FACT: xcut-ingestion-ai.md:5]` No M1.1.2 module actually egresses
(Finance/Health external *push*, AI *cloud call* are all later — `#45`/`#47`/`#61`). So this head builds the
**finished decision/mediation service + its persistence PORT**, which a P6 audit/consent face then rides —
`[FACT: PLAN-p6-frontend-track.md:189 "the 8 legs consume the finished M1.1.2 twins (XS-egress-guard #43 …)"]`.
The **durable audit STORE, per-target consent STORE, credential injection, real targets, and the audit/consent UI**
are M2/P6 (see DELEGATES + UNKNOWNs). `[INTERPRETATION from the three FACTs above + X5 no-new-table + DB-4 closed]`

## The 2 legs (P3-homed, both typed `service`)
- **XCU-06 — Egress guard.** Vault-leaving data requires **per-target explicit consent** + **union-of-consents** +
  an **audit trail of what left & when** + **never auto-transmit** (always user-initiated). *Strictest grant.*
  `[FACT: xcut-ingestion-ai.md:19]` · `[FACT: ADR-014:64 (§3.3)]` · `[FACT: capability-framework.md:198 (X4)]`.
  → BUILD 🕳 (service half). The **audit-trail VIEW + conspicuous union presentation** (XCU-06u) is the UI face →
  **P6, OUT of scope** `[FACT: xcut-ingestion-ai.md:20]`.
- **XCU-08 — Compositional-exfiltration rule.** A capability holding a **sensitive read + ANY external grant**
  (`external_in_ok` OR `external_out_ok`) is a consented exfiltration channel → its **outbound fetch URL/params are
  treated as egress** → union-of-consents (a fetch is an outbound request, so *ingress can carry egress*).
  `[FACT: xcut-ingestion-ai.md:22]` · `[FACT: ADR-014:42 (§3.1)]` · `[FACT: capability-framework.md:200 (X6)]`.
  → BUILD 🕳. **NB — the enforcer already does part of this:** `#31` enforces the union *across* its `sensitive`
  and `external_out` action checks (an unconsented sensitive read is blocked before any external reach)
  `[FACT: packages/core/src/foundation/capability/enforcer.ts:92-101]`. The egress-guard half is the *mediation*
  side XCU-07 explicitly left to `#43`: treating an outbound fetch **as an egress act** subject to per-target
  consent + audit + never-auto-transmit — not the boolean.

## DEPENDENCIES (every upstream)
- **CapabilityEnforcer (`#31`, BUILT)** — decides the `external_out_ok` **boolean** (`decideExternal`) + the
  in/out compositional union across action checks; egress-guard runs *after* that boolean passes.
  `[FACT: packages/core/src/foundation/capability/enforcer.ts:99-101]` · delegation stated
  `[FACT: enforcer.ts:7 "egress mediation (#43) … delegated"]` · `[FACT: docs/core/capability/current-business-rules.md:61-62]`.
- **`capability_grants` envelope (AR-7, structure-only)** — `external_out_ok` (per-target egress boolean today),
  `consented_sensitive_modules`, the grant a def carries. `[FACT: packages/core/src/foundation/capability/enforcer.ts:130-141]`.
- **ADR-010 §3.5 union-of-consents rule** — the "both a sensitive read AND external-out ⇒ conspicuous combined
  consent" invariant this service enforces at the egress act. `[FACT: ADR-014:64 (cites ADR-010 §3.5)]`.
- **NO new schema.** Two distinct grounds, kept separate: **(i)** the grant *envelope* takes **"no new
  column/table"** — `external_in_ok`/`external_out_ok` ride the existing `capability_grants` row (X5 governs
  *grant semantics only*) `[FACT: capability-framework.md:199 (X5)]`; **(ii)** the *audit/consent store* is not
  X5's subject — it is deferred because DB-4 (M1.0, closed) authored **no** `egress`/`audit`/`consent` table
  (Step-0 grep: ABSENT across `packages/core/src/db/schema/`) and the corpus marks these M2-facing
  `[FACT: xcut-ingestion-ai.md:5]`. `[FACT: Step-0 baseline]`.
- **ADR-004 §3.2.5 guarded-write rail** — NOT owned here; a tool-write that follows a permitted egress rides it.
  `[FACT: ADR-014:82 "Does NOT own … the write rail (ADR-004 §3.2.5)"]`.

## NEEDS (preconditions to function)
- **An "egress act" descriptor** — the unit the guard adjudicates: `{ initiating def_id, target, data-slice
  summary, user_initiated proof }`. `[INTERPRETATION — assembled from XCU-06's four requirements]`; the exact
  `target` identity shape is **U-3**.
- **The initiating cap's grant resolvable** via the enforcer — `external_out_ok` true AND (if the slice reads a
  sensitive class) `consented_sensitive_modules` present, else **fail closed before egress is even considered**.
  `[FACT: enforcer.ts:71-80]`.
- **A user-initiation token on the act** — never-auto-transmit means the guard rejects any egress lacking proof of
  a user-initiated act, *even for a granted target*; an agent's `askModel` re-hits this per hop.
  `[FACT: ADR-014:64]` · `[FACT: ADR-015:58 (§3.4a "every askModel call re-hits the per-target egress consent + scope gate")]`.
- **A typed audit record producer** — `{ what left, to whom, when }`; produced by the service, **returned** (M1),
  persisted later (**U-1**). `[FACT: xcut-ingestion-ai.md:19 "audit trail of what left & when"]`.
- **Vault key** is NOT required by the guard itself (it reads plaintext grant booleans + composes a decision);
  any downstream persistence of an audit row would hit the Repository content-hash seam — the MOD-notes bug class,
  backstopped by the live-store Verification Gate. `[FACT: docs specs entity-delivery-flow §Anti-Patterns]`.

## ORGANIZATION (owns / consumes / delegates)
- **OWNS:** the egress-mediation **decision** service — `assertEgressPermitted(act)` / `checkEgress(act)` (the
  strict per-target gate) · the **union-of-consents** computation at the egress act (sensitive-read × external
  grant) · the **never-auto-transmit** guard (user-initiation required) · the **compositional treat-fetch-as-egress**
  rule (XCU-08) · the **typed audit-record producer** + the typed egress deny/error taxonomy.
- **CONSUMES:** the CapabilityEnforcer's boolean decision + grant envelope `[FACT: enforcer.ts:99-141]`; the
  ADR-010 §3.5 union rule; **no schema of its own**.
- **DELEGATES:**
  - the `external_out_ok` **boolean** decision + in/out union *across action checks* → **CapabilityEnforcer `#31`**
    (BUILT) `[FACT: enforcer.ts:92-101]`;
  - **per-source external-in LAYER classification** → **XS-ingestion `#44`** (XCU-02) `[FACT: xcut-ingestion-ai.md:14]`;
  - **mediator credential custody + provider call** (the mediator injects the token, egress-guard never holds it) →
    the mediator/ingestion tier (XCU-09) `[FACT: ADR-014:68]`;
  - the **model call / cognition** (a cloud AI call is an egress that *rides* this guard, but ADR-015 owns the call)
    → **XS-ai `#45` / ADR-015** `[FACT: ADR-014:82]` · `[FACT: ADR-015:54 (§3.3)]`;
  - the **audit-trail VIEW + conspicuous union presentation** (XCU-06u) → **P6 UI** `[FACT: xcut-ingestion-ai.md:20]`;
  - the **durable audit STORE + per-target consent STORE + real egress targets** → **M2** (U-1/U-2/U-3).

## IMPLICIT RULES (surfaced hidden invariants)
- **IR-1 — Egress is stricter than the boolean.** The enforcer's `external_out_ok = true` is **necessary but not
  sufficient**; egress-guard adds per-target consent + audit + never-auto-transmit on top. A blanket "allow external"
  grant is an anti-signal. `[FACT: ADR-014:64 (§3.3), :66 (§3.4); capability-framework.md:198 (X4)]`.
- **IR-2 — Never auto-transmit; every hop re-consents.** Every egress is user-initiated; the guard rejects an
  agent-/code-composed transmit lacking a user-initiation proof, and an `askModel` re-hits the gate **per call** —
  no silent on-device→cloud upgrade. `[FACT: ADR-014:64; ADR-015:58 (§3.4a), :51 (§3.2 "never silently upgrade")]`.
- **IR-3 — A fetch is an outbound request.** An `external_in` fetch's URL/params are egress; the guard treats
  ingress-carrying-egress identically to `external_out`. Anti-signal: an `external_in` fetch treated as safe because
  "it's ingress." `[FACT: ADR-014:42 (§3.1); capability-framework.md:200 (X6)]`.
- **IR-4 — Union means conspicuously combined, not two silent booleans.** A cap with *both* a sensitive read and an
  external grant must present that combination as one consented exfiltration channel. The enforcer checks *presence*
  (`#31`); egress-guard is where the *combined* consent + audit lands at the egress act. `[FACT: ADR-014:64 (ADR-010 §3.5 "must present that combination conspicuously")]`.
- **IR-5 — Fail-closed is the default return.** A missing target-consent, a missing user-initiation proof, an
  unresolved grant, or an unresolved audit sink → **deny**; "permit" is only an explicit positive match (mirrors the
  enforcer's IR-4). `[FACT: enforcer.ts:81-88; ADR-010 fail-closed]`.
- **IR-6 — Revocation stops future egress; sent data cannot be un-sent.** Revoke halts future transmits and fails
  closed; data already egressed is recorded in the audit trail and cannot be recalled (a local purge restores no
  privacy). `[FACT: ADR-014:70 (§3.4)]`.
- **IR-7 — Prompt-injection cannot exfiltrate past the consent gate.** An injected instruction can make a model
  *say* something, but the outgoing egress slice is user-reviewed/consented content — the guard's per-target consent
  gate cannot be auto-widened or given a new target by agent-composed text. `[FACT: ADR-015:60 (§3.4b)]`.
- **IR-8 — The audit record is itself sensitive → `[E]` when persisted.** `EgressAuditRecord.sliceSummary` +
  `sensitiveModules` *describe what sensitive data left the vault*; persisting them in plaintext would itself be an
  egress leak. The M2 audit store MUST field-encrypt the record (L2 `[E]`, ADR-002 three-layer encryption) — the
  M1 in-memory adapter never touches disk, so the constraint binds the M2 adapter, not this build. `[INTERPRETATION
  from ZK-1 + the audit-trail requirement; FACT: ADR-002 §L2 field-level encryption]`.
- **IR-9 — The audit trail is append-only.** "An audit trail of what left & when" is meaningful only if immutable —
  an editable/deletable trail is not one. The `EgressAuditPort.record` contract is append-only; the M2 store must
  forbid update/delete of a recorded egress. `[FACT: ADR-014:64 "audit trail"; INTERPRETATION: append-only]`.

## RESOLVED FROM THE DOCS (no open decisions — all doc-determined)
- **R-1 — Audit-trail persistence home = M1 record + port, M2 store.** The audit trail is a deliverable OF this
  service `[FACT: ADR-014:132 "the egress guard + audit"; corpus.md:228]`, and the corpus marks XCU-06/08
  M2-facing with the *seam* captured now `[FACT: xcut-ingestion-ai.md:5]`; DB-4 (closed) authored no egress-audit
  table (Step-0 grep). So M1 produces the typed audit **record** + a persistence **port**; the durable store lands
  **M2**. That store is **field-encrypted `[E]`** `[FACT: capability-framework.md:62 (R3/EN-2 — every sensitive
  field is [E], L2/L3)]` and **append-only** `[FACT: schema-audit-appendix.md:485 — the consequence_ledger
  append-only convention]` (IR-8/IR-9). No table now; not a choice — the corpus + DB-4 + R3/EN-2 settle it.
- **R-2 — Per-target consent = M1 port, M2 store.** `external_out_ok` is the single grant boolean (enforced by
  `#31`); the **per-target** consent XCU-06 demands `[FACT: ADR-014:64]` is a finer record the corpus places at M2
  `[FACT: xcut-ingestion-ai.md:5]`. M1 consults a consent **port** (deny-safe default); the store is M2. Same
  grounds as R-1 — no table now.
- **R-3 — `target` identity = the stable integration-identity anchor.** Not a raw URL — a per-source id decoupled
  from the layer, so a Layer-3→Layer-1 upgrade keeps grant + audit continuity. `[FACT: ADR-014:78 (§3.8);
  capability-framework.md:204 (X10)]`. Doc-mandated, not a lean.
- **R-4 — One egress gate; a fetch is an egress act.** XCU-08's "a fetch is an outbound request" `[FACT:
  ADR-014:42]` means the compositional case routes through the *same* gate as XCU-06 — the fetch's URL/params ARE
  the egress slice. `assertFetchEgress` constructs that act and calls the one core gate; it is not a second gate.

## Verdict
A real **BUILD** of a pure decision/mediation service (no schema, no runtime targets) over the BUILT capability
enforcer — the strictest gate in the system, foundation-first. Every shape question (R-1…R-4) is **settled in the
documentation**; there is nothing open to decide — the build ratifies the docs.
