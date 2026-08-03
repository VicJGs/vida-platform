# foundation/economy — Current Spec

> Durable contract for the points economy (AR-7 Increment 4). Owning ADR: ADR-012.
> Kept current with `packages/core/src/foundation/economy/` + `db/schema/foundation/economy.ts` + `migrations/006_economy.ts`.

## What it is
The ADR-012 economy primitives — the currency/ledger mechanism the Gamification surface (MOD-gamification) drives.
Composes the effect rail (increment 1: the 4 economy effects) + measurement's `Binding` (increment 3: a rule condition
*is* a binding). Owns no surface (rules engine, achievements, level curve, store are homed downstream).

## Surface (`@vida/core`, `@vida/types`)
- **Enums:** `CURRENCY_BACKING_KIND {real-money·self-granted·measured-time}` · `CONSEQUENCE_KIND {earn·lock·spend·distribute}` + z.enum validators + **2 enum-parity rows**.
- **Tables (migration 006, syncable):** `currencies` (`code` id · `name[E]` · `backing_kind` · `unit` · `icon` · `pool_ceiling`) · `consequence_ledger` (**append-only**; `currency_id·amount·kind·entity_type·entity_id·target_ref·effect_event_id·at`; **UNIQUE (effect_event_id, kind, target_ref)** mirroring the rail's PK).
- **`computeBalance(rows, ceiling?)`** → `{earned, locked, spent, distributed, current, toDistribute}` (pure; §3.3).
- **Effect handlers** (`createEconomyHandlers(db, deviceId)`): `grant_currency`/`lock_currency` write a ledger row via `Repository.createInTx(tx, …)` inside the rail's tx. `registerEconomyEffects(registry, handlers)` wires them into the rail. `move_money`/`surface_notification` NOT registered (deferred).
- **`dispatchConsequence(rail, effects[])`** — the consequence coordinator primitive (§3.1).
- **`createCurrencyRegistry(db, deviceId)`** — `create`/`list`; `SHIPPED_CURRENCIES` (XP seed).

## Composition note (closes increment 1's deferral)
`consequence_ledger.effect_event_id UNIQUE` is the per-output-row convergence key increment 1 deferred to consumers.
The handler recomputes the deterministic id (== the rail's) and writes it via `Repository.createInTx` — the tx-scoped
write added to DB-6 this increment (ADR-004 §3.2.5 single write path + §3.4 co-transactional enqueue, in the rail's tx).

## Tests
`foundation/economy/__tests__/economy.test.ts` — migration wiring; computeBalance (4 kinds + ceiling); grant/lock via the rail (+ idempotent replay); MalformedConsequencePayload; currency create + enqueue. `enum-parity` (2 economy rows).

## Deferred
See current-business-rules.md § Deferred (all homed).
