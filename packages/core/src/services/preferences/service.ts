// ============================================================================
// PreferencesService — mod-preferences #37 ① backend service tier (LIF-133) · Slice 1: user_preferences
//
// The 2nd real services/* build (after MOD-sessions). Factory-object (no `this.`, IR-8 — intra-service calls go
// via hoisted closures / the returned object). Rides the DB-6 Repository over the finished DB-4 #2 schema
// (schema/preferences.ts · migration 013). M1.0 pass-through: encryptedFields: [] — preferences is plaintext
// structural config, NEVER [E] (PR-1). softDelete: false — no deleted_at on user_preferences.
//
// Singleton semantics (BR-P4/PR-3): user_preferences is one-row-per-vault, APP-enforced (no DDL uniqueness).
// A READ is read-or-DEFAULT — it never persists (precedent sessions/service.ts:224; contract.md:12-14). The row
// is created on the FIRST write only. Reads always overlay the row on USER_PREFERENCES_DEFAULTS so a consumer
// never gets `undefined` (PR-2). getMergedPreferences returns MergedPreferences (the config view — Omit the
// SyncableEntity metadata; the defaults-fallback path has no row identity, mirroring sessions' FocusConfig subset).
//
// Slice scope: user_preferences only. nav_preferences → Slice 2; command_bar_history → Slice 3. Debounce/optimistic
// (PR-4), themeStore (PR-5), settings-search (G7) and the Settings/Cmd+K UI are ② fe-preferences.
// ============================================================================

import { eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository, type UpdateInput } from '../../db/repository'
import {
  userPreferences,
  navPreferences,
  commandBarHistory,
  type UserPreferencesRow,
  type NavPreferencesRow,
  type CommandBarHistoryRow,
} from '../../db/schema/preferences'
import {
  UpdatePreferencesSchema,
  UpdateNavPreferencesSchema,
  RecordCommandSchema,
} from '../../validators/user'
import type { MergedPreferences, MergedNavPreferences } from '@vida/types'
import { InvalidModuleError } from './types'

// NB: command readers return the Drizzle CommandBarHistoryRow (the house convention for raw list readers —
// search/backlink-resolver.ts returns EntityLinkRow[]). The @vida/types CommandBarHistory interface is NOT
// assignable from the row: the row types `_sync_status` as `string` (plain text column) while the interface uses
// the SyncStatus union — a whole-repo boundary, reconciled with the interface at DB-11, not mapped here.

/**
 * The merge base (PR-2 single source, structure-data.md:44). Mirrors every `.default(...)` in
 * schema/preferences.ts — a field's default is authored here in the same shape as its column — with ONE deliberate
 * divergence: `feature_gamification` is `false` here (GM-1 opt-in, gamification/business-rules.md:12-16;
 * preferences-rescope F11) while the DDL keeps `DEFAULT 1`. The service always writes the full defaults on create, so
 * the DDL default is never used. `[FACT: schema/preferences.ts:45-88]`
 */
export const USER_PREFERENCES_DEFAULTS: MergedPreferences = {
  // Appearance
  theme: 'system',
  accent_color: '#6366f1',
  compact_mode: false,
  font_size: null,
  // Locale
  date_format: 'YYYY-MM-DD',
  time_format: '24h',
  week_starts_on: 1,
  currency: 'USD',
  number_format: null,
  // Dashboard
  dashboard_layout: null,
  default_dashboard_view: null,
  module_visibility: null,
  // Tasks
  show_completed_tasks: true,
  default_task_priority: 'medium',
  show_archived: false,
  // Pomodoro
  pomodoro_work_minutes: 25,
  pomodoro_break_minutes: 5,
  pomodoro_long_break_minutes: 15,
  pomodoro_sessions_before_long: 4,
  // Notifications
  notification_email: true,
  notification_push: true,
  notification_in_app: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  notification_frequency: null,
  // Per-module push toggles
  push_habits: true,
  push_tasks: true,
  push_routines: true,
  push_contacts: true,
  push_study: true,
  // Features — GM-1: the System is opt-in (diverges from the DDL default on purpose; see the docblock above)
  feature_gamification: false,
  // Onboarding & persona (E9)
  persona: null,
  motivation_style: null,
  active_modules: null,
  onboarding_completed: false,
}

/** JSON-parse a TEXT column into its parsed app shape; malformed → fallback (IR-e — never throws). */
function parseJson<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/**
 * Row → merged config view. Drops SyncableEntity metadata (id/timestamps/_sync_*). Each NON-null-typed field
 * coalesces `row.x ?? DEFAULTS.x`: the Drizzle `$inferSelect` types a DB-nullable-with-default column as `| null`
 * (`.default()` ≠ `notNull`), but the merged view is non-null — the `??` only fires on a `null` the view forbids
 * (the row always carries DEFAULTS values, so `row` still wins for every real value, incl. `theme:'dark'`).
 * Genuinely-nullable fields pass through as-is. The 3 JSON columns parse with a default fallback (IR-e).
 */
function toMerged(row: UserPreferencesRow): MergedPreferences {
  const d = USER_PREFERENCES_DEFAULTS
  return {
    theme: row.theme ?? d.theme,
    accent_color: row.accent_color ?? d.accent_color,
    compact_mode: row.compact_mode ?? d.compact_mode,
    font_size: row.font_size,
    date_format: row.date_format ?? d.date_format,
    time_format: row.time_format ?? d.time_format,
    week_starts_on: row.week_starts_on ?? d.week_starts_on,
    currency: row.currency ?? d.currency,
    number_format: row.number_format,
    dashboard_layout: parseJson(row.dashboard_layout, d.dashboard_layout),
    default_dashboard_view: row.default_dashboard_view,
    module_visibility: parseJson(row.module_visibility, d.module_visibility),
    show_completed_tasks: row.show_completed_tasks ?? d.show_completed_tasks,
    default_task_priority: row.default_task_priority ?? d.default_task_priority,
    show_archived: row.show_archived ?? d.show_archived,
    pomodoro_work_minutes: row.pomodoro_work_minutes ?? d.pomodoro_work_minutes,
    pomodoro_break_minutes: row.pomodoro_break_minutes ?? d.pomodoro_break_minutes,
    pomodoro_long_break_minutes: row.pomodoro_long_break_minutes ?? d.pomodoro_long_break_minutes,
    pomodoro_sessions_before_long: row.pomodoro_sessions_before_long ?? d.pomodoro_sessions_before_long,
    notification_email: row.notification_email ?? d.notification_email,
    notification_push: row.notification_push ?? d.notification_push,
    notification_in_app: row.notification_in_app ?? d.notification_in_app,
    quiet_hours_enabled: row.quiet_hours_enabled ?? d.quiet_hours_enabled,
    quiet_hours_start: row.quiet_hours_start,
    quiet_hours_end: row.quiet_hours_end,
    notification_frequency: row.notification_frequency,
    push_habits: row.push_habits ?? d.push_habits,
    push_tasks: row.push_tasks ?? d.push_tasks,
    push_routines: row.push_routines ?? d.push_routines,
    push_contacts: row.push_contacts ?? d.push_contacts,
    push_study: row.push_study ?? d.push_study,
    feature_gamification: row.feature_gamification ?? d.feature_gamification,
    persona: row.persona,
    motivation_style: row.motivation_style,
    active_modules: parseJson(row.active_modules, d.active_modules),
    onboarding_completed: row.onboarding_completed ?? d.onboarding_completed,
  }
}

/** Config patch → repo write shape: JSON columns are stringified to TEXT (app stringifies — conventions P-R5). */
function serialize(patch: Partial<MergedPreferences>): UpdateInput<typeof userPreferences> {
  const { dashboard_layout, module_visibility, active_modules, ...rest } = patch
  const out: UpdateInput<typeof userPreferences> = { ...rest }
  if ('dashboard_layout' in patch) {
    out.dashboard_layout = dashboard_layout == null ? null : JSON.stringify(dashboard_layout)
  }
  if ('module_visibility' in patch) {
    out.module_visibility = module_visibility == null ? null : JSON.stringify(module_visibility)
  }
  if ('active_modules' in patch) {
    out.active_modules = active_modules == null ? null : JSON.stringify(active_modules)
  }
  return out
}

// --- nav_preferences (Slice 2) ---------------------------------------------

/** Merge base for nav config — mirrors schema/preferences.ts:94-100 `.default(...)` exactly. */
export const NAV_PREFERENCES_DEFAULTS: MergedNavPreferences = {
  dock_position: 'bottom',
  dock_auto_hide: false,
  dock_size: 'medium',
  mobile_nav_items: null,
  show_labels: true,
  haptic_feedback: true,
  reduce_motion: false,
}

/** Row → merged nav-config view. Same `?? DEFAULTS` (falsy-safe) + JSON-parse pattern as `toMerged`. */
function toMergedNav(row: NavPreferencesRow): MergedNavPreferences {
  const d = NAV_PREFERENCES_DEFAULTS
  return {
    dock_position: row.dock_position ?? d.dock_position,
    dock_auto_hide: row.dock_auto_hide ?? d.dock_auto_hide,
    dock_size: row.dock_size ?? d.dock_size,
    mobile_nav_items: parseJson(row.mobile_nav_items, d.mobile_nav_items),
    show_labels: row.show_labels ?? d.show_labels,
    haptic_feedback: row.haptic_feedback ?? d.haptic_feedback,
    reduce_motion: row.reduce_motion ?? d.reduce_motion,
  }
}

/** Nav config patch → repo write shape: `mobile_nav_items` stringified to TEXT. */
function serializeNav(patch: Partial<MergedNavPreferences>): UpdateInput<typeof navPreferences> {
  const { mobile_nav_items, ...rest } = patch
  const out: UpdateInput<typeof navPreferences> = { ...rest }
  if ('mobile_nav_items' in patch) {
    out.mobile_nav_items = mobile_nav_items == null ? null : JSON.stringify(mobile_nav_items)
  }
  return out
}

export interface PreferencesService {
  /** Read-or-DEFAULT (never persists, never `undefined` — PR-2). */
  getMergedPreferences(): Promise<MergedPreferences>
  /** Partial merge; creates the singleton on first write, updates it after (BR-P4). Zod-validated (BR-P2). */
  updatePreferences(patch: Partial<MergedPreferences>): Promise<MergedPreferences>
  /** The parsed module_visibility map; `{}` when unset/malformed (PR-7). */
  getModuleVisibility(): Promise<Record<string, boolean>>
  /** Set one module's nav visibility. Structure-validates the key (D3); membership is the ② consumer's. */
  setModuleVisibility(moduleKey: string, visible: boolean): Promise<void>
  /** Read-or-DEFAULT nav config (never persists, never `undefined` — PR-2). */
  getNavPreferences(): Promise<MergedNavPreferences>
  /** Partial merge; creates the nav singleton on first write, updates it after (BR-P4). Zod-validated. */
  updateNavPreferences(patch: Partial<MergedNavPreferences>): Promise<MergedNavPreferences>
  /** Upsert a Cmd+K command by `command_key`: increment use_count + set last_used_at, or create (PR-6/BR-P3). */
  recordCommand(command_key: string, command_label: string, command_category?: string | null): Promise<void>
  /** Set a command's pinned flag; no-op if the key was never recorded (docs silent — D-S3). */
  pinCommand(command_key: string, pinned: boolean): Promise<void>
  /** Palette list: pinned-first, then frecency (use_count desc, last_used_at desc). PR-6. */
  getCommandHistory(): Promise<CommandBarHistoryRow[]>
}

export function createPreferencesService(opts: {
  db: DrizzleDb
  deviceId: string
}): PreferencesService {
  const { db, deviceId } = opts
  // encryptedFields: [] — plaintext config (PR-1); softDelete: false — no deleted_at.
  const repo = createRepository(db, userPreferences, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })
  const navRepo = createRepository(db, navPreferences, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })
  const commandRepo = createRepository(db, commandBarHistory, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })

  async function getMergedPreferences(): Promise<MergedPreferences> {
    const row = (await repo.findAll())[0]
    return row ? toMerged(row) : { ...USER_PREFERENCES_DEFAULTS }
  }

  async function updatePreferences(patch: Partial<MergedPreferences>): Promise<MergedPreferences> {
    const parsed = UpdatePreferencesSchema.safeParse(patch)
    if (!parsed.success) {
      throw new Error(
        `Invalid preferences patch: ${parsed.error.issues[0]?.path.join('.') || 'unknown field'}`,
      )
    }
    const existing = (await repo.findAll())[0]
    const row = existing
      ? await repo.update(existing.id, serialize(parsed.data))
      : await repo.create({ ...serialize(USER_PREFERENCES_DEFAULTS), ...serialize(parsed.data) })
    return toMerged(row)
  }

  async function getModuleVisibility(): Promise<Record<string, boolean>> {
    const prefs = await getMergedPreferences()
    return prefs.module_visibility ?? {}
  }

  async function setModuleVisibility(moduleKey: string, visible: boolean): Promise<void> {
    if (typeof moduleKey !== 'string' || moduleKey.length === 0) {
      throw new InvalidModuleError(moduleKey)
    }
    const current = await getModuleVisibility()
    await updatePreferences({ module_visibility: { ...current, [moduleKey]: visible } })
  }

  async function getNavPreferences(): Promise<MergedNavPreferences> {
    const row = (await navRepo.findAll())[0]
    return row ? toMergedNav(row) : { ...NAV_PREFERENCES_DEFAULTS }
  }

  async function updateNavPreferences(
    patch: Partial<MergedNavPreferences>,
  ): Promise<MergedNavPreferences> {
    const parsed = UpdateNavPreferencesSchema.safeParse(patch)
    if (!parsed.success) {
      throw new Error(
        `Invalid nav preferences patch: ${parsed.error.issues[0]?.path.join('.') || 'unknown field'}`,
      )
    }
    const existing = (await navRepo.findAll())[0]
    const row = existing
      ? await navRepo.update(existing.id, serializeNav(parsed.data))
      : await navRepo.create({ ...serializeNav(NAV_PREFERENCES_DEFAULTS), ...serializeNav(parsed.data) })
    return toMergedNav(row)
  }

  async function recordCommand(
    command_key: string,
    command_label: string,
    command_category?: string | null,
  ): Promise<void> {
    const parsed = RecordCommandSchema.safeParse({ command_key, command_label, command_category })
    if (!parsed.success) {
      throw new Error(
        `Invalid command record: ${parsed.error.issues[0]?.path.join('.') || 'unknown field'}`,
      )
    }
    const now = Date.now()
    const found = (await commandRepo.findWhere(eq(commandBarHistory.command_key, command_key)))[0]
    if (found) {
      await commandRepo.update(found.id, { use_count: found.use_count + 1, last_used_at: now })
    } else {
      await commandRepo.create({
        command_key,
        command_label,
        command_category: command_category ?? null,
        use_count: 1,
        last_used_at: now,
        is_pinned: false,
      })
    }
  }

  async function pinCommand(command_key: string, pinned: boolean): Promise<void> {
    const found = (await commandRepo.findWhere(eq(commandBarHistory.command_key, command_key)))[0]
    // D-S3: no-op on an unrecorded key — the ② palette only pins commands already in history (single-user).
    if (found) await commandRepo.update(found.id, { is_pinned: pinned })
  }

  async function getCommandHistory(): Promise<CommandBarHistoryRow[]> {
    const rows = await commandRepo.findAll()
    // PR-6: pinned-first, then frecency (use_count desc, last_used_at desc; nulls last).
    return [...rows].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      if (a.use_count !== b.use_count) return b.use_count - a.use_count
      return (b.last_used_at ?? 0) - (a.last_used_at ?? 0)
    })
  }

  return {
    getMergedPreferences,
    updatePreferences,
    getModuleVisibility,
    setModuleVisibility,
    getNavPreferences,
    updateNavPreferences,
    recordCommand,
    pinCommand,
    getCommandHistory,
  }
}
