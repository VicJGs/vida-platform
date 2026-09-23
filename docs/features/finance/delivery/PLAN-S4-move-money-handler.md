<!-- PLAN — mod-finance ① · S4 move_money effect handler · Entity Delivery Flow v1 (backend Service track, per-slice) -->
<!-- §XXVI Gate 1 = THIS spec. Operations authority: parts/finance.md FIN-26. Invariants: business-rules.md FN-16/FN-4/FN-11 + ADR-012 §3.1/§3.5. -->

# PLAN — Finance ① S4: `move_money` effect handler

**Slice:** S4 (of 8). **Leg:** FIN-26 (`move_money` Additive effect handler). **Track:** backend.
**Envision Gate:** N/A (headless effect handler, no surface).

---

## §1 Context (BASELINE — code as-is)
- The effect rail is BUILT (AR-7 / xs-effect-rail #32): `createEffectRail.applyEffect` OWNS idempotency — it
  derives the id (`deriveEffectEventId`), check-and-inserts `applied_effects` in ONE tx, and calls the handler
  through that tx **only if new** (BR-1). `move_money` ∈ `EFFECT_TYPE` and is classed **additive** in
  `EFFECT_CLASS_OF`. `[FACT: foundation/effects/service.ts:44-70; types.ts:28; session.ts:98]`
- `EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>` — co-writes through the rail's tx via
  `Repository.createInTx`; must NEVER open its own transaction. `[FACT: effects/types.ts:53; repository.ts:195]`
- **Direct precedent** = `foundation/economy/handlers.ts`: `createEconomyHandlers(db, deviceId)` builds a repo,
  returns typed handlers that `createInTx` a ledger row, + `registerEconomyEffects(registry, handlers)`. The
  economy CLAUDE.md states `move_money → MOD-finance` is exactly the deferred handler this slice builds.
  `[FACT: economy/handlers.ts; economy/CLAUDE.md]`
- `move_money` = a `transactions` **transfer** row (native `transaction_type='transfer'` + `transfer_to_account_id`)
  — a real entry in the user's money-truth, never a bank call. `[FACT: ADR-012 §3.5 L74; business-rules.md:80-88]`
- The `store` layer (boxes / `is_locked`, FIN-18/23/24) is DEFERRED — unbuilt. `[FACT: slice-map.md:26-28]`

## §2 Business Rules (invariants this slice MUST satisfy — cited)
- **BR-S4-1 (FN-16 / ADR-012 E4).** Finance EXECUTES `move_money` as a **ledger movement** (a transfer row via
  `createInTx`), a documented effect handler — NEVER a direct cross-module write. `[FACT: parts/finance.md:36; business-rules.md:80-88]`
- **BR-S4-2 (R1 idempotency).** Idempotency is the RAIL's (`applied_effects`); the handler does **not** re-implement
  it. A replay of the same `(subjectNaturalKey, transition, move_money)` → `applied:false` → handler not called →
  no double transfer. `[FACT: effects/service.ts:44-56]`
  - M1: the `transactions` row carries **no `effect_event_id` column** (output-row columns are a DEFERRED rail
    enhancement) — the rail's `applied_effects` ledger is the SOLE convergence guard. `[FACT: effects/CLAUDE.md deferred list]`
- **BR-S4-3 (FN-4).** The movement is one transfer row with a DISTINCT destination; `fromAccountId ===
  toAccountId` → `InvalidTransferError` (fail-loud). `[FACT: business-rules.md:20-22; service.ts assertTransferShape]`
- **BR-S4-4 (E5 penalty LOCKS, never destroys).** A penalty branch LOCKS a reward-target box (`store.is_locked`)
  — never deletes/subtracts money. The store layer is deferred → the lock routes to a **deny-safe `StoreLockPort`**
  that **fails loud** (`StoreLayerNotActive`), never fabricating a lock. Rolls the whole effect back (can't lock →
  don't move). `[FACT: business-rules.md:80-88 (E5); slice-map.md:36 decision 1; [[xs-security-services-deny-safe-port-build-shape]]]`
- **BR-S4-5 (C2).** `move_money ≠ grant_currency` — Finance owns only its `move_money`/`store` members; the
  `consequence_ledger` `kind='lock'` row on a penalty is **Gamification's `lock_currency` handler** (already built,
  a SEPARATE effect on the rail), not this handler's job. `[FACT: parts/finance.md:36; economy/handlers.ts]`

## §3 Design (net-new file `services/finance/effects.ts`; mirrors `economy/handlers.ts`)

### 3.1 Types
```ts
// The move_money payload (typed — no untyped payload reads, the economy precedent).
export const MoveMoneyPayload = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().int().positive(),   // movement magnitude in cents; transfer signing is getBalance's job
  currency: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),           // 'YYYY-MM-DD'; default = today
  lockTarget: z.string().optional(),     // a store box id to lock (penalty case) → deny-safe port
})
export type MoveMoneyPayloadT = z.infer<typeof MoveMoneyPayload>

export class MalformedMoveMoneyPayload extends Error {}   // constructor sets name + `Malformed move_money payload: <detail>` (mirrors MalformedConsequencePayload) — N2

// The deferred store-lock seam — deny-safe by default (fail-loud, never fabricates a lock).
// lock/unlock take the rail's ACTIVE tx so the FUTURE real store-lock co-writes atomically with the transfer
// (F1 §3B "same transaction"; effects/types.ts:47 EffectTx) — this is what makes the swap zero-signature-change
// AND keeps BR-S4-4 atomicity true once the real port lands. The deny-safe impl ignores tx and throws.
export interface StoreLockPort {
  lock(boxId: string, tx: EffectTx): Promise<void>
  unlock(boxId: string, tx: EffectTx): Promise<void>
}
export class StoreLayerNotActive extends Error {}         // thrown by the deny-safe port (constructor sets name)
export const denySafeStoreLockPort: StoreLockPort         // both methods throw StoreLayerNotActive
```

### 3.2 Factory + registration (mirror economy)
```ts
export function createFinanceEffectHandlers(
  db: DrizzleDb, deviceId: string, storeLock: StoreLockPort = denySafeStoreLockPort,
): { move_money: EffectHandler }

export function registerFinanceEffects(registry: EffectRegistry, handlers): void
  // → registry.register('move_money', handlers.move_money)
```

### 3.2b EffectEvent identity contract for `move_money` (what the CALLER must supply — B1)
The rail derives the dedup key from the `EffectEvent`, not the payload: `effect_event_id =
derive(subjectNaturalKey ‖ transition ‖ move_money)`, deduped on `(effect_event_id, effect_type, targetRef)`
`[FACT: effects/current-business-rules.md:8-10 (BR-1/BR-2); effects/event-id.ts]`. Grounded in the sessions
producer precedent (`lifecycle.ts:75`: `{subjectNaturalKey: session.id, transition, effectType, targetRef}`),
the `move_money` event carries:
- **`subjectNaturalKey`** = the ORIGINATING natural key (the rule-fire / consequence source id) — what caused the move.
- **`transition`** = the consequence label (e.g. the rule outcome / `'reward'` / `'penalty'`).
- **`targetRef`** = the producer-supplied target dimension (rail model — the sessions producer uses
  `targetRef=subject`, `lifecycle.ts:75`). **Convention** for a finance move: the destination account
  (`toAccountId`) for a reward, or the box id for a penalty lock — so one fire fanning to multiple targets
  disambiguates. The handler is **agnostic** to it (it reads only the payload for the movement); `targetRef` is
  the rail's dedup dimension, not a handler input.
- **`payload`** = `MoveMoneyPayload` (the amounts/accounts; NOT part of the dedup key).

**Convergence invariant (BR-S4-2):** two genuinely-distinct moves MUST differ in ≥1 of
{subjectNaturalKey, transition, targetRef}; a REPLAY of the same move differs in NONE (→ `applied:false`). This
is the **rail's universal caller-obligation** (identical for economy `grant_currency` etc.), not finance-specific —
the handler does not (and per the rail model should not) police the producer's `targetRef` scheme.
> ⚠ In M1 no untrusted caller fires `move_money` (deferred, MOD-gamification #48) and distinct rule-fires carry
> distinct `subjectNaturalKey`, so a collision needs a mis-wired trusted caller. **Homed to #48:** when the real
> firing + convergence wiring lands, decide whether to add a fail-loud handler assert (`targetRef` == the actual
> target) on the money-locking path (FN-40). Out of S4 scope — S4's tests play the caller with correct tuples
> (a reward's `targetRef`=destination, a penalty's `targetRef`=box).

### 3.3 Handler flow (`move_money`)
1. `MoveMoneyPayload.safeParse(event.payload)` → on failure `throw MalformedMoveMoneyPayload` (fail-loud).
2. `if (p.fromAccountId === p.toAccountId) throw InvalidTransferError` (BR-S4-3; reuse the S1 error).
3. `txRepo.createInTx(tx, serializeTransfer(p))` — the ledger movement: `transaction_type='transfer'`,
   `account_id=from`, `transfer_to_account_id=to`, `amount`, `currency ?? 'USD'`, `date ?? today`, `description`,
   all other columns → their null/false defaults (a transfer-only serializer, local to this file).
4. `if (p.lockTarget != null) await storeLock.lock(p.lockTarget, tx)` — deny-safe → throws `StoreLayerNotActive`,
   rolling BOTH the transfer and the applied_effects insert back (atomic, BR-S4-4). Ordered AFTER the transfer
   so a failed lock reverts the movement; the `tx` is threaded so the future real lock co-writes atomically (B2).

### 3.4 Deferred / out of S4 (recorded, homed)
- **Consent gate** (`assertEffectPermitted`, PC-3 / ADR-004 §3.2.5-3) — NOT wired here, deferred with the gate's
  callers to #46/MOD-* / #85. Grounded chain (not an omission): ADR-010 **PC-3** requires sensitive-class (Finance)
  consent, **fail-closed** — but that guards the **untrusted-capability firing path, which does not exist in M1**
  (auth-off per **ADR-017**; no grant envelope `consented_sensitive_modules` to check against; the user-capability
  sandbox is **#85/M4**). In M1 `move_money` is fired only by **trusted in-process code** (S4's tests now; the
  platform's own Gamification dispatch later, #48). So the gate becomes mandatory when an untrusted caller + the
  grant envelope land — exactly what `effects/CLAUDE.md` lists as deferred ("the gate's callers + consent-threading
  #46/MOD-*"), and consistent with the economy handlers (which also don't gate). `[FACT: ADR-004 §3.2.5-3 L93; ADR-010 PC-3 L90-94; ADR-017 auth-off; effects/CLAUDE.md deferred; economy/handlers.ts]`
- **Firing consumer** — no rule auto-fires `move_money` in M1 (rules/conditions = MOD-gamification #48); S4
  delivers the REGISTERED, tested handler, exercised via `rail.applyEffect`. `[FACT: economy dispatchConsequence; rules deferred]`
- **Real `StoreLockPort`** — lands with FIN-24 (store `is_locked`); zero-signature-change swap. `[FACT: slice-map.md:36]`
- **`effect_event_id` on `transactions`** — deferred output-row column (BR-S4-2).

### 3.5 No account-existence check (deliberate)
Mirror S2 `createTransfer` (no pre-read) + FN-11 (referential integrity is app-layer; the caller supplies valid
accounts). An orphan transfer (bad account) never appears in any real account's `getBalance` and is low-harm; a
fail-loud existence guard is a repo-wide concern (DB-11), not an S4 patch.

## §4 Acceptance
1. `move_money` registered on the rail; `rail.applyEffect({effectType:'move_money', …})` creates ONE transfer row.
2. The transfer moves balances correctly (source −amount, dest +amount) via the derived `getBalance`.
3. **Idempotent replay vs distinct move (B1 contract)** — a REPLAY (identical `subjectNaturalKey`+`transition`+
   `targetRef`) → `applied:false`, NO second transfer row; a DISTINCT move (differing in ≥1 identity field) →
   `applied:true`, a second row. Both exercised. Events use a pinned `date` for determinism (N3).
4. `fromAccountId === toAccountId` → `InvalidTransferError` (nothing written).
5. Malformed payload → `MalformedMoveMoneyPayload` (nothing written).
6. `lockTarget` set + deny-safe port → `StoreLayerNotActive`, and the transfer is **rolled back** (no row, no applied_effects entry — atomic).
7. A move_money with NO lockTarget completes with the default port (the reward-transfer case, the M1 norm).
8. tsc 0, eslint 0. Live-store Verification Gate PASS (real rail + `createEffectRail` over better-sqlite3).
9. `service.ts`/`types.ts` from S1–S3 UNTOUCHED (S4 is additive in a new file); `@vida/types` untouched.

## §5 Implementation Prompt
New file `services/finance/effects.ts` (mirror `economy/handlers.ts`): `MoveMoneyPayload` + `StoreLockPort` +
`denySafeStoreLockPort` + `createFinanceEffectHandlers` + `registerFinanceEffects`. Reuse `InvalidTransferError`
from `./types`. Export from `index.ts`. tsc → Vitest over the REAL `createEffectRail` + `createEffectRegistry`
(register the handler, fire events, assert transfer + idempotency + rollback) → code-review → `/critique` →
Currency (§XXIX, refresh finance current-*) → commit. No route.

**serializeTransfer completeness (preflight):** the local transfer serializer MUST set every notNull
`transactions` column — `account_id`, `transaction_type`, `amount`, `date`, `currency` (default `'USD'`),
`is_recurring` (default `false`) — mirroring S1's `serializeTransaction`; all others → null. A missed notNull →
`createInTx` throws (the live-store gate catches it). Keep the two serializers in sync (N1).

**Auth/ZK:** the handler co-writes local rows only; consent-gating is the caller's (deferred, §3.4). No egress.

## Gate-1 critique resolution (§XXVI step 2)
- **B1 (blocking) — RESOLVED.** Added §3.2b: the `move_money` EffectEvent identity contract
  (`subjectNaturalKey`/`transition`/`targetRef` semantics) grounded in the sessions producer (`lifecycle.ts:75`)
  + BR-1/BR-2 (`effects/current-business-rules.md:8-10`). Convergence invariant stated; acceptance #3 now tests a
  distinct-vs-replay pair.
- **B2 (blocking) — RESOLVED.** `StoreLockPort.lock/unlock` take `(boxId, tx: EffectTx)` so the future real
  store-lock co-writes atomically in the rail's tx (F1 §3B) — makes BR-S4-4 atomicity true post-swap AND keeps
  the swap zero-signature-change. Deny-safe impl ignores `tx`, throws.
- **N1–N3 — folded** (serializeTransfer mirror note · MalformedMoveMoneyPayload constructor · tests pin date).

## Code-review triage (§XXVI step 9/10 — post-impl)
Independent high-effort review: no crash bugs (serializer covers all notNull cols · rollback atomic · co-write via
createInTx · types/barrel clean). 3 dedup-semantic/contract findings:
- **F1 (spec↔test inconsistency) — FIXED.** §3.2b claimed a penalty's `targetRef`=box while the tests set it to
  the destination account. Reconciled: `targetRef` is producer-owned (rail model); §3.2b now states the convention
  (destination/box) is caller guidance, handler-agnostic; the penalty tests set `targetRef`=the box id.
- **F2 (silent-collision if caller mis-wires) — HOMED to #48, not an M1 bug.** The rail's universal
  caller-obligation (same for economy); M1 has no untrusted firing caller + distinct fires carry distinct
  `subjectNaturalKey`. A fail-loud handler assert is a #48 decision (documented in §3.2b). NOT added here — it
  would reverse approved B1 + impose semantics on the shared primitive, and the penalty path throws in M1 anyway.
- **F3 (`current_balance` staleness) — DOCUMENTED.** Consistent with the FN-3 derived model (`getBalance` is truth);
  noted as a DB-11 reconcile in `docs/modules/finance/current-business-rules.md` (no reader should trust the column).

## Open decisions for Approval 1
- **D1** — handler is STANDALONE (`createFinanceEffectHandlers`, own txRepo), decoupled from the service object — mirrors economy exactly. (Alt: expose off the service; rejected — economy precedent + no service coupling.)
- **D2** — deny-safe `StoreLockPort` **throws** `StoreLayerNotActive` (fail-loud/closed), rolling back the move. (Alt: return a status; rejected — a silent non-lock fabricates safety.)
- **D3** — no account-existence check (§3.5; FN-11 app-layer, mirrors createTransfer).
- **D4** — `amount` is a positive magnitude; transfer signing stays `getBalance`'s job (FN-3).
