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

## Tests
`foundation/capability/__tests__/capability.test.ts` (migration wiring · register+enqueue · get shipped/user/missing · BR-2/3/4/5/6). No enum-parity row (`render_target` is JSON, not a scalar CHECK).

## Deferred
See current-business-rules.md § Deferred (all homed via DF-12).
