# Operations — XS-capability enforcement services

> The operation surface (backend's "Screens"): every method, signature, typed error. ADR-010 grounded.

## Factory
```ts
// One service object (factory pattern — no `this`, hoist intra-calls to closures per @vida/core convention).
export function createCapabilityEnforcer(
  db: DrizzleDb,
  deviceId: string,
  registry: CapabilityRegistry,   // AR-7 — resolves declared envelope + is_user_type
): CapabilityEnforcer
```

## S1 — Enforcement decision core + grant reads
```ts
assertPermitted(defId: string, action: CapabilityAction): Promise<void>   // throws CapabilityDenied
checkAction(defId: string, action: CapabilityAction): Promise<EnforcementDecision>  // non-throwing
getGrant(defId: string): Promise<CapabilityGrant | null>                  // read (decision needs it)
isEnvelopeCurrent(defId: string): Promise<boolean>                        // read (decision needs it)
```
- Resolves the def (registry). **Shipped def (`is_user_type=false`) ⇒ allowed, no grant read** (INV-2).
- User def: loads the grant row; **no grant ⇒ deny `no_grant`** (INV-1 fail-closed).
- Matches `action` against the grant envelope (see operation-flow.md for the per-type rule).
- `assertPermitted` throws `CapabilityDenied(defId, reason)`; `checkAction` returns `{allowed, reason}`.
- `getGrant` + `isEnvelopeCurrent` are grant **reads** the decision path calls (S1); the grant **writes**
  (`grant`/`revoke`) are S2 — reads and writes split by slice (no S1→S2 dependency inversion).

## S1 — Canonical declaration hash (pure)
```ts
export function canonicalEnvelopeHash(decl: DeclaredEnvelope): string  // sorted keys+arrays → BLAKE2b hex
type DeclaredEnvelope = Pick<CapabilityDefinition, 'bindings' | 'effects'>
```
- Hashes the def's **declaration** — the privilege-relevant parts of the ADR-008 6-part anatomy: **`{bindings,
  effects}`** (part 3 + part 5). `[FACT: ADR-008 §3.3:64-78]` + `[FACT: ADR-008:119-121]` ("definitions = id · kind ·
  declared render-targets · declared bindings · declared effects · config schema"). Excluded: `render_targets` (part
  4, CB2 — not a privilege, R4), `config_schema` (part 2, per-instance inputs — not a privilege), `kind`/`id`
  (identity). **External/media privilege is encoded in the declared `effects`/`bindings`** (an external-reaching cap
  declares an external-reaching effect), so it is already in the hash; the grant CONSENT booleans (`media_ok`,
  `external_*`, `consented_sensitive_modules`) are checked per-action at enforcement, **not hashed** (they are the
  user's yes/no, not the declaration). Order-independent (sorted). (INV-6/IR-3.)
- Uses the exported keyless BLAKE2b primitive `crypto_generichash` (`[FACT: encryption/vault.ts:252]`), **not** the
  private `computeSyncHash` (`repository.ts:162`); needs `sodium.ready` (libsodium loaded) — the live-store gate is
  the backstop (A2).

## S2 — Grant lifecycle (writes)
```ts
grant(defId: string, envelope: GrantEnvelope): Promise<CapabilityGrant>
revoke(defId: string): Promise<void>
```
- `grant` validates `envelope ⊆ def.declaration` (can't consent beyond what's declared), computes
  `granted_envelope_hash = canonicalEnvelopeHash(def)` (the def's declared `{bindings, effects}`), persists via
  `Repository.create` (co-transactional `sync_queue`). The grants repo is wired `{ deviceId, encryptedFields: [],
  softDelete: true }` (A1). Re-grant = `revoke` then `grant` (each atomic).
- `revoke` = `Repository.delete(grantId)` → with `softDelete: true` this sets `deleted_at` (still syncs, `[FACT:
  repository.ts:458-461]`); the next `assertPermitted` reads null → denies `no_grant`.
- `isEnvelopeCurrent` (read, S1) = `getGrant(defId).granted_envelope_hash === canonicalEnvelopeHash(currentDef)` where
  `currentDef` = the def's **current declaration** (`{bindings, effects}`) — SYMMETRIC with the grant-time hash, so a
  benign no-op never mis-fires. `false` ⇒ the declaration grew/changed ⇒ every `assertPermitted` denies
  `envelope_changed` until re-granted (INV-6, IR-2).

## S3 — Offered-set resolver
```ts
resolveOfferedSet(spaceId: string, surface: RenderTarget): Promise<CapabilityDefinition[]>
```
- `surface==='inline'` ⇒ **union**: every def whose `render_targets` includes `inline` (global base ∪ palette) —
  non-restrictive (INV-8, XCU-SP-29).
- `surface==='standalone'` ⇒ **restrict**: only defs in the Space's `space_enabled_blocks` palette that support
  `standalone`.

## Sensitive-class classifier (R2)
```ts
export const SENSITIVE_MODULE_CLASSES = ['finance', 'health'] as const  // ADR-010 §3.3.4 (medical = Health/HC-14)
```
- Transcribes `[FACT: ADR-010 §3.3.4:90-91]` (Finance, Health). Not a schema change — a code-level const.
- The `sensitive` action carries `moduleClass` (the caller knows its module context); classifier =
  `SENSITIVE_MODULE_CLASSES.includes(moduleClass)`; consent = `moduleClass ∈ grant.consented_sensitive_modules`.
- Drives the compositional-exfiltration union (INV-5): "cap holds a consented sensitive module AND any external
  grant" — no entity-type→module map needed.

## External enforcement scope (R1 — narrowed + delegated)
#31 enforces only the **grant-boolean gate** (`external_in_ok`/`external_out_ok`) + the **compositional-exfiltration
union** (XCU-08, the grant-enforcement half). The per-source **layer** classification is XS-ingestion `#44`
(XCU-02) and the per-target **consent + audit** is XS-egress-guard `#43` (XCU-06) — this service composes with them,
it does not store per-source/per-target scope. `[FACT: xcut-ingestion-ai.md:14,19,21]`. "No new column/table" holds.

## Typed error / reason taxonomy
```ts
export class CapabilityDenied extends Error { constructor(defId: string, reason: DenyReason) }
export class GrantExceedsDeclaration extends Error   // grant() envelope ⊄ declaration
export class GrantNotFound extends Error             // getGrant hard-miss where a grant was required
type DenyReason = 'no_grant' | 'not_in_envelope' | 'envelope_changed'
               | 'sensitive_consent_missing' | 'compositional_exfiltration' | 'media_not_granted'
```
All async validators reject (never sync-throw) — the factory-service convention `[FACT: memory
factory-service-no-this-for-intra-calls]`.
