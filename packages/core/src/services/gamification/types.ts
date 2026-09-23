// ============================================================================
// services/gamification — types (mod-gamification #48 ① · S1 currency surface + level)
//
// Deps + the GamificationService interface (S1 subset; S2–S4 append) + input types +
// typed errors. Factory-object shape, hoisted closures, no `this.` (the ② destructure
// shape). Reuses the foundation economy types (CurrencyDef/CurrencyBalance/LedgerEntry) —
// the RATIFY floor — rather than minting duplicates (§XXVIII reconcile of the seam-contract).
// ============================================================================

import type { z } from 'zod'
import type { DrizzleDb } from '../../db/adapter'
import type { CurrencyDef, CurrencyBalance } from '../../foundation/economy'
import type { CurrencyCreateSchema, UpdateProfileSchema } from '../../validators/gamification'
import type { LevelInfo, ClampResult } from './level'

/** S1 deps — the module composes the economy substrate from db+deviceId (registry created inside).
 *  S2+ append the injected rail/measurement/enforcer ports. */
export interface GamificationServiceDeps {
  db: DrizzleDb
  deviceId: string
}

export type CurrencyCreateInput = z.infer<typeof CurrencyCreateSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

/** The user_profile real-column VIEW (IR-11: the @vida/types UserProfile interface diverges — it still
 *  carries persona/check_in_streak/etc. that moved to Preferences/Check-ins). This mirrors the row. */
export interface GamificationProfile {
  id: string
  life_stage: string | null
  focus_areas: string[]
  display_name: string | null
  avatar_url: string | null
  birth_date: string | null
  timezone: string
  /** Cache (GM-4), derived from the XP ledger — never truth. */
  total_xp: number
  /** Cache (GM-4), derived via deriveLevel. */
  current_level: number
  skipped_modules: string[]
  created_at: number
  updated_at: number
}

export interface GamificationService {
  // --- Currencies (thin-BUILD over the foundation registry; R1) ---
  defineCurrency(input: CurrencyCreateInput): Promise<CurrencyDef>
  listCurrencies(): Promise<CurrencyDef[]>
  getCurrency(code: string): Promise<CurrencyDef>
  // --- Balances (RATIFY computeBalance; DERIVED, never stored — IR-1) ---
  getBalance(code: string): Promise<CurrencyBalance>
  getBalances(): Promise<Record<string, CurrencyBalance>>
  // --- Levels (GM-14 pure curve) ---
  deriveLevel(total: number): LevelInfo
  /** Live level from a currency's lifetime `earned` (default XP); does not de-level on spend. */
  getLevel(code?: string): Promise<LevelInfo>
  // --- Below-floor clamp preview (IR-12; S2 uses the pure clampToFloor before firing) ---
  previewSpend(code: string, requested: number): Promise<ClampResult>
  // --- Profile (IR-11 real-column view) ---
  getProfile(): Promise<GamificationProfile | null>
  updateProfile(patch: UpdateProfileInput): Promise<GamificationProfile>
}

/** getCurrency/getBalance on an unknown currency code (fail-loud). */
export class CurrencyNotFound extends Error {
  constructor(code: string) {
    super(`Currency not found: ${code}`)
    this.name = 'CurrencyNotFound'
  }
}

/** defineCurrency on a code that already resolves (shipped OR user) — `code` is the UNIQUE business key,
 *  but shipped currencies are in-memory so the DB UNIQUE can't catch a shadowing define (R1). */
export class CurrencyExists extends Error {
  constructor(code: string) {
    super(`Currency already exists: ${code}`)
    this.name = 'CurrencyExists'
  }
}
