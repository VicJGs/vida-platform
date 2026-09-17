# foundation/capability — Current Business Rules

> Durable invariants for the capability registry (AR-7 Increment 2). Promoted from
> `docs/specs/foundation/ar-7-capability-registry/capability/` at §XXIX. Owning ADRs: ADR-008 (CB1–6) + ADR-010 (A2/A5).
> Kept current with `packages/core/src/foundation/capability/`.

- **BR-1 (definition registry).** The registry holds capability **definitions** (`id · kind · render_targets ·
  bindings · effects · config_schema · terminal_states`); shipped defs are **code-registered** (in-memory), user defs
  **persisted** + synced. The semantic `id` is the `def_id` UNIQUE business key (the row PK is a generated UUIDv7 —
  `repository.create()` always generates it; mirrors `session_type_registry.sub_type`). [ADR-008 §3.4]
- **BR-2 (render targets — CB2).** `render_targets` ⊆ `{inline, standalone}` (`RENDER_TARGET`, FIXED); else `InvalidRenderTarget`.
- **BR-3 (declared effects — CB4).** `effects[]` ⊆ `EFFECT_TYPE` (increment-1 vocab); declaration only — firing deferred; else `UnknownDeclaredEffect`.
- **BR-4 (terminal states — CB6).** Every supported render target declares all four `TERMINAL_STATE`
  (`loading·empty·error·success`); else `MissingTerminalStates`.
- **BR-5 (strict subset — A4.5).** A user def's `effects ∪ bindings` ⊆ the **shipped privilege union**; else
  `CapabilityPrivilegeExceeded`. Single-level (a def has no separate internal envelope — the grant envelope is a
  separate `capability_grants` row, deferred). [ADR-010 §3.3:95-96]
- **BR-6 (identity — A5).** A def's `id` is unique across shipped + persisted; a shipped id or a duplicate → `DuplicateCapabilityId`. [ADR-010 §3.4]
- **BR-7 (block_instances).** Standalone placements = syncable rows (DATA-4); `config` with user literals is `[E]`
  (EN-2). **Structure only** this increment — no placement-creation service (→ MOD-notes/UI-3). [ADR-008 §3.4]
- **BR-8 (capability_grants).** The declare→grant envelope table (exact 8 fields per ADR-010 §3.2 +
  `granted_envelope_hash`), syncable. Structure shipped at AR-7; the **envelope-enforcement decision tier + grant
  lifecycle (grant/revoke/re-grant) are now BUILT at XS-capability `#31`** (see BR-9..17). Only the user-code
  **execution sandbox + authoring DSL/UI** remain deferred (→ `#116 CAP-authoring`). [ADR-010 §3.2]

## Enforcement invariants (XS-capability #31 · ADR-010 — the enforce tier)
Promoted from `docs/specs/foundation/xs-capability/service/invariants.md`. The decision tier over the AR-7
`capability_grants` structure — DECIDES, does not execute.
- **BR-9 (fail-closed default).** Every unknown/missing input resolves to *deny* (`no_grant`, `not_in_envelope`,
  `envelope_changed`, …); "allow" is only an explicit positive match, and an unrecognized action denies (never crashes).
  [ADR-010 §3.2/§3.6]
- **BR-10 (shipped bypass).** Only `is_user_type=true` defs are enforced; shipped/trusted defs are always allowed and
  never read a grant. [ADR-010 §3.1]
- **BR-11 (strict subset at grant).** `grant()` rejects an envelope not `⊆` the def's declared `{bindings, effects}`
  (`GrantExceedsDeclaration`); with BR-5 the granted set is doubly bounded. [ADR-010 §3.3.5]
- **BR-12 (zero-knowledge).** The enforcer reads only plaintext envelope metadata + a keyless hash; needs no vault key,
  leaks nothing to the server. [ADR-010 §3.5]
- **BR-13 (compositional-exfiltration union).** A grant holding a consented sensitive module AND any external grant is
  a consented exfiltration channel; the union (both consents) must hold — enforced across the `sensitive` + `external`
  checks. [ADR-010 §3.5 · xcut XCU-08]
- **BR-14 (declaration drift, hash-symmetric).** A grant whose `granted_envelope_hash` ≠ `canonicalEnvelopeHash(currentDef)`
  is not-current → denies `envelope_changed` until re-granted. The hash covers the def's declaration `{bindings, effects}`
  only (ADR-008:119-121) — not `render_targets`/config/consent booleans — so grant-time and drift hashes are symmetric.
  [ADR-008 §3.3 · ADR-010 §3.2]
- **BR-15 (revocation immediate + syncs).** `revoke` soft-deletes the grant (`deleted_at`, still syncs); the next
  decision denies `no_grant`. [ADR-010 §3.2/§3.6]
- **BR-16 (surface-split offered set).** `inline` = union (non-restrictive); `standalone` = the Space's
  `space_enabled_blocks` palette only. [xcut XCU-SP-29]
- **BR-17 (sensitivity is a consumer contract).** Sensitivity is gated only via the explicit `sensitive` action; the
  enforcer does not infer it from `bindings`. A consuming sensitive module (Finance, Health) MUST guard its reads with
  the `sensitive` action as part of its guarded-write path — this is what makes BR-13's union hold. [ADR-010 §3.3.2]

**NOT enforced here (delegated):** no-double-count/idempotency (ADR-004 §3.2.5) · sandbox isolation + resource limits +
untrusted-mark (#116) · egress mediation/audit + media encryption (#43 / EN-1/EN-2). Effect *firing* is #32; the
enforcer only decides `effect ∈ envelope`.

## Deferred (not in this increment — all homed, DF-12)
User-code **execution sandbox + resource limits + authoring DSL/UI** → `#116 CAP-authoring` (the envelope-enforcement
decision + grant lifecycle are BUILT at XS-capability `#31` — BR-9..17). Registry runtime (block placement · inline
instances · TipTap re-home · BlockType union · per-Block visual) → MOD-notes / UI-3 `#29`. External per-source **layer**
→ XS-ingestion `#44`; per-target egress **mediation + consent + audit** → XS-egress-guard `#43` (XS-capability decides
only the grant boolean + compositional union). Views-hosting seam → ADR-008 §6 conditional.
