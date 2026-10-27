// preferences-rescope R5 (LIF-247), PLAN-R5 R5-BR-2/3/4 — the nav side of the user's module preferences.
//
// ONE pure filter both nav readers use (the dock's `visibleDockGroups` + ⌘K's `deriveNavCommands`): hidden modules
// leave the nav, renamed ones show the custom label. It acts ONLY on hideable keys (dock modules minus the
// always-reachable ones), so Settings, Home and every global surface pass through whatever the maps say — the EC-8
// escape hatch, read side (a synced `false` can't hide the way back). Hidden ≠ disabled: the route still opens (PR-7).
// The hideable rule lives HERE (settings + the writer derive from it), so `nav/` never imports `settings/`.
import { MODULE_MAP, type NavPlacement } from './module-map'

/** Settings (`preferences`) + Home (`journals`) — never hideable (EC-8, business-rules.md:27). */
export const ALWAYS_REACHABLE_KEYS: ReadonlySet<string> = new Set(['preferences', 'journals'])

/** The discovered global surfaces the user enables/disables (Feature Atlas · Sync log) — `module_visibility` keys
 *  that are not nav entries. Their readers belong to fe-feature-atlas / fe-sync-log. */
export const MANAGED_SURFACE_KEYS = ['features', 'sync'] as const

export interface NavPrefs {
  visibility: Record<string, boolean>
  names: Record<string, string>
}

interface NavEntryLike {
  key: string
  label: string
  placement: NavPlacement
}

export function isHideableModule(entry: { key: string; placement: NavPlacement }): boolean {
  return entry.placement === 'dock' && !ALWAYS_REACHABLE_KEYS.has(entry.key)
}

/** Remove hidden entries and apply custom labels — hideable keys only (R5-BR-2). Pure; `prefs` absent = a copy. */
export function applyNavPrefs<T extends NavEntryLike>(entries: readonly T[], prefs?: NavPrefs): T[] {
  if (!prefs) return [...entries]
  warnInvalidNavKeys(prefs)
  const out: T[] = []
  for (const entry of entries) {
    if (!isHideableModule(entry)) {
      out.push(entry)
      continue
    }
    if (prefs.visibility[entry.key] === false) continue
    const name = prefs.names[entry.key]
    out.push(typeof name === 'string' && name.trim() !== '' ? { ...entry, label: name } : entry)
  }
  return out
}

// business-rules.md:36 — an invalid module key is "ignored + flagged". The pane can't write one (the writer rejects
// it, BR-PREF-6), so it comes from a synced or forged row. DEV-only, once per key per session.
const warned = new Set<string>()
let validKeys: ReadonlySet<string> | null = null

function warnInvalidNavKeys(prefs: NavPrefs): void {
  if (process.env.NODE_ENV === 'production') return
  validKeys ??= new Set([...MODULE_MAP.filter(isHideableModule).map((e) => e.key), ...MANAGED_SURFACE_KEYS])
  for (const key of [...Object.keys(prefs.visibility), ...Object.keys(prefs.names)]) {
    if (validKeys.has(key) || warned.has(key)) continue
    warned.add(key)
    console.warn(`[nav-prefs] ignoring "${key}": not a hideable module or a managed surface`)
  }
}

/** Tests only. */
export function resetNavPrefsWarningsForTests(): void {
  warned.clear()
}
