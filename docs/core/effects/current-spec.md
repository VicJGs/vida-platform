# foundation/effects — Current Spec

> Durable contract for the effect rail (AR-7 Increment 1). Owning ADR: ADR-004 §3.2.5 (spec) + F1 (guarded-write).
> Kept current with `packages/core/src/foundation/effects/` + `db/schema/foundation/effects.ts` + `migrations/004_effects.ts`.

## What it is
The exactly-once **effect rail** — the base AR-5 deferred here (`sessions/registry.ts:8`), ridden by measurement,
economy, and every module handler. Ships the rail structure; per-module handlers register into an empty seam later.

## Surface (`@vida/core`)
- `applied_effects` table — device-local dedup ledger. Columns `effect_event_id · effect_type (CHECK ≡ EFFECT_TYPE)
  · target_ref · applied_at`; **PRIMARY KEY (effect_event_id, effect_type, target_ref)**; index on `effect_event_id`.
  No `_sync_*` (local-only). Migration `004_effects`.
- `deriveEffectEventId(subjectNaturalKey, transition, effectType): string` — deterministic canonical-string id (BR-2).
- `EFFECT_CLASS` / `EFFECT_CLASS_OF: Record<EffectType, EffectClass>` — exhaustive taxonomy (BR-5).
- `EffectEvent { subjectNaturalKey, transition, effectType, targetRef, payload? }`; `EffectHandler = (event, tx) => Promise<void>`.
- `createEffectRegistry(): EffectRegistry` — `register` (dup→throws) / `resolve`. Ships empty.
- `createEffectRail(db, registry): EffectRail` — `applyEffect(event): Promise<{applied:boolean}>` (PLAN §3.4 algorithm).
- Typed errors: `UnknownEffectType · DuplicateEffectHandler · NoEffectHandler`.

## applyEffect flow
`class = EFFECT_CLASS_OF[type]` (unknown→`UnknownEffectType`) → projection: `{applied:true}`, no handler/no ledger
(BR-6) → else: `resolve` (absent→`NoEffectHandler`) → derive id → ONE tx: check composite key (present→`{applied:false}`)
else insert ledger row + `handler(event, tx)` → `{applied:true}`. Handler throw rolls back both.

## Tests
`foundation/effects/__tests__/effects.test.ts` (migration wiring + BR-1/3/4/6 + tx co-write + rollback);
`validators/enum-parity.test.ts` (applied_effects.effect_type CHECK ≡ EFFECT_TYPE).

## Deferred
See current-business-rules.md § Deferred.
