# PLAN (§XXVI g1) — AR-7 Increment 4: the `economy` substrate (FINAL)

> AR-7 ⊞4, increment 4 of 4 (`effects ✅ → capability ✅ → measurement ✅ → economy`). Closes LIF-78. Profile:
> Add Backend Component. §2.1-gathered; every shape `[FACT: file:line]`. Composes increment 1 (rail + the 4 economy
> effects) + increment 3 (Binding). Owning ADR: ADR-012.

## §1. Scope — the currency/economy mechanism (structure + thin)

**Is (build-now):** the ADR-012 economy PRIMITIVES — `foundation/economy` + `db/schema/foundation/economy.ts` +
`migrations/006_economy.ts` + enums + validators.

**Is NOT (deferred, cited — all homed in §6):**

- **`store` (Finance-owned nestable layer) + the `move_money` handler** — Finance owns money; `finance-service.ts` is 0-logic. [FACT: ADR-012 §3.5/§3.6:74]
- **`surface_notification` handler** — Notifications module (writes the `notifications` row). [FACT: ADR-012 §3.1:48]
- **Rules TABLE + condition-evaluation + achievement reconcile-pass + level-curve config** — "shape open in-source", build-phase / MOD-gamification. [FACT: ADR-012 §3.7/§3.8, §5.20:3780]
- **User-authored rules sandbox** — ADR-010 (#85). [FACT: ADR-012 §3.9]
- **`user_profile` split** (total/level → System; streaks → Check-ins; persona → Preferences) — per-module. [FACT: ADR-012 §3.10]
- **Level-unlocks · user-authored achievements/challenges · quests** — ⚠ INTENDED-later. [FACT: ADR-012 §3.8/§3.7]

**Baseline (live floor):** `foundation/economy/` = CLAUDE.md stub (grep clean); no `CURRENCY_BACKING_KIND`/
`CONSEQUENCE_KIND` enum; next migration = **006**. The 4 economy effects are already `EFFECT_TYPE` + classed
`additive` (increment 1: `effects/types.ts:26-27`) — economy provides their HANDLERS. `Binding` + `assertAcyclic`
exist (increment 3). Existing Finance `currency:string` fields UNTOUCHED (§3.5). Template: AR-6 (tables+service).

## §2. Business rules

- **BR-1 (rule = binding + typed effects — §3.1).** A consequence dispatches one or more typed effects on the rail;
  the 4 economy effects are all **Additive**. Each effect appends its own output row keyed by a deterministic
  `effect_event_id` — no umbrella effect. [FACT: ADR-012 §3.1:40-50]
- **BR-2 (multi-currency — §3.2).** A `currency` has a `backing_kind {real-money·self-granted·measured-time}`; XP is
  one currency (`grant_currency(XP)`), not privileged. [FACT: ADR-012 §3.2:54-60]
- **BR-3 (derived balances — §3.3).** Per currency, `earned·locked·current` **recompute on read** from
  `consequence_ledger`; stored counters are caches, never truth. [FACT: ADR-012 §3.3:62-63]
- **BR-4 (to-distribute — §3.3).** `to-distribute = ceiling − Σ(distributed)` — a **config** ceiling, not a ledger
  sum; `current ≤ ceiling` enforced. [FACT: ADR-012 §3.3:65]
- **BR-5 (lock-not-destroy — §3.4).** A penalty **locks** (a `lock` ledger row), never deletes — **structural now**
  (append-only ledger). The **below-floor clamp+flag** (needs a balance read + flag surface) is **deferred to the
  enforcing surface (MOD-gamification #47)**. [FACT: ADR-012 §3.4:67-68]
- **BR-6 (idempotent handlers — §3.1).** The `grant_currency`/`lock_currency` handlers write a `consequence_ledger`
  row with the deterministic `effect_event_id` (recomputed from the event, == the rail's) under **UNIQUE
  `(effect_event_id, kind, target_ref)`** — mirroring the rail's composite PK. The rail's local `applied_effects`
  dedup is the replay guard; the ledger UNIQUE is the **cross-device** convergence (applied_effects is local-only, not synced). [FACT: ADR-012 §3.1:45-46; ADR-004 §3.2.5-B; §5.20:3763]
- **BR-7 (coordinator invents no write path — §3.1).** The consequence coordinator fans a fire out to the rail's
  `applyEffect` per typed effect; no new write path, no new idempotency. [FACT: ADR-012 §3.1:50]
- **BR-8 (boundaries — §3.11).** Owns currencies/ledger/4-derived/lock-not-destroy/coordinator/effect-class. Does NOT
  own the rail (ADR-004), conditions (ADR-011 — a condition _is_ a Binding), or the sandbox (ADR-010). [FACT: ADR-012 §3.11]

## §3. Contract (shapes — cited)

### 3.1 `@vida/types` enums + validators

- `CURRENCY_BACKING_KIND = ['real-money','self-granted','measured-time'] as const` · `CONSEQUENCE_KIND =
['earn','lock','spend','distribute'] as const` (+ types + z.enum validators). Both are FIXED scalar CHECK columns → **enum-parity rows** (unlike JSON-stored enums).

### 3.2 Tables — `db/schema/foundation/economy.ts` (migration 006; both syncable)

- **`currencies`**: `...baseColumns · code TEXT UNIQUE (semantic id, e.g. 'XP') · name TEXT [E] · backing_kind
(enumText CHECK) · unit TEXT · icon TEXT · pool_ceiling INTEGER (nullable, config) · deleted_at`. User-definable;
  XP shipped-seeded. **`pool_ceiling` is the config ceiling for `self-granted`/`measured-time` currencies only** (§3.3);
  a `real-money` currency derives its ceiling from the backing `store` box — deferred to MOD-finance #39. [FACT: ADR-012 §3.2 / §5.20:3778]
  _(code = the semantic id, mirrors capability's def_id — repo.create generates the PK.)_
- **`consequence_ledger`** (**append-only** — NO `deleted_at`; corrections are new compensating rows, BR-3): `...baseColumns
· currency_id TEXT (no FK) · amount INTEGER (positive magnitude; sign is implied by `kind`) · kind (enumText CHECK
CONSEQUENCE_KIND) · entity_type TEXT · entity_id TEXT · **target_ref TEXT** · effect_event_id TEXT · at INTEGER`, with
  **UNIQUE `(effect_event_id, kind, target_ref)`** — mirroring the rail's `(effect_event_id, effect_type, target_ref)` PK
  (kind ↔ effect_type for economy effects) so cross-device convergence matches the rail exactly (M1). [FACT: ADR-012 §3.3:62 / §5.20:3777; effects `migrations/004_effects.ts:30` composite PK]
- No FK (live convention). `name [E]` uses the repository's encrypt seam (M1.0 empty-[E] pass-through, like AR-6).

### 3.3 Derived-balance engine — `foundation/economy/balance.ts` (pure)

- `computeBalance(rows: LedgerEntry[], ceiling?: number | null): { earned; locked; spent; distributed; current; toDistribute }`.
  **Sign convention:** `amount` is a **positive magnitude**; `kind` implies the effect on balance. All four reductions
  explicit: `earned = Σ(amount|kind=earn)` · `locked = Σ(amount|kind=lock)` · `spent = Σ(amount|kind=spend)` ·
  `distributed = Σ(amount|kind=distribute)`; then `current = earned − locked − spent`; `toDistribute = ceiling==null ?
null : ceiling − distributed`. [FACT: ADR-012 §3.3:62-65]

### 3.4 Effect handlers + coordinator — `foundation/economy/handlers.ts` + `coordinator.ts`

- **Typed payloads (M2)** — Zod schemas: `GrantCurrencyPayload`/`LockCurrencyPayload = { currencyId, amount, entityType,
entityId, targetRef }`. Each handler `.parse()`s `event.payload` first; a parse failure throws `MalformedConsequencePayload`
  (rolls back via the shared tx). No untyped reads.
- `createEconomyHandlers(db)` → `{ grant_currency, lock_currency }` (`EffectHandler = (event, tx) => …`, increment 1).
  Each recomputes `id = deriveEffectEventId(event.subjectNaturalKey, event.transition, event.effectType)` (deterministic;
  == the rail's, same inputs) and `tx.insert(consequenceLedger).values({ effect_event_id: id, kind:'earn'|'lock',
target_ref: p.targetRef, currency_id: p.currencyId, amount: p.amount, entity_type: p.entityType, entity_id: p.entityId, at })`
  — the `(effect_event_id, kind, target_ref)` UNIQUE mirrors the rail's PK (M1).
- **BR-5 scope:** lock-not-destroy is **structural now** (a penalty writes a `lock` row; the ledger is append-only,
  nothing deletes). The **below-floor clamp+flag** needs a current-balance read + a flag surface → **deferred to the
  enforcing surface (MOD-gamification #47)**, homed in §6 — not silently dropped.
- `registerEconomyEffects(registry, handlers)` — registers the 2 into the effect registry (increment 1). `move_money`/`surface_notification` NOT registered (deferred → Finance/Notifications).
- `dispatchConsequence(rail, effects: EffectEvent[]): Promise<void>` — the coordinator primitive (BR-7): `for (e of effects) await rail.applyEffect(e)`. Rule STORAGE + condition-eval deferred (§6).

### 3.5 Currency service — `foundation/economy/registry.ts`

- `createCurrencyRegistry(db, deviceId)`: `create(currency)` (persist via Repository → sync_queue; `encryptedFields: ['name']` seam), `list()`. `SHIPPED_CURRENCIES = [{ code:'XP', backing_kind:'self-granted', … }]` (XP seed).
- Barrels: `foundation/economy/index.ts`, `@vida/core`; `@vida/types` += economy enums; validators += economy; schema barrel += economy.

## §4. Acceptance

1. 2 enums + z.enum validators + **2 enum-parity rows** (currencies.backing_kind, consequence_ledger.kind) — migration 006 emits both `CHECK` clauses AND is added to `enum-parity.test.ts` `ddlFor` chain; root typecheck 10/10; `@vida/core` typecheck 0.
2. Tables + migration 006 registered (runner → 6); `currentVersion ≥ 6` in the wiring test.
3. Tests (`__tests__/economy.test.ts`): migration wiring; **computeBalance over all 4 kinds** (earn/lock/spend/distribute fixtures — pure, no handler — asserting earned/locked/spent/distributed/current/to-distribute incl. ceiling==null→null); grant_currency handler via the RAIL → one earn row + **idempotent (fire same event twice → still 1 row via applied_effects dedup)**; lock_currency → lock row; **MalformedConsequencePayload on a bad payload**; create currency → persists + one sync_queue row; enum-parity green.
4. `@vida/core` suite green; existing unbroken (version asserts `≥`).
5. Composes increment 1 (rail) + 3 (nothing new needed — coordinator takes EffectEvents); every shape cited; deferrals homed (§6).

## §5. Implementation Prompt (→ IMPL-PLAN at gate 2)

`@vida/types` enums (+barrel) → `core/validators` z.enums (+barrel) → enum-parity FIXTURE rows → `foundation/economy/types.ts`
(LedgerEntry, errors) → `db/schema/foundation/economy.ts` (+schema barrel) → `migrations/006_economy.ts` (+runner) →
`balance.ts` → `handlers.ts` + `coordinator.ts` → `registry.ts` (currency service + XP seed) → `index.ts` barrels + `@vida/core`
→ `__tests__/economy.test.ts` → typecheck + tests. Then §XXIX Currency → `docs/core/economy/current-*` + layer-doc.
**On green: LIF-78 (AR-7) closes** — census aligns all 4 foundation homes.

## §6. Deferral-homing check (Phase-3 discipline)

| Deferred                                                                   | Home                                                                                   | Basis                                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `store` layer + `move_money` handler                                       | **MOD-finance #39** (Finance owns money; `finance-service.ts` INTENDED)                | ADR-012 §3.5/§3.6:74                                                                      |
| `surface_notification` handler                                             | **MOD-notifications #48**                                                              | ADR-012 §3.1:48                                                                           |
| rules TABLE + condition-eval + achievement reconcile + level-curve config  | **MOD-gamification #47** (the System surface — `services/gamification/`) / build-phase | ADR-012 §3.7/§3.8, §5.20:3780                                                             |
| below-floor **clamp+flag** enforcement (needs balance read + flag surface) | **MOD-gamification #47** (the enforcing surface)                                       | ADR-012 §3.4:68 (structural lock-not-destroy is here; the clamp policy is at the surface) |
| user-authored rules sandbox                                                | **#85 CAP-authoring** (ADR-010)                                                        | ADR-012 §3.9                                                                              |
| `user_profile` split (streaks·persona·PII)                                 | **MOD-checkins #36 · MOD-prefs #32** (+ PII stays ⚠ until an account entity)           | ADR-012 §3.10                                                                             |
| level-unlocks · user-authored achievements/challenges · quests             | ⚠ INTENDED-later (ride #85 / MOD-gamification)                                         | ADR-012 §3.7/§3.8                                                                         |
