# Composition — XS-capability enforcement services

> Dependency graph + repository wiring + seams to other services.

## Home
`packages/core/src/foundation/capability/` — extends the AR-7 module (new files, existing files ratified):
- `enforcer.ts` (new) — `createCapabilityEnforcer` (S1 decision core + S2 grant lifecycle) + `canonicalEnvelopeHash`.
- `offered-set.ts` (new) — `resolveOfferedSet` (S3).
- `types.ts` (extend) — `CapabilityAction`, `EnforcementDecision`, `DenyReason`, `GrantEnvelope`, new error classes.
- `index.ts` (extend) — export the new surface alongside `createCapabilityRegistry`.
- `__tests__/enforcer.test.ts`, `__tests__/offered-set.test.ts` (new).

## Dependency graph
```
createCapabilityEnforcer(db, deviceId, registry)
  ├─ registry: CapabilityRegistry        (AR-7 — get/list; declared envelope + is_user_type)   [registry.ts:71]
  ├─ Repository<capability_grants>        (grant persist/soft-delete + sync_queue)              [repository.ts:186]
  └─ canonicalEnvelopeHash                (exported crypto_generichash BLAKE2b, needs sodium.ready)   [vault.ts:252]

resolveOfferedSet(spaceId, surface)
  ├─ registry.list()                      (AR-7)
  └─ Repository<space_enabled_blocks>     (read palette for 'standalone')                        [spaces.ts:101]
```

## Wiring
- Factory-object pattern (no `this`; intra-service calls via closures) `[FACT: memory
  factory-service-no-this-for-intra-calls]`. `assertPermitted` calls the closure `checkAction`, not `this.checkAction`.
- `grant`/`revoke` use `createRepository(db, capabilityGrants, { deviceId, encryptedFields: [], softDelete: true })` —
  no `[E]` fields (policy metadata); **`softDelete: true`** so `revoke` = `delete()` → `deleted_at` (still syncs, A1,
  `[FACT: repository.ts:458-461]`). AR-7's def repo omits `softDelete` (`registry.ts:81`); the grants repo needs it.
- `canonicalEnvelopeHash` uses the exported `crypto_generichash` BLAKE2b (`[FACT: vault.ts:252]`), NOT the private
  `computeSyncHash` (`repository.ts:162`); requires `sodium.ready` (A2).

## Seams to other services (decide-not-execute)
| Seam | Owner | This service's role |
|------|-------|---------------------|
| Effect firing | `EffectRail` `#32` `[FACT: effects/service.ts:25]` | decides `effect ∈ envelope`; rail fires |
| Idempotency / no-double-count | ADR-004 §3.2.5 write path | out of scope (delegated) |
| External-in per-source LAYER | XS-ingestion `#44` (XCU-02) `[FACT: xcut-ingestion-ai.md:14]` | decides `external_in` boolean; ingestion classifies source layer |
| Egress mediation + per-target consent + audit | XS-egress-guard `#43` (XCU-06) `[FACT: xcut-ingestion-ai.md:19]` | decides `external_out` boolean + compositional union; guard transmits/audits |
| Media encryption | EN-1/EN-2 | decides `media_ok`; storage encrypts |
| Execution sandbox + resource limits + untrusted-mark | `#116 CAP-authoring` | none (out of scope) |
| Add-menu / grant-consent UX | P6 frontend + design-pass | consumes `resolveOfferedSet` / `grant` |

## Consumers (build-deps → XS-capability)
MOD-gamification `#48` · MOD-knowledge `#50` · MOD-health-training `#63` · fe-integrations-ai-surfaces `#82`.
`[FACT: decomposition.md:59,63,65; reconstructed-structure.md:162]`.
