// ============================================================================
// services/gamification — types (mod-gamification #48 ① · S1 currency surface + level)
//
// Deps + the GamificationService interface (S1 subset; S2–S4 append) + input types +
// typed errors. Factory-object shape, hoisted closures, no `this.` (the ② destructure
// shape). Reuses the foundation economy types (CurrencyDef/CurrencyBalance/LedgerEntry) —
// the RATIFY floor — rather than minting duplicates (§XXVIII reconcile of the seam-contract).
// ============================================================================

import type { z } from 'zod'
import type { Achievement, UserAchievement } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { CurrencyDef, CurrencyBalance } from '../../foundation/economy'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type { MeasurementSourceRegistry } from '../../foundation/measurement'
import type { CapabilityEnforcer } from '../../foundation/capability'
import type {
  CurrencyCreateSchema,
  UpdateProfileSchema,
  RuleCreateSchema,
  RuleUpdateSchema,
  AchievementSeedSchema,
} from '../../validators/gamification'
import type { LevelInfo, ClampResult } from './level'
import type { Rule, RuleContext, ExecutionResult } from './rules'

/** S1 deps = db+deviceId (the economy registry is composed inside). S2 appends rail (required to
 *  executeRule), measurement (derived_pull conditions), enforcer (user-authored rules). S3 appends
 *  registry (gates the guarded reward/notification emit — dormant when a handler is unregistered). */
export interface GamificationServiceDeps {
  db: DrizzleDb
  deviceId: string
  rail?: EffectRail
  registry?: EffectRegistry
  measurement?: MeasurementSourceRegistry
  enforcer?: CapabilityEnforcer
}

export type CurrencyCreateInput = z.infer<typeof CurrencyCreateSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type RuleCreateInput = z.infer<typeof RuleCreateSchema>
export type RuleUpdateInput = z.infer<typeof RuleUpdateSchema>
export type AchievementSeedInput = z.infer<typeof AchievementSeedSchema>

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
  // --- Rules (S2 — GM-2/GM-8; requires the rail to execute) ---
  createRule(input: RuleCreateInput): Promise<Rule>
  updateRule(id: string, patch: RuleUpdateInput): Promise<Rule>
  enableRule(id: string): Promise<Rule>
  disableRule(id: string): Promise<Rule>
  deleteRule(id: string): Promise<void>
  listRules(): Promise<Rule[]>
  getRule(id: string): Promise<Rule>
  /** Fire a single rule if its condition is met; parses consequences → clamps lock/spend → dispatches. */
  executeRule(ruleId: string, ctx: RuleContext): Promise<ExecutionResult>
  /** Sweep all enabled rules against the context (derived_pull + matching event_trigger). */
  evaluateRules(ctx: RuleContext): Promise<ExecutionResult[]>
  // --- Achievements (S3 — GM-13; static-seed read + earned-join write + unlock effects) ---
  /** Seed app-curated achievements (direct write — achievements is non-syncable; idempotent by key). */
  seedAchievements(defs: AchievementSeedInput[]): Promise<void>
  listAchievements(): Promise<Achievement[]>
  getUserAchievements(): Promise<UserAchievement[]>
  /** Evaluate every not-yet-earned achievement's predicate; unlock the satisfied ones (write the earned
   *  join + fire reward + notification via the rail). Returns the newly-earned joins. */
  evaluateAchievements(ctx: RuleContext): Promise<UserAchievement[]>
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

/** getRule/updateRule/executeRule on an unknown or soft-deleted rule id. */
export class RuleNotFound extends Error {
  constructor(id: string) {
    super(`Rule not found: ${id}`)
    this.name = 'RuleNotFound'
  }
}

/** createRule/updateRule would make the rule dependency graph cyclic (a rule feeding its own condition). */
export class RuleBindingCyclic extends Error {
  constructor(detail: string) {
    super(`Rule binding graph has a cycle: ${detail}`)
    this.name = 'RuleBindingCyclic'
  }
}

/** A user-authored rule (grant_id set) whose capability envelope denies a consequence effect (fail-closed). */
export class RuleGrantDenied extends Error {
  constructor(ruleId: string, reason: string) {
    super(`Rule ${ruleId} denied by its capability grant: ${reason}`)
    this.name = 'RuleGrantDenied'
  }
}

/** executeRule/evaluateRules without an injected effect rail (S2 dep). */
export class RailNotConfigured extends Error {
  constructor() {
    super('Cannot execute a rule: no effect rail configured (inject deps.rail)')
    this.name = 'RailNotConfigured'
  }
}

export type { Rule, RuleContext, ExecutionResult, RuleCondition, ConsequenceSpec } from './rules'
export type { AchievementCondition } from './achievements'
