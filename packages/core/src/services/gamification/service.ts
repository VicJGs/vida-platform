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
import type { Achievement, UserAchievement, EffectType } from '@vida/types'
import {
  createCurrencyRegistry,
  computeBalance,
  type CurrencyDef,
  type CurrencyBalance,
  type LedgerEntry,
} from '../../foundation/economy'
import { assertAcyclic, MeasurementCycle } from '../../foundation/measurement'
import { createRepository, uuidv7, type CreateInput, type UpdateInput } from '../../db/repository'
import { consequenceLedger, rules } from '../../db/schema/foundation/economy'
import { userProfile, achievements, userAchievements, type UserProfileRow } from '../../db/schema/gamification'
import {
  CurrencyCreateSchema,
  UpdateProfileSchema,
  RuleCreateSchema,
  RuleUpdateSchema,
  AchievementSeedSchema,
} from '../../validators/gamification'
import { deriveLevel, clampToFloor } from './level'
import { parseAchievementCondition, evaluateAchievementCondition } from './achievements'
import {
  parseRule,
  evaluateCondition,
  buildEffectEvents,
  rulesToBindings,
  serializeCondition,
  serializeConsequences,
  type Rule,
  type RuleContext,
  type ExecutionResult,
  type ConsequenceSpec,
} from './rules'
import {
  CurrencyNotFound,
  CurrencyExists,
  RuleNotFound,
  RuleBindingCyclic,
  RuleGrantDenied,
  RailNotConfigured,
  type GamificationService,
  type GamificationServiceDeps,
  type GamificationProfile,
  type CurrencyCreateInput,
  type UpdateProfileInput,
  type RuleCreateInput,
  type RuleUpdateInput,
  type AchievementSeedInput,
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
  const { db, deviceId, rail, registry, measurement, enforcer } = deps
  const currencyRegistry = createCurrencyRegistry(db, deviceId)
  // Append-only ledger read (no deleted_at → plain findWhere) + the singleton profile row.
  const ledgerRepo = createRepository(db, consequenceLedger, { deviceId, encryptedFields: [] })
  const profileRepo = createRepository(db, userProfile, { deviceId, encryptedFields: [] })
  // rules has deleted_at → softDelete:true (findAll/findById exclude soft-deleted).
  const rulesRepo = createRepository(db, rules, { deviceId, encryptedFields: [], softDelete: true })
  // user_achievements is syncable (the earned join). achievements is a NON-syncable static seed → direct drizzle.
  const userAchievementsRepo = createRepository(db, userAchievements, { deviceId, encryptedFields: [] })

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

  // --- S2 rule engine -------------------------------------------------------

  async function listRules(): Promise<Rule[]> {
    return (await rulesRepo.findAll()).map(parseRule) // findAll excludes soft-deleted
  }

  async function getRule(id: string): Promise<Rule> {
    const row = await rulesRepo.findById(id) // findById excludes soft-deleted → null
    if (!row) throw new RuleNotFound(id)
    return parseRule(row)
  }

  /** The whole rule set (incl. the candidate) must stay acyclic — a rule may not feed its own condition. */
  function assertRuleGraphAcyclic(all: Rule[]): void {
    try {
      assertAcyclic(rulesToBindings(all))
    } catch (e) {
      if (e instanceof MeasurementCycle) throw new RuleBindingCyclic(e.message)
      throw e
    }
  }

  async function createRule(input: RuleCreateInput): Promise<Rule> {
    const parsed = RuleCreateSchema.parse(input)
    const candidate: Rule = {
      id: '(new)',
      name: parsed.name,
      condition: parsed.condition,
      consequences: parsed.consequences,
      grantId: parsed.grantId ?? null,
      isEnabled: parsed.isEnabled ?? true,
      created_at: 0,
      updated_at: 0,
    }
    assertRuleGraphAcyclic([...(await listRules()), candidate])
    const created = await rulesRepo.create({
      name: parsed.name,
      condition_binding_type: parsed.condition.kind,
      condition_ref: serializeCondition(parsed.condition),
      consequences: serializeConsequences(parsed.consequences),
      grant_id: parsed.grantId ?? null,
      is_enabled: parsed.isEnabled ?? true,
    })
    return getRule(created.id) // re-read (create echoes input; is_enabled default etc.)
  }

  async function updateRule(id: string, patch: RuleUpdateInput): Promise<Rule> {
    const parsed = RuleUpdateSchema.parse(patch)
    const current = await getRule(id)
    const merged: Rule = {
      ...current,
      name: parsed.name ?? current.name,
      condition: parsed.condition ?? current.condition,
      consequences: parsed.consequences ?? current.consequences,
      isEnabled: parsed.isEnabled ?? current.isEnabled,
    }
    assertRuleGraphAcyclic([...(await listRules()).filter((r) => r.id !== id), merged])
    const dbPatch: UpdateInput<typeof rules> = {}
    if (parsed.name !== undefined) dbPatch.name = parsed.name
    if (parsed.condition !== undefined) {
      dbPatch.condition_binding_type = parsed.condition.kind
      dbPatch.condition_ref = serializeCondition(parsed.condition)
    }
    if (parsed.consequences !== undefined) dbPatch.consequences = serializeConsequences(parsed.consequences)
    if (parsed.isEnabled !== undefined) dbPatch.is_enabled = parsed.isEnabled
    await rulesRepo.update(id, dbPatch)
    return getRule(id)
  }

  async function enableRule(id: string): Promise<Rule> {
    await getRule(id)
    await rulesRepo.update(id, { is_enabled: true })
    return getRule(id)
  }

  async function disableRule(id: string): Promise<Rule> {
    await getRule(id)
    await rulesRepo.update(id, { is_enabled: false })
    return getRule(id)
  }

  async function deleteRule(id: string): Promise<void> {
    await getRule(id) // fail-loud on unknown
    await rulesRepo.delete(id) // soft-delete (softDelete:true)
  }

  /** Evaluate + fire a loaded rule. Shared by executeRule (by id) and evaluateRules (sweep) so a sweep
   *  doesn't re-fetch each rule. */
  async function executeLoadedRule(rule: Rule, ctx: RuleContext): Promise<ExecutionResult> {
    if (!rule.isEnabled) return { ruleId: rule.id, fired: false, reason: 'disabled', effectsFired: 0, clamped: false }

    const query = (key: string): number | null => measurement?.query(key) ?? null
    const evalResult = evaluateCondition(rule, ctx, query)
    if (!evalResult.met) {
      return {
        ruleId: rule.id,
        fired: false,
        reason: evalResult.unmeasured ? 'unmeasured' : 'condition_not_met',
        effectsFired: 0,
        clamped: false,
      }
    }

    // User-authored rule (grant_id set) → the capability envelope must permit every consequence effect
    // (fail-closed: no enforcer, or a denied effect, blocks the whole fire). Shipped/trusted rules skip this.
    if (rule.grantId != null) {
      if (!enforcer) throw new RuleGrantDenied(rule.id, 'no enforcer configured')
      for (const c of rule.consequences) {
        // R2 — `grant_id` identifies the capability the rule was authored under; the enforcer keys by
        // capability DEF id. At M1 (auth-off, no live authoring surface) this is a fail-closed HOOK; the
        // grant-row → def-id resolution when a REAL enforcer is wired is owed to #85 CAP-authoring (⚠ INTENDED).
        const decision = await enforcer.checkAction(rule.grantId, { type: 'effect', effect: c.effectType })
        if (!decision.allowed) throw new RuleGrantDenied(rule.id, decision.reason ?? 'not_permitted')
      }
    }

    // Below-floor clamp for lock consequences (IR-12): a lock cannot drive a balance below 0; a fully
    // clamped lock (nothing available) is dropped, not fired.
    let clamped = false
    const finalConsequences: ConsequenceSpec[] = []
    for (const c of rule.consequences) {
      if (c.effectType === 'lock_currency') {
        const bal = await getBalance(c.payload.currencyId)
        const res = clampToFloor(bal.current, c.payload.amount)
        if (res.clamped) clamped = true
        if (res.applied <= 0) continue
        finalConsequences.push({ ...c, payload: { ...c.payload, amount: res.applied } })
      } else {
        finalConsequences.push(c)
      }
    }

    const events = buildEffectEvents({ ...rule, consequences: finalConsequences }, ctx)
    // Fan onto the rail per effect and count what was NEWLY applied (R1). dispatchConsequence discards the
    // rail's {applied} results, so a replay would over-report — we drive rail.applyEffect directly (still the
    // substrate's write path, no re-implementation). Each applyEffect is atomic (F1 §3B: ledger row + handler
    // co-write roll back together); the SET is not atomic — on a partial failure the caller re-drives and the
    // rail dedups the already-applied effects by effect_event_id (IR-2/GM-20).
    let effectsFired = 0
    for (const event of events) {
      const { applied } = await rail!.applyEffect(event)
      if (applied) effectsFired += 1
    }
    // `fired` = the rule triggered (condition met + dispatched) this call; `effectsFired` = effects NEWLY
    // applied (an idempotent replay or a fully-clamped lock → 0), so downstream counters never double-count.
    return { ruleId: rule.id, fired: true, effectsFired, clamped }
  }

  async function executeRule(ruleId: string, ctx: RuleContext): Promise<ExecutionResult> {
    if (!rail) throw new RailNotConfigured()
    return executeLoadedRule(await getRule(ruleId), ctx)
  }

  async function evaluateRules(ctx: RuleContext): Promise<ExecutionResult[]> {
    if (!rail) throw new RailNotConfigured()
    const out: ExecutionResult[] = []
    for (const rule of await listRules()) {
      if (rule.isEnabled) out.push(await executeLoadedRule(rule, ctx))
    }
    return out
  }

  // --- S3 achievement engine ------------------------------------------------

  function toAchievement(row: typeof achievements.$inferSelect): Achievement {
    return {
      id: row.id,
      key: row.key,
      category: row.category,
      tier: row.tier,
      title: row.title,
      description: row.description,
      icon: row.icon,
      xp_reward: row.xp_reward,
      condition: row.condition != null ? (JSON.parse(row.condition) as Record<string, unknown>) : null,
      is_secret: row.is_secret,
      created_at: row.created_at,
    }
  }

  function toUserAchievement(row: typeof userAchievements.$inferSelect): UserAchievement {
    return {
      ...row,
      progress: row.progress != null ? (JSON.parse(row.progress) as Record<string, unknown>) : null,
    } as UserAchievement // _sync_status Row(string)→union cast (the DB-11 reconcile)
  }

  /** An effect may fire only if a handler is registered — the registry gates the guarded emit
   *  (the checkins CK-17 precedent). surface_notification is MOD-notifications' (unregistered at M1) →
   *  its emit stays dormant until wired; grant_currency (economy) is present when the rail is. */
  function canFire(effectType: EffectType): boolean {
    return registry?.resolve(effectType) != null
  }

  async function seedAchievements(defs: AchievementSeedInput[]): Promise<void> {
    for (const def of defs) {
      const d = AchievementSeedSchema.parse(def)
      await db
        .insert(achievements)
        .values({
          id: uuidv7(),
          key: d.key,
          category: d.category,
          tier: d.tier ?? 'bronze',
          title: d.title,
          description: d.description ?? null,
          icon: d.icon ?? null,
          xp_reward: d.xpReward ?? 0,
          condition: d.condition != null ? JSON.stringify(d.condition) : null,
          is_secret: d.isSecret ?? false,
          created_at: Date.now(),
        })
        .onConflictDoNothing({ target: achievements.key }) // idempotent re-seed by key
        .run()
    }
  }

  async function listAchievements(): Promise<Achievement[]> {
    return (await db.select().from(achievements).all()).map(toAchievement)
  }

  async function getUserAchievements(): Promise<UserAchievement[]> {
    return (await userAchievementsRepo.findAll()).map(toUserAchievement)
  }

  async function unlockAchievement(a: Achievement, ctx: RuleContext): Promise<UserAchievement> {
    // The earned join (syncable; UNIQUE(achievement_id) makes a cross-device double-unlock converge).
    const created = await userAchievementsRepo.create({ achievement_id: a.id, earned_at: Date.now(), progress: null })
    // Reward: grant the achievement's XP (idempotent transition — a re-fire dedups on the rail). M1
    // rewards are XP-only (the field is `xp_reward`, the level curve is XP-based, GM-14); a multi-currency
    // reward is a later concern. NIT-2: `progress` reconciles to Record<string,number> at the progress slice.
    if (a.xp_reward > 0 && canFire('grant_currency')) {
      await rail!.applyEffect({
        subjectNaturalKey: ctx.subjectId,
        transition: `achievement:${a.id}:reward`,
        effectType: 'grant_currency',
        targetRef: ctx.subjectId,
        payload: { currencyId: XP_CODE, amount: a.xp_reward },
      })
    }
    // Notification: dormant until MOD-notifications registers the handler (canFire guards it).
    if (canFire('surface_notification')) {
      await rail!.applyEffect({
        subjectNaturalKey: ctx.subjectId,
        transition: `achievement:${a.id}:notify`,
        effectType: 'surface_notification',
        targetRef: a.id,
        payload: { kind: 'achievement_unlocked', achievementId: a.id },
      })
    }
    return toUserAchievement(created)
  }

  async function evaluateAchievements(ctx: RuleContext): Promise<UserAchievement[]> {
    if (!rail) throw new RailNotConfigured()
    const earned = new Set((await getUserAchievements()).map((u) => u.achievement_id))
    const candidates = (await listAchievements()).filter((a) => !earned.has(a.id))
    // Prefetch balances for currency-conditions so the evaluator stays pure/sync.
    const balances = new Map<string, CurrencyBalance>()
    for (const a of candidates) {
      const cond = parseAchievementCondition(a.condition)
      if (cond?.kind === 'currency' && !balances.has(cond.currencyCode)) {
        try {
          balances.set(cond.currencyCode, await getBalance(cond.currencyCode))
        } catch {
          /* unknown currency → left unresolved (condition won't fire) */
        }
      }
    }
    const resolveMeasure = (key: string): number | null => measurement?.query(key) ?? null
    const resolveCurrency = (code: string): CurrencyBalance | null => balances.get(code) ?? null

    const newly: UserAchievement[] = []
    for (const a of candidates) {
      const cond = parseAchievementCondition(a.condition)
      if (!cond) continue // no auto-evaluable predicate → skipped
      if (!evaluateAchievementCondition(cond, resolveMeasure, resolveCurrency)) continue
      newly.push(await unlockAchievement(a, ctx))
    }
    return newly
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
    createRule,
    updateRule,
    enableRule,
    disableRule,
    deleteRule,
    listRules,
    getRule,
    executeRule,
    evaluateRules,
    seedAchievements,
    listAchievements,
    getUserAchievements,
    evaluateAchievements,
  }
}
