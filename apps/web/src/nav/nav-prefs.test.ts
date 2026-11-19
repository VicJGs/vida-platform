import { afterEach, describe, expect, it, vi } from 'vitest'
import { GLOBAL_SURFACES, MODULE_MAP, type ModuleNavEntry } from './module-map'
import { PENDING_MODULES } from './pending-modules'
import {
  ALWAYS_REACHABLE_KEYS,
  MANAGED_SURFACE_KEYS,
  applyNavPrefs,
  isHideableModule,
  resetNavPrefsWarningsForTests,
  type NavPrefs,
} from './nav-prefs'
import { HIDEABLE_MODULES, MANAGEABLE_SURFACES } from '../settings/settings-model'
import { VISIBILITY_KEYS } from '../preferences/preferences-writer'

// preferences-rescope R5 (PLAN-R5 R5-BR-2/3/4) — the ONE nav filter both readers (dock + ⌘K) use.

// Dock modules with a built route; the rest wait in PENDING_MODULES (LIF-351).
const DOCK_KEYS = ['notes', 'tasks', 'gamification']
const PENDING_DOCK_KEYS = PENDING_MODULES.filter((e) => e.placement === 'dock').map((e) => e.key)

const prefs = (visibility: Record<string, boolean> = {}, names: Record<string, string> = {}): NavPrefs => ({
  visibility,
  names,
})
const byKey = (entries: readonly ModuleNavEntry[], key: string) => entries.find((e) => e.key === key)

afterEach(() => {
  vi.restoreAllMocks()
  resetNavPrefsWarningsForTests()
})

describe('isHideableModule', () => {
  it('is every dock module and nothing else — Settings/Home are global, so never hideable (EC-8)', () => {
    expect(MODULE_MAP.filter(isHideableModule).map((e) => e.key)).toEqual(DOCK_KEYS)
    for (const key of ALWAYS_REACHABLE_KEYS) expect(isHideableModule(byKey(MODULE_MAP, key)!)).toBe(false)
  })
})

describe('applyNavPrefs', () => {
  it('no prefs → the entries unchanged (a copy)', () => {
    const out = applyNavPrefs(MODULE_MAP)
    expect(out).toEqual([...MODULE_MAP])
    expect(out).not.toBe(MODULE_MAP)
  })

  it('omits a hidden dock module; absent or true = shown', () => {
    const out = applyNavPrefs(MODULE_MAP, prefs({ tasks: false, notes: true }))
    expect(byKey(out, 'tasks')).toBeUndefined()
    expect(byKey(out, 'notes')).toBeDefined()
    expect(byKey(out, 'journals')).toBeDefined()
  })

  it('relabels a renamed dock module, keeping its key (identity) and everything else', () => {
    const out = applyNavPrefs(MODULE_MAP, prefs({}, { notes: 'Pages' }))
    const notes = byKey(out, 'notes')!
    expect(notes.label).toBe('Pages')
    expect(notes.routePath).toBe('/notes')
    expect(byKey(MODULE_MAP, 'notes')!.label).toBe('Notes') // input untouched
  })

  it('ignores a blank name', () => {
    const out = applyNavPrefs(MODULE_MAP, prefs({}, { notes: '   ' }))
    expect(byKey(out, 'notes')!.label).toBe('Notes')
  })

  it('never touches Settings/Home or other global entries, whatever the maps say (EC-8 read side)', () => {
    const forged = prefs(
      { preferences: false, journals: false, notifications: false },
      { preferences: 'Hidden', journals: 'Nope' },
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = applyNavPrefs(MODULE_MAP, forged)
    expect(byKey(out, 'preferences')!.label).toBe('Settings')
    expect(byKey(out, 'journals')!.label).toBe('Home')
    expect(byKey(out, 'notifications')).toBeDefined()
  })

  it('works over any entry list shaped like a nav entry (global surfaces pass through)', () => {
    const surfaces = GLOBAL_SURFACES.map((s) => ({ ...s, placement: 'global' as const }))
    expect(applyNavPrefs(surfaces, prefs({ settings: false }, { home: 'X' }))).toEqual(surfaces)
  })

  it('flags (DEV) each key that is neither hideable nor a managed surface — once per key, inert otherwise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const p = prefs({ bogus: false, features: false, sync: true, preferences: false }, { alsoBogus: 'Y' })
    applyNavPrefs(MODULE_MAP, p)
    applyNavPrefs(MODULE_MAP, p) // a re-render: silent
    const flagged = warn.mock.calls.map((c) => String(c[0]))
    expect(flagged).toHaveLength(3)
    expect(flagged.join(' ')).toMatch(/bogus/)
    expect(flagged.join(' ')).toMatch(/alsoBogus/)
    expect(flagged.join(' ')).toMatch(/preferences/)
    expect(flagged.join(' ')).not.toMatch(/features|sync/)
  })
})

describe('the one definition (settings + writer derive from nav)', () => {
  it('HIDEABLE_MODULES keeps its { key, label } projection and membership', () => {
    expect(HIDEABLE_MODULES.map((m) => m.key)).toEqual(DOCK_KEYS)
    expect(Object.keys(HIDEABLE_MODULES[0]!).sort()).toEqual(['key', 'label'])
  })

  it('MANAGEABLE_SURFACES keys equal MANAGED_SURFACE_KEYS', () => {
    expect(MANAGEABLE_SURFACES.map((s) => s.key)).toEqual([...MANAGED_SURFACE_KEYS])
  })

  it('the writer accepts exactly the dock keys + the managed surfaces (unchanged membership, D13b)', () => {
    expect([...VISIBILITY_KEYS].sort()).toEqual([...DOCK_KEYS, ...PENDING_DOCK_KEYS, 'features', 'sync'].sort())
  })
})
