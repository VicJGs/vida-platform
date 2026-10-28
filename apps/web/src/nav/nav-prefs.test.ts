import { afterEach, describe, expect, it, vi } from 'vitest'
import { GLOBAL_SURFACES, MODULE_MAP, type ModuleNavEntry } from './module-map'
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

const DOCK_KEYS = [
  'notes',
  'tasks',
  'habits',
  'projects',
  'routines',
  'learning',
  'books',
  'knowledge',
  'skills',
  'sessions',
  'purposes',
  'health',
  'finance',
  'relationships',
  'gamification',
]

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
    const out = applyNavPrefs(MODULE_MAP, prefs({ tasks: false, habits: true }))
    expect(byKey(out, 'tasks')).toBeUndefined()
    expect(byKey(out, 'habits')).toBeDefined()
    expect(byKey(out, 'notes')).toBeDefined()
  })

  it('relabels a renamed dock module, keeping its key (identity) and everything else', () => {
    const out = applyNavPrefs(MODULE_MAP, prefs({}, { habits: 'Rituals' }))
    const habits = byKey(out, 'habits')!
    expect(habits.label).toBe('Rituals')
    expect(habits.routePath).toBe('/habits')
    expect(byKey(MODULE_MAP, 'habits')!.label).toBe('Habits') // input untouched
  })

  it('ignores a blank name', () => {
    const out = applyNavPrefs(MODULE_MAP, prefs({}, { habits: '   ' }))
    expect(byKey(out, 'habits')!.label).toBe('Habits')
  })

  it('never touches Settings/Home/global or secondary entries, whatever the maps say (EC-8 read side)', () => {
    const forged = prefs(
      { preferences: false, journals: false, notifications: false, checkins: false },
      { preferences: 'Hidden', journals: 'Nope', checkins: 'X' },
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = applyNavPrefs(MODULE_MAP, forged)
    expect(byKey(out, 'preferences')!.label).toBe('Settings')
    expect(byKey(out, 'journals')!.label).toBe('Home')
    expect(byKey(out, 'notifications')).toBeDefined()
    expect(byKey(out, 'checkins')!.label).toBe('Check-ins')
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
    expect([...VISIBILITY_KEYS].sort()).toEqual([...DOCK_KEYS, 'features', 'sync'].sort())
  })
})
