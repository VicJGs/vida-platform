// ============================================================================
// services/gamification — the service (mod-gamification #48 ① · S1 currency surface + level)
//
// The user-facing SURFACE over the AR-7 economy substrate (foundation/economy) — it
// COMPOSES the registry + computeBalance, never re-implements them. Factory-object,
// hoisted closures, no `this.` (the ② destructure shape). Balances are DERIVED live
// (IR-1); the currency ops are a thin BUILD over registry.list() (R1 — the registry
// exposes only create(def)→void + list()→CurrencyDef[]). S2–S4 append rules/achievements/journal.
// ============================================================================

import { eq } from 'drizzle-orm'
import {
  createCurrencyRegistry,
  computeBalance,
  type CurrencyDef,
  type CurrencyBalance,
  type LedgerEntry,
} from '../../foundation/economy'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { consequenceLedger } from '../../db/schema/foundation/economy'
import { userProfile, type UserProfileRow } from '../../db/schema/gamification'
import { CurrencyCreateSchema, UpdateProfileSchema } from '../../validators/gamification'
import { deriveLevel, clampToFloor } from './level'
import {
  CurrencyNotFound,
  CurrencyExists,
  type GamificationService,
  type GamificationServiceDeps,
  type GamificationProfile,
  type CurrencyCreateInput,
  type UpdateProfileInput,
} from './types'

/** XP is the canonical shipped currency — the default for level (§3.2). */
const XP_CODE = 'XP'

/** JSON-parse a TEXT array column into string[]; malformed → [] (never throws). */
function parseJsonArray(value: string | null): string[] {
  if (value == null) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/** Row → the real-column profile VIEW (IR-11); JSON arrays parsed at the boundary. */
function toProfile(row: UserProfileRow): GamificationProfile {
  return {
    id: row.id,
    life_stage: row.life_stage,
    focus_areas: parseJsonArray(row.focus_areas),
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    birth_date: row.birth_date,
    timezone: row.timezone,
    total_xp: row.total_xp,
    current_level: row.current_level,
    skipped_modules: parseJsonArray(row.skipped_modules),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function createGamificationService(deps: GamificationServiceDeps): GamificationService {
  const { db, deviceId } = deps
  const currencyRegistry = createCurrencyRegistry(db, deviceId)
  // Append-only ledger read (no deleted_at → plain findWhere) + the singleton profile row.
  const ledgerRepo = createRepository(db, consequenceLedger, { deviceId, encryptedFields: [] })
  const profileRepo = createRepository(db, userProfile, { deviceId, encryptedFields: [] })

  async function listCurrencies() {
    return currencyRegistry.list()
  }

  async function getCurrency(code: string) {
    const found = (await currencyRegistry.list()).find((c) => c.code === code)
    if (!found) throw new CurrencyNotFound(code)
    return found
  }

  async function defineCurrency(input: CurrencyCreateInput) {
    const parsed = CurrencyCreateSchema.parse(input)
    // R1 — a shipped code (XP) is in-memory, so the currencies.code UNIQUE can't catch a shadowing
    // define; guard against any already-resolving code (shipped OR user) before create.
    if ((await currencyRegistry.list()).some((c) => c.code === parsed.code)) {
      throw new CurrencyExists(parsed.code)
    }
    await currencyRegistry.create(parsed) // returns void — re-read to echo the created def
    return getCurrency(parsed.code)
  }

  /** Derive a currency's balance from its ledger rows (IR-1, never stored). Takes the resolved def so
   *  callers holding it (getBalances) don't re-list — avoids the N+1 registry re-fetch (R2). */
  async function balanceOf(currency: CurrencyDef): Promise<CurrencyBalance> {
    const rows = await ledgerRepo.findWhere(eq(consequenceLedger.currency_id, currency.code))
    const entries: LedgerEntry[] = rows.map((r) => ({ kind: r.kind, amount: r.amount }))
    return computeBalance(entries, currency.pool_ceiling ?? null)
  }

  async function getBalance(code: string): Promise<CurrencyBalance> {
    return balanceOf(await getCurrency(code)) // fail-loud on unknown code
  }

  async function getBalances(): Promise<Record<string, CurrencyBalance>> {
    const out: Record<string, CurrencyBalance> = {}
    for (const c of await currencyRegistry.list()) out[c.code] = await balanceOf(c)
    return out
  }

  async function getLevel(code = XP_CODE) {
    const balance = await getBalance(code)
    return deriveLevel(balance.earned) // level from lifetime earned — never de-levels (GM-14)
  }

  async function previewSpend(code: string, requested: number) {
    const balance = await getBalance(code)
    return clampToFloor(balance.current, requested) // IR-12 below-floor clamp+flag
  }

  async function getProfile(): Promise<GamificationProfile | null> {
    const rows = await profileRepo.findAll()
    return rows.length > 0 ? toProfile(rows[0]!) : null
  }

  async function updateProfile(patch: UpdateProfileInput): Promise<GamificationProfile> {
    const parsed = UpdateProfileSchema.parse(patch)
    const dbPatch: UpdateInput<typeof userProfile> = {}
    if (parsed.life_stage !== undefined) dbPatch.life_stage = parsed.life_stage
    if (parsed.display_name !== undefined) dbPatch.display_name = parsed.display_name
    if (parsed.avatar_url !== undefined) dbPatch.avatar_url = parsed.avatar_url
    if (parsed.birth_date !== undefined) dbPatch.birth_date = parsed.birth_date
    if (parsed.timezone !== undefined) dbPatch.timezone = parsed.timezone
    if (parsed.focus_areas !== undefined) dbPatch.focus_areas = JSON.stringify(parsed.focus_areas)
    if (parsed.skipped_modules !== undefined) dbPatch.skipped_modules = JSON.stringify(parsed.skipped_modules)

    const rows = await profileRepo.findAll()
    let id: string
    if (rows.length === 0) {
      // Upsert the singleton (every remaining column has a DB default).
      const created = await profileRepo.create(dbPatch as CreateInput<typeof userProfile>)
      id = created.id
    } else {
      await profileRepo.update(rows[0]!.id, dbPatch)
      id = rows[0]!.id
    }
    // Re-read: create()/update() echo the INPUT row, so DB-default columns (total_xp/current_level/
    // skipped_modules) would come back undefined — [[repository-create-returns-input-row-not-db-defaults]].
    const row = await profileRepo.findById(id)
    if (!row) throw new Error(`user_profile row missing after write: ${id}`)
    return toProfile(row)
  }

  return {
    defineCurrency,
    listCurrencies,
    getCurrency,
    getBalance,
    getBalances,
    deriveLevel,
    getLevel,
    previewSpend,
    getProfile,
    updateProfile,
  }
}
