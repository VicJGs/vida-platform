# Seam Contract — XS-capability (#31, LIF-169)

> Entity Delivery Flow §2. XS-capability has **no frontend twin** (`[FACT: reconstructed-structure.md:89]`),
> so the seam is the **service API that MODULES + the P6 config surface consume**, not a backend↔frontend UI seam.
> Consumers: MOD-gamification `#48`, MOD-knowledge `#50`, MOD-health-training `#63` (build-deps →XS-capability,
> `[FACT: decomposition.md:59,63,65]`) + `fe-integrations-ai-surfaces` `#82` (AI-mgmt config UI, read-only)
> `[FACT: reconstructed-structure.md:162]`.

## The consumed surface (stable)

```ts
// A user capability guards an action before performing it. Shipped/trusted defs bypass (allowed).
assertPermitted(defId: string, action: CapabilityAction): Promise<void>   // throws CapabilityDenied on deny
checkAction(defId: string, action: CapabilityAction): Promise<EnforcementDecision> // non-throwing variant

type CapabilityAction =
  | { type: 'effect';       effect: EffectType }
  | { type: 'binding';      entityType: string }
  | { type: 'media' }
  | { type: 'external_in';  source: string }
  | { type: 'external_out'; target: string }
  | { type: 'sensitive';    moduleClass: string }   // e.g. 'finance' | 'health'

interface EnforcementDecision { allowed: boolean; reason?: DenyReason }
type DenyReason =
  | 'no_grant' | 'not_in_envelope' | 'envelope_changed'
  | 'sensitive_consent_missing' | 'compositional_exfiltration' | 'media_not_granted'

// Grant lifecycle (consumed by the install/enable flow + P6 config UI).
grant(defId: string, envelope: GrantEnvelope): Promise<CapabilityGrant>
revoke(defId: string): Promise<void>
getGrant(defId: string): Promise<CapabilityGrant | null>
isEnvelopeCurrent(defId: string): Promise<boolean>   // false ⇒ re-grant required (fail closed)

// Offered-set (consumed by the editor/space add-menu — service half only; UI = P6).
resolveOfferedSet(spaceId: string, surface: RenderTarget): Promise<CapabilityDefinition[]>
```

## Contract invariants the consumer can rely on
- **Fail-closed**: any unknown/missing input ⇒ `allowed:false` (or `CapabilityDenied`); never a silent allow.
  `[FACT: ADR-010 §3.2:72-73]`.
- **Shipped bypass**: a trusted (`is_user_type=false`) def is always `allowed` — enforcement is only for user code.
  `[FACT: ADR-010 §3.1:56-58]`.
- **External is a boolean gate here**: `external_in`/`external_out` decide only the grant boolean + the compositional
  union; per-source **layer** (#44) and per-target **consent + audit** (#43) are enforced by those services.
  `[FACT: xcut-ingestion-ai.md:14,19,21]`.
- **Compositional gate**: a grant holding any consented sensitive module AND any external grant (in OR out) requires
  the union of both consents. `[FACT: ADR-010 §3.5:117-121]` + `[FACT: xcut-ingestion-ai.md:20]` (XCU-08).
- **Envelope drift**: after a def's declaration changes, `isEnvelopeCurrent`=false and every `assertPermitted` denies
  with `envelope_changed` until `grant` is re-called. `[FACT: ADR-010 §3.2:76-79]`.
- **Offered set**: `inline` returns a **union** (never fewer than the global base); `standalone` returns **only** the
  Space's `space_enabled_blocks` palette. `[FACT: xcut-spaces.md:49]`.

## Seams this contract does NOT cross (delegated)
Effect firing (`EffectRail` `#32`) · external-in per-source layer (XS-ingestion `#44`) · egress mediation + per-target
consent + audit (XS-egress-guard `#43`) · sandbox execution (`#116`) · idempotency write path (ADR-004 §3.2.5) · the
grant/consent UX + add-menu rendering (P6). Consumers call `assertPermitted` then perform the action through their own
write path — this service decides, it does not execute.
