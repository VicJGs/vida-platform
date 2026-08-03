// ============================================================================
// CurrencyRegistry — the thin currency service (AR-7 · ADR-012 §3.2)
//
// Currencies are user-definable. SHIPPED currencies (XP) live in-memory (SS-4
// precedent); user currencies persist to `currencies` via the db-6 Repository
// (→ co-transactional sync_queue) and sync. `name` is [E] (M1.0 pass-through seam).
// ============================================================================

import type { CurrencyBackingKind } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { currencies, type CurrencyRow } from '../../db/schema/foundation/economy'

export interface CurrencyDef {
  code: string
  name?: string
  backing_kind: CurrencyBackingKind
  unit?: string
  icon?: string
  pool_ceiling?: number | null
}

// XP is one currency, not privileged (§3.2) — the canonical grant_currency(XP) case.
export const SHIPPED_CURRENCIES: CurrencyDef[] = [
  { code: 'XP', name: 'Experience', backing_kind: 'self-granted', unit: 'xp' },
]

export interface CurrencyRegistry {
  create(def: CurrencyDef): Promise<void>
  list(): Promise<CurrencyDef[]>
}

function rowToDef(row: CurrencyRow): CurrencyDef {
  return {
    code: row.code,
    name: row.name ?? undefined,
    backing_kind: row.backing_kind,
    unit: row.unit ?? undefined,
    icon: row.icon ?? undefined,
    pool_ceiling: row.pool_ceiling ?? undefined,
  }
}

export function createCurrencyRegistry(db: DrizzleDb, deviceId: string): CurrencyRegistry {
  const shipped = new Map(SHIPPED_CURRENCIES.map((d) => [d.code, d]))
  // M1.0 empty-[E] pass-through (AR-5/AR-6 pattern): `name` is [E] in the schema (M3 intent),
  // but the seam is dormant until M3 — passing ['name'] would force a vault-unlock M1.0 doesn't do.
  const repo = createRepository(db, currencies, { deviceId, encryptedFields: [] })

  return {
    async create(def) {
      await repo.create({
        code: def.code,
        name: def.name ?? null,
        backing_kind: def.backing_kind,
        unit: def.unit ?? null,
        icon: def.icon ?? null,
        pool_ceiling: def.pool_ceiling ?? null,
      })
    },
    async list() {
      const userRows = await repo.findAll()
      return [...shipped.values(), ...userRows.map(rowToDef)]
    },
  }
}
