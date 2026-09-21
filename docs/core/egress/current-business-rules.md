# foundation/egress — Current Business Rules

> Durable invariants for the egress-mediation service (XS-egress-guard #43). Promoted from
> `docs/specs/foundation/xs-egress-guard/` at §XXIX. Owning ADR: ADR-014 §3.3/§3.1 (+ ADR-015 §3.3).
> Kept current with `packages/core/src/foundation/egress/`.

- **EG-1 (fail-closed default).** Every missing/negative input denies — no user-initiation, unresolved target,
  `external_out` off, missing sensitive consent, no per-target consent. Permit is only the explicit step-6 match.
  [ADR-010 fail-closed; enforcer.ts:81-88] (INV-1)
- **EG-2 (boolean necessary, not sufficient).** `external_out_ok=true` (decided by #31) never alone permits;
  per-target consent + union + never-auto-transmit still gate on top. A blanket "allow external" never satisfies
  egress — the strictest grant. [ADR-014:64,66] (INV-2)
- **EG-3 (union = both halves).** A slice reading a sensitive module egresses only if BOTH the `sensitive` checks
  AND the `external_out` boolean pass — enforced across the two `enforcer.checkAction` calls. [ADR-010 §3.5;
  enforcer.ts:92-98] (INV-3)
- **EG-4 (a fetch is an egress act).** `assertFetchEgress` applies the identical gate; the fetch URL/params become
  the audited slice. A non-sensitive fetch has empty `sensitiveModules` → the union half is a no-op, the boolean
  governs. [ADR-014:42; capability-framework.md:200 (X6)] (INV-4)
- **EG-5 (never auto-transmit).** Every egress requires a `UserInitiationProof`; a proof-less (agent/code-composed)
  transmit denies `not_user_initiated`, and each cloud hop re-hits the gate — no silent on-device→cloud upgrade.
  [ADR-014:64; ADR-015:58 §3.4a] (IR-2)
- **EG-6 (audit is what+when, not content; sensitive; append-only).** The `EgressAuditRecord` names target + slice
  summary + sensitive tags + `at`, never the plaintext payload. When persisted (M2) it is field-encrypted `[E]`
  (R3/EN-2 — it describes what sensitive data left; plaintext would itself be an egress) and append-only (the
  ledger convention). [capability-framework.md:62; schema-audit-appendix.md:485; ADR-014:64] (INV-5/IR-8/IR-9)
- **EG-7 (check is pure; assert persists once).** `checkEgress` builds the record but never writes — a speculative
  check must not record an egress that never happened; `assertEgressPermitted` persists exactly once on permit.
  [PF-1] (INV-5)
- **EG-8 (an unresolvable def is a bug, not a deny).** If `enforcer.checkAction` throws `CapabilityNotFound`
  (def_id unknown), the guard lets it propagate — a programming error, not a policy denial. `EgressDenied` carries
  `defId` (parity with `CapabilityDenied`). [enforcer.ts:174; types.ts:125-134] (INV-7)
- **EG-9 (no credentials, no network, no store at M1).** The guard decides + produces the record; it never holds a
  token (mediator/XCU-09), never makes the provider call (ADR-015/#45), and the M1 ports are a deny-safe consent
  default + a no-op audit sink. The durable store + real targets are M2. [ADR-014:68,82; xcut-ingestion-ai.md:5] (INV-6)
- **EG-10 (target = integration-identity anchor).** An `EgressTarget` keys on the stable integration-identity
  anchor (decoupled from layer), not a raw URL — so a Layer-3→Layer-1 upgrade keeps grant + audit continuity.
  [ADR-014:78 §3.8; capability-framework.md:204 (X10)] (R-3)
