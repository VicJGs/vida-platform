# foundation/capability — Current Spec

> Durable contract for the capability registry (AR-7 Increment 2). Owning ADRs: ADR-008 + ADR-010.
> Kept current with `packages/core/src/foundation/capability/` + `db/schema/foundation/capability.ts` + `migrations/005_capability.ts`.

## What it is
The CB1 capability/block registry STRUCTURE + a thin registry — the definitions those `space_enabled_blocks.capability_def_id`
refs (AR-6) resolve to. Rides increment-1's `EFFECT_TYPE` (defs declare effects). Sandbox/DSL/authoring runtime deferred (`#85 CAP-authoring`).

## Surface
- **Tables (migration 005, all syncable):**
  - `capability_definitions` — `def_id` UNIQUE (semantic id) · `kind` (OPEN) · `render_targets·bindings·effects·config_schema·terminal_states` (JSON TEXT) · `is_user_type` · `deleted_at`. Only `is_user_type=1` rows persist.
  - `block_instances` — `capability_def_id · space_id · config [E] · deleted_at` (standalone placements; structure only).
  - `capability_grants` — `capability_def_id · granted_bindings · granted_effects · media_ok · external_in_ok · external_out_ok · consented_sensitive_modules · granted_envelope_hash` (ADR-010 envelope; structure only).
- **`@vida/types`:** `RENDER_TARGET = {inline, standalone}`. **`foundation/capability/types.ts`:** `TERMINAL_STATE` (code-level), `CapabilityDefinition`, 6 typed errors.
- **`CapabilityRegistry`** (`createCapabilityRegistry(db, deviceId)`): `register(def)` (BR-2..6 validation → persist user def via Repository → sync_queue), `get(id)` (shipped ∪ persisted, else `CapabilityNotFound`), `list()`. `SHIPPED_CAPABILITIES` seed (`habit_logger`).

### Enforcement services (XS-capability #31 · ADR-010 declare→grant→enforce)
The platform-agnostic envelope-enforcement decision tier over `capability_grants` — the *what* (ADR-010 §3.6); it
DECIDES, it does not execute (effect firing #32 · egress mediation #43 · ingestion layer #44 · user-code sandbox #116
are delegated). Spec: `docs/specs/foundation/xs-capability/`.
- **`createCapabilityEnforcer(db, deviceId, registry): CapabilityEnforcer`** (`foundation/capability/enforcer.ts`):
  - `checkAction(defId, action) → {allowed, reason?}` / `assertPermitted(defId, action)` (throws `CapabilityDenied`) —
    per-action decision; shipped-def bypass; fail-closed default. `action` = discriminated union
    `{effect|binding|media|external_in|external_out|sensitive}`; `reason` ∈ `DenyReason`.
  - `getGrant(defId) → CapabilityGrant | null` · `isEnvelopeCurrent(defId) → boolean` (drift check).
  - `grant(defId, envelope) → CapabilityGrant` (validates `envelope ⊆ declaration`, stamps `granted_envelope_hash`,
    persists + syncs) · `revoke(defId)` (soft-delete; syncs; next check → `no_grant`).
  - `canonicalEnvelopeHash(decl)` — keyless BLAKE2b (`hashContent`) over the **declaration `{bindings, effects}`**,
    sorted/order-independent. `SENSITIVE_MODULE_CLASSES = {finance, health}`.
- **`createOfferedSetResolver(db, registry): OfferedSetResolver`** (`foundation/capability/offered-set.ts`):
  `resolveOfferedSet(spaceId, surface)` — `inline`=union (all inline-capable), `standalone`=restrict to the Space's
  active `space_enabled_blocks` palette; stale/soft-deleted refs excluded (graceful).
- **Grants Repository wiring:** `{ deviceId, encryptedFields: [], softDelete: true }`. ⚠ `Repository.findWhere` runs
  the raw clause and does NOT apply the soft-delete filter (only `findAll`/`findById`/`count` do) → `getGrant`/`revoke`
  filter `isNull(deleted_at)` explicitly via the `activeGrant()` clause.

## Tests
`foundation/capability/__tests__/capability.test.ts` (registry — migration wiring · register+enqueue · get · BR-2..6).
`__tests__/enforcer.test.ts` (S1 decision core + S2 grant/revoke — 23 tests: fail-closed · shipped bypass · per-action
gates · envelope drift · hash symmetry · grant subset/CapabilityNotFound/re-grant · revoke fail-closed · live-store).
`__tests__/offered-set.test.ts` (S3 — inline union · standalone restrict · empty/stale/soft-deleted palette). No
enum-parity row (`render_target` is JSON, not a scalar CHECK).

## Deferred
See current-business-rules.md § Deferred (all homed via DF-12).
