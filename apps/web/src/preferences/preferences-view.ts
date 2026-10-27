// ============================================================================
// Preferences view — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-2/3.
//
// The PURE mapping between the two persisted singletons (`user_preferences` +
// `nav_preferences`, the service's Merged* shapes) and the one `PreferencesView`
// every surface reads. No I/O. Two rules live here so nothing else can drift:
// - the READ mapping + degrade (never `undefined`, PR-2; unknown sub-keys and
//   out-of-range scalars fall back per field, N10; `system` → light, N9);
// - the ONE merge per table (`applyUserPatch` / `applyNavPatch`) used for both
//   the optimistic cache and the in-queue merge — `dashboard_layout` merges per
//   sub-key and the two map fields (`module_visibility`, `moduleNames`) merge as
//   maps, so `{a}` then `{b}` keeps both (IR-2).
// Storage of the JSON-only controls rides open fields (fe-settings seam §B):
// preset → dashboard_layout.theme · arrangement → .arrangement · names → .moduleNames.
// ============================================================================

import { THEME_DEFAULT, THEME_PRESETS, type ThemePreset, type ThemeSelection } from '@vida/ui'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { PERSONA, type MergedNavPreferences, type MergedPreferences, type Persona } from '@vida/types'
import type { TimeFormat, WeekStartsOn } from '../stores/preferences-store'

/** The Home arrangement (fe-home EC-2) — owned here since R3 (it left the transitional store). */
export type HomeArrangement = 'journalFirst' | 'dashboardFirst'

/** "Not set" in a persona Select — a string sentinel, because `Select` treats `undefined` as uncontrolled. */
export const PERSONA_UNSET = 'unset' as const
export type PersonaChoice = Persona | typeof PERSONA_UNSET

export const DATE_FORMATS = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'] as const
const ARRANGEMENTS: readonly HomeArrangement[] = ['journalFirst', 'dashboardFirst']

export interface PreferencesView {
  selection: ThemeSelection
  reduceMotion: boolean
  arrangement: HomeArrangement
  moduleVisibility: Record<string, boolean>
  moduleNames: Record<string, string>
  dateFormat: string
  timeFormat: TimeFormat
  weekStartsOn: WeekStartsOn
  notifInApp: boolean
  notifPush: boolean
  notifEmail: boolean
  quietHours: boolean
  persona: PersonaChoice
}

/** A partial view edit; `selection` may itself be partial. */
export type ViewPatch = Partial<Omit<PreferencesView, 'selection'>> & { selection?: Partial<ThemeSelection> }

type Layout = Record<string, unknown>

function layoutOf(m: MergedPreferences): Layout {
  const l = m.dashboard_layout
  return l && typeof l === 'object' && !Array.isArray(l) ? (l as Layout) : {}
}

function isPreset(v: unknown): v is ThemePreset {
  return typeof v === 'string' && (THEME_PRESETS as readonly string[]).includes(v)
}

function stringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'))
}

function boolMap(v: unknown): Record<string, boolean> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, boolean] => typeof e[1] === 'boolean'))
}

/** The read mapping: two merged rows → the one view. Never `undefined` (PR-2). */
export function toView(user: MergedPreferences, nav: MergedNavPreferences): PreferencesView {
  const layout = layoutOf(user)
  const arrangement = layout.arrangement
  const persona = user.persona
  return {
    selection: {
      preset: isPreset(layout.theme) ? layout.theme : THEME_DEFAULT.preset,
      mode: user.theme === 'dark' ? 'dark' : 'light', // 'system' (the column default) → light, the codec cold start
      density: user.compact_mode ? 'dense' : 'calm',
    },
    reduceMotion: nav.reduce_motion ?? false,
    arrangement: ARRANGEMENTS.includes(arrangement as HomeArrangement)
      ? (arrangement as HomeArrangement)
      : 'journalFirst',
    moduleVisibility: boolMap(user.module_visibility),
    moduleNames: stringMap(layout.moduleNames),
    dateFormat: (DATE_FORMATS as readonly string[]).includes(user.date_format) ? user.date_format : 'YYYY-MM-DD',
    timeFormat: user.time_format === '12h' ? '12h' : '24h',
    weekStartsOn: user.week_starts_on === 0 ? 0 : 1,
    notifInApp: user.notification_in_app,
    notifPush: user.notification_push,
    notifEmail: user.notification_email,
    quietHours: user.quiet_hours_enabled,
    persona: persona != null && (PERSONA as readonly string[]).includes(persona) ? persona : PERSONA_UNSET,
  }
}

export function defaultView(): PreferencesView {
  return toView(USER_PREFERENCES_DEFAULTS, NAV_PREFERENCES_DEFAULTS)
}

/** View edit → the `user_preferences` patch (JSON sub-keys as a partial `dashboard_layout`, merged by `applyUserPatch`). */
export function toUserPatch(p: ViewPatch): Partial<MergedPreferences> {
  const out: Partial<MergedPreferences> = {}
  const layout: Layout = {}
  if (p.selection?.mode !== undefined) out.theme = p.selection.mode
  if (p.selection?.density !== undefined) out.compact_mode = p.selection.density === 'dense'
  if (p.selection?.preset !== undefined) layout.theme = p.selection.preset
  if (p.arrangement !== undefined) layout.arrangement = p.arrangement
  if (p.moduleNames !== undefined) layout.moduleNames = p.moduleNames
  if (Object.keys(layout).length > 0) out.dashboard_layout = layout
  if (p.moduleVisibility !== undefined) out.module_visibility = p.moduleVisibility
  if (p.dateFormat !== undefined) out.date_format = p.dateFormat
  if (p.timeFormat !== undefined) out.time_format = p.timeFormat
  if (p.weekStartsOn !== undefined) out.week_starts_on = p.weekStartsOn
  if (p.notifInApp !== undefined) out.notification_in_app = p.notifInApp
  if (p.notifPush !== undefined) out.notification_push = p.notifPush
  if (p.notifEmail !== undefined) out.notification_email = p.notifEmail
  if (p.quietHours !== undefined) out.quiet_hours_enabled = p.quietHours
  if (p.persona !== undefined) out.persona = p.persona === PERSONA_UNSET ? null : p.persona
  return out
}

/** View edit → the `nav_preferences` patch (only reduce-motion lives there today). */
export function toNavPatch(p: ViewPatch): Partial<MergedNavPreferences> {
  return p.reduceMotion !== undefined ? { reduce_motion: p.reduceMotion } : {}
}

/**
 * THE merge for `user_preferences` (R2-BR-3). Object spread so explicit `false`/`0` apply (BR-PREF-9);
 * `dashboard_layout` merges per sub-key (its `moduleNames` as a map); `module_visibility` merges as a map.
 * A patch can never replace the whole layout object or delete a sub-key — by design.
 */
export function applyUserPatch(base: MergedPreferences, patch: Partial<MergedPreferences>): MergedPreferences {
  const next: MergedPreferences = { ...base, ...patch }
  if (patch.dashboard_layout !== undefined && patch.dashboard_layout !== null) {
    const prev = layoutOf(base)
    const sub = patch.dashboard_layout as Layout
    const merged: Layout = { ...prev, ...sub }
    if (sub.moduleNames !== undefined)
      merged.moduleNames = { ...stringMap(prev.moduleNames), ...stringMap(sub.moduleNames) }
    next.dashboard_layout = merged
  }
  if (patch.module_visibility !== undefined && patch.module_visibility !== null) {
    next.module_visibility = { ...boolMap(base.module_visibility), ...patch.module_visibility }
  }
  return next
}

/** THE merge for `nav_preferences` — plain spread (no map fields among the ones we write). */
export function applyNavPatch(base: MergedNavPreferences, patch: Partial<MergedNavPreferences>): MergedNavPreferences {
  return { ...base, ...patch }
}
