# Invariants — XS-capability enforcement services

> The rules this service ENFORCES. References `docs/core/capability/current-business-rules.md` (BR-1..8, AR-7)
> + ADR-010; does not restate the registry rules. These are the NEW enforcement invariants (this issue).

- **INV-1 — Fail-closed default.** Every unknown/missing input resolves to *deny* (`no_grant`, `not_in_envelope`,
  `envelope_changed`, …); "allow" is only an explicit positive match. `[FACT: ADR-010 §3.2:72-73, §3.6:126-127]`
  (IR-4).
- **INV-2 — Shipped bypass.** Only `is_user_type=true` defs are enforced; shipped/trusted defs are always allowed and
  never read a grant. `[FACT: ADR-010 §3.1:56-58]`. (Complements BR-1 shipped/user split.)
- **INV-3 — Strict subset holds at grant time.** `grant()` rejects an envelope not `⊆` the def's declaration
  (`GrantExceedsDeclaration`); combined with BR-5 (a user def ⊆ shipped privilege union) this keeps the granted set
  doubly bounded. `[FACT: ADR-010 §3.3.5:95-96]` + `[FACT: current-business-rules.md:15]`.
- **INV-4 — Zero-knowledge is never needed nor broken.** The enforcer reads only plaintext envelope metadata + a
  keyless hash; it requires no vault key and can leak nothing to the server. `[FACT: ADR-010 §3.5:115-116]`.
- **INV-5 — Compositional-exfiltration union.** A grant holding **any** consented sensitive module (∈
  `SENSITIVE_MODULE_CLASSES`) **AND any external grant** (`external_in_ok` OR `external_out_ok`) is a consented
  exfiltration channel → requires the **union**: both the sensitive consent AND the external consent present, else
  `compositional_exfiltration`. `[FACT: ADR-010 §3.5:117-121]` + `[FACT: xcut-ingestion-ai.md:20]` (XCU-08) (IR-1).
  The per-target egress mediation/audit that follows an *allowed* external-out is XS-egress-guard `#43`.
- **INV-6 — Declaration drift is hash-detected and fails closed.** A grant whose stored `granted_envelope_hash` ≠
  `canonicalEnvelopeHash(currentDef)` is not-current → every action denies `envelope_changed` until re-granted. The
  hash covers the def's **declaration `{bindings, effects}`** (ADR-008 anatomy parts 3+5) — **not** `render_targets`
  (CB2), config, or the grant consent booleans — and is canonical (order-independent), so grant-time and drift-check
  hashes are symmetric. `[FACT: ADR-008:119-121]` + `[FACT: ADR-010 §3.2:68-79]` + `[FACT: capability.ts:58]` (IR-3).
- **INV-7 — Revocation is immediate + syncs.** `revoke` soft-deletes the grant; the next decision denies `no_grant`;
  the delete syncs (DATA-4). `[FACT: ADR-010 §3.2:74-75, §3.6:124-125]`.
- **INV-8 — Surface-split offered set.** `inline` = union (never fewer than the global base), `standalone` = the
  Space's `space_enabled_blocks` palette only. `[FACT: xcut-spaces.md:49]`.

- **INV-9 — Sensitivity is a consumer contract, not inferred from bindings.** The enforcer gates a sensitive read
  only via the explicit `sensitive` action; it does **not** infer sensitivity from `bindings` (no entity-type→module
  map, per R2). A consuming sensitive module (Finance, Health) **MUST** guard its reads with
  `assertPermitted(defId, { type: 'sensitive', moduleClass })` as part of its documented guarded-write path
  `[FACT: ADR-010 §3.3.2:84-86]`. This is what makes the compositional union (INV-5) hold across the two checks; a
  module that reads sensitive data via a bare `binding` action alone bypasses the consent gate.

## NOT enforced here (delegated — asserting the boundary)
- **No-double-count / idempotency** — ADR-004 §3.2.5 write path (`effect_event_id` + dedup). `[FACT: ADR-010
  §3.3.3:87-89]`.
- **Sandbox isolation + resource limits + identity(untrusted-mark)** — `#116 CAP-authoring`. `[FACT: ADR-010
  §3.4:98-104]`.
- **Egress mediation/audit + media encryption** — `#43` / EN-1/EN-2. This service *decides*; it does not transmit or
  encrypt. `[FACT: ADR-010 §3.5:107-114]`.
