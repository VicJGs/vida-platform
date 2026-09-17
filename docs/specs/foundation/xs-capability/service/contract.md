# Contract — XS-capability (the DX consumers feel)

> The backend's "UX": return shapes, validator schemas, error taxonomy, encryption/security posture, sync behavior.
> The stable surface is mirrored in `../delivery/seam-contract.md`; this adds the posture + schema detail.

## Return shapes
- `checkAction` → `{ allowed: boolean; reason?: DenyReason }` (never throws for a *policy* deny).
- `assertPermitted` → `void` on allow; throws `CapabilityDenied(defId, reason)` on deny (the guard-call ergonomics —
  a consumer writes `await enforcer.assertPermitted(id, {type:'effect', effect}); rail.fire(...)`).
- `grant` → the persisted `CapabilityGrant` (decrypted row shape).
- `getGrant` → `CapabilityGrant | null` (null is a normal "no grant", not an error).
- `isEnvelopeCurrent` → `boolean`.
- `resolveOfferedSet` → `CapabilityDefinition[]` (registry shape, `[FACT: capability/types.ts:18]`).

## Input / validator schemas
- `CapabilityAction` — discriminated union on `type` (Zod `z.discriminatedUnion`); validated at the boundary.
- `GrantEnvelope` — `{ granted_bindings: string[]; granted_effects: EffectType[]; media_ok: boolean;
  external_in_ok: boolean; external_out_ok: boolean; consented_sensitive_modules: string[] }` — mirrors the 8-field
  `capability_grants` minus the derived `granted_envelope_hash` (service-computed, never caller-supplied).
  `[FACT: capability.ts:47-59]`.

## Error taxonomy (typed, no raw SQLite/Repository errors leak)
`CapabilityDenied` (policy) · `GrantExceedsDeclaration` (grant beyond declaration) · `GrantNotFound` ·
`CapabilityNotFound` (reused from AR-7, `[FACT: capability/types.ts:59]`). A `DenyReason` is a stable string enum a
consumer can branch on (e.g. surface `envelope_changed` → re-grant prompt in P6).

## Security / ZK posture
- Envelope fields are **plaintext queryable metadata** (grant is a policy record, not user content) — no field-level
  `[E]` on `capability_grants` `[FACT: current-spec.md:14]`. The enforcer needs **no vault key** (INV-4).
- `media` capture *encryption* and *egress* are decided here but performed elsewhere (EN-1/EN-2, `#43`).

## Sync behavior
- `grant` / `revoke` write `capability_grants` through the generic Repository → **co-transactional `sync_queue`
  enqueue** → syncs like any DATA-4 row `[FACT: repository.ts:191-195]`; `revoke` = soft-delete (`deleted_at`), also
  syncs. Enforcement/resolver reads never write, never enqueue.
- Cross-device: a grant + its def sync together; the same envelope enforces identically everywhere (§3.6) — this
  service *is* that platform-agnostic decision core.
