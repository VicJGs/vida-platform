// ============================================================================
// services/finance — the move_money effect handler (mod-finance #47 ① · S4)
//
// FIN-26: Finance EXECUTES the ADR-012 E4 `move_money` Additive effect as a
// ledger movement — a `transactions` transfer row co-written through the rail's
// tx via Repository.createInTx (ADR-004 §3.2.5 single write path). Mirrors
// foundation/economy/handlers.ts (grant_currency/lock_currency).
//
// Idempotency is the RAIL's (applied_effects check-and-insert, BR-S4-2) — this
// handler does NOT re-implement it. A penalty LOCKs a reward-target box via a
// deny-safe StoreLockPort (the store layer is deferred, FIN-24) that fails loud,
// never fabricating a lock (E5 · BR-S4-4). move_money ≠ grant_currency (C2 —
// the consequence_ledger kind='lock' row is Gamification's lock_currency handler).
//
// Consent-gating (PC-3 / ADR-004 §3.2.5-3) is the caller's, deferred with the
// gate's callers (#46/#85) — in M1 (auth-off, ADR-017) move_money is fired only
// by trusted in-process code; there is no grant envelope to check against yet.
// ============================================================================

import { z } from 'zod'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { transactions } from '../../db/schema/finance'
import {
  type EffectEvent,
  type EffectHandler,
  type EffectTx,
  type EffectRegistry,
} from '../../foundation/effects'
import { InvalidTransferError } from './types'

// The move_money payload (typed — no untyped payload reads; the economy precedent). `amount` is a positive
// magnitude in cents; the transfer signing (debit source / credit dest) is getBalance's job (FN-3, D4).
export const MoveMoneyPayload = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(), // 'YYYY-MM-DD'; default = today
  lockTarget: z.string().optional(), // a store box id to lock (penalty case) → deny-safe port
})
export type MoveMoneyPayloadT = z.infer<typeof MoveMoneyPayload>

export class MalformedMoveMoneyPayload extends Error {
  constructor(detail: string) {
    super(`Malformed move_money payload: ${detail}`)
    this.name = 'MalformedMoveMoneyPayload'
  }
}

/**
 * The deferred store-lock seam. `lock`/`unlock` take the rail's ACTIVE tx so the FUTURE real store-lock
 * (FIN-24) co-writes atomically with the transfer (F1 §3B "same transaction") — a zero-signature-change swap.
 * The M1.0 default is deny-safe: it fails loud rather than fabricating a lock the store layer can't hold.
 */
export interface StoreLockPort {
  lock(boxId: string, tx: EffectTx): Promise<void>
  unlock(boxId: string, tx: EffectTx): Promise<void>
}

export class StoreLayerNotActive extends Error {
  constructor(op: string) {
    super(`Store layer not active: cannot ${op} a box (FIN-24 deferred)`)
    this.name = 'StoreLayerNotActive'
  }
}

/** Deny-safe default — never fabricates a lock (BR-S4-4). Swapped for the real port when FIN-24 lands. */
export const denySafeStoreLockPort: StoreLockPort = {
  async lock() {
    throw new StoreLayerNotActive('lock')
  },
  async unlock() {
    throw new StoreLayerNotActive('unlock')
  },
}

export interface FinanceEffectHandlers {
  move_money: EffectHandler
}

export function createFinanceEffectHandlers(
  db: DrizzleDb,
  deviceId: string,
  storeLock: StoreLockPort = denySafeStoreLockPort,
): FinanceEffectHandlers {
  // transactions has no active [E] set at M1.0 (pass-through seam); createInTx handles the co-transactional
  // sync_queue enqueue (ADR-004 §3.4). The handler co-writes through the RAIL's tx, never its own.
  const txRepo = createRepository(db, transactions, { deviceId, encryptedFields: [] })

  const move_money: EffectHandler = async (event: EffectEvent, tx: EffectTx) => {
    const parsed = MoveMoneyPayload.safeParse(event.payload)
    if (!parsed.success) throw new MalformedMoveMoneyPayload(parsed.error.message)
    const p = parsed.data

    // FN-4 — one transfer row, distinct destination (fail-loud). Source == dest is never a valid movement.
    if (p.fromAccountId === p.toAccountId) {
      throw new InvalidTransferError('source and destination must differ')
    }

    // The ledger movement (BR-S4-1). serializeTransfer sets every notNull transactions column — mirror of S1's
    // serializeTransaction (N1: keep in sync); all optional columns → null/false defaults.
    await txRepo.createInTx(tx, {
      account_id: p.fromAccountId,
      transfer_to_account_id: p.toAccountId,
      transaction_type: 'transfer',
      amount: p.amount,
      currency: p.currency ?? 'USD',
      category: null,
      category_bidx: null,
      subcategory: null,
      description: p.description ?? null,
      date: p.date ?? new Date().toISOString().slice(0, 10),
      is_recurring: false,
      recurring_frequency: null,
      jurisdiction_code: null,
      deleted_at: null,
    })

    // Penalty branch (BR-S4-4/E5): LOCK a reward-target box — never destroy money. The store layer is deferred,
    // so the deny-safe port throws StoreLayerNotActive → rolls BOTH the transfer and the applied_effects insert
    // back (atomic, same tx). Ordered AFTER the transfer + tx threaded so the future real lock co-writes atomically.
    if (p.lockTarget != null) await storeLock.lock(p.lockTarget, tx)
  }

  return { move_money }
}

/** Register the finance effect handler(s) into the rail's registry (mirrors registerEconomyEffects). */
export function registerFinanceEffects(registry: EffectRegistry, handlers: FinanceEffectHandlers): void {
  registry.register('move_money', handlers.move_money)
}
