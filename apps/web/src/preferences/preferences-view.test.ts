// preferences-rescope R2 (LIF-247) — the pure view mapper (PLAN-R2 §4.1): one view over the two merged rows, the patch
// builders, and the ONE merge function per table (map-aware), with every degrade + the persona sentinel.
import { describe, it, expect } from 'vitest'
import { THEME_DEFAULT } from '@vida/ui'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS, UpdatePreferencesSchema } from '@vida/core'
import type { MergedPreferences } from '@vida/types'
import {
  applyNavPatch,
  applyUserPatch,
  defaultView,
  PERSONA_UNSET,
  toNavPatch,
  toUserPatch,
  toView,
  type PreferencesView,
} from './preferences-view'

const U = USER_PREFERENCES_DEFAULTS
const N = NAV_PREFERENCES_DEFAULTS

describe('toView', () => {
  it('defaultView equals the shipped store defaults (parity, IR-7)', () => {
    expect(defaultView()).toEqual({
      selection: THEME_DEFAULT,
      reduceMotion: false,
      arrangement: 'journalFirst',
      moduleVisibility: {},
      moduleNames: {},
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      weekStartsOn: 1,
      notifInApp: true,
      notifPush: true,
      notifEmail: true,
      quietHours: false,
      persona: PERSONA_UNSET,
    } satisfies PreferencesView)
  })

  it("maps theme 'system' to light (the codec's cold start, N9)", () => {
    expect(toView({ ...U, theme: 'system' }, N).selection.mode).toBe('light')
    expect(toView({ ...U, theme: 'dark' }, N).selection.mode).toBe('dark')
  })

  it('maps compact_mode to density and the dashboard_layout theme sub-key to the preset', () => {
    const v = toView({ ...U, compact_mode: true, dashboard_layout: { theme: 'reader' } }, N)
    expect(v.selection).toEqual({ preset: 'reader', mode: 'light', density: 'dense' })
  })

  it('degrades unknown sub-keys and out-of-range scalars to their defaults (N10)', () => {
    const v = toView(
      {
        ...U,
        dashboard_layout: { theme: 'neon', arrangement: 'sideways', moduleNames: { tasks: 'To-dos', habits: 42 } },
        week_starts_on: 7,
        date_format: 'YY',
      },
      N,
    )
    expect(v.selection.preset).toBe(THEME_DEFAULT.preset)
    expect(v.arrangement).toBe('journalFirst')
    expect(v.moduleNames).toEqual({ tasks: 'To-dos' }) // the non-string name is dropped
    expect(v.weekStartsOn).toBe(1)
    expect(v.dateFormat).toBe('YYYY-MM-DD')
  })

  it('maps persona null ↔ the unset sentinel', () => {
    expect(toView({ ...U, persona: null }, N).persona).toBe(PERSONA_UNSET)
    expect(toView({ ...U, persona: 'student' }, N).persona).toBe('student')
    expect(toUserPatch({ persona: PERSONA_UNSET })).toEqual({ persona: null })
    expect(toUserPatch({ persona: 'parent' })).toEqual({ persona: 'parent' })
  })

  it('reads reduce_motion from the nav row', () => {
    expect(toView(U, { ...N, reduce_motion: true }).reduceMotion).toBe(true)
  })

  it('keeps falsy-valid values (BR-PREF-9): week 0, compact false', () => {
    const merged = applyUserPatch({ ...U, compact_mode: true, week_starts_on: 1 }, { compact_mode: false, week_starts_on: 0 })
    expect(merged.compact_mode).toBe(false)
    expect(merged.week_starts_on).toBe(0)
    expect(toView(merged, N).weekStartsOn).toBe(0)
  })
})

describe('patch builders', () => {
  it('routes each view field to its column / sub-key, and reduceMotion to nav only', () => {
    expect(
      toUserPatch({
        selection: { preset: 'quietDesk', mode: 'dark', density: 'dense' },
        arrangement: 'dashboardFirst',
        moduleVisibility: { tasks: false },
        moduleNames: { tasks: 'To-dos' },
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        weekStartsOn: 0,
        notifInApp: false,
        notifPush: false,
        notifEmail: false,
        quietHours: true,
        reduceMotion: true,
      }),
    ).toEqual({
      theme: 'dark',
      compact_mode: true,
      dashboard_layout: { theme: 'quietDesk', arrangement: 'dashboardFirst', moduleNames: { tasks: 'To-dos' } },
      module_visibility: { tasks: false },
      date_format: 'DD/MM/YYYY',
      time_format: '12h',
      week_starts_on: 0,
      notification_in_app: false,
      notification_push: false,
      notification_email: false,
      quiet_hours_enabled: true,
    })
    expect(toNavPatch({ reduceMotion: true, dateFormat: 'DD/MM/YYYY' })).toEqual({ reduce_motion: true })
    expect(toNavPatch({ dateFormat: 'DD/MM/YYYY' })).toEqual({})
    expect(toUserPatch({ reduceMotion: true })).toEqual({})
  })

  it('every user patch it builds passes the real UpdatePreferencesSchema with no key stripped', () => {
    const patch = toUserPatch({
      selection: { preset: 'reader', mode: 'light', density: 'calm' },
      arrangement: 'journalFirst',
      moduleVisibility: { notes: true },
      moduleNames: { notes: 'Pages' },
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h',
      weekStartsOn: 1,
      notifInApp: true,
      notifPush: true,
      notifEmail: true,
      quietHours: false,
      persona: PERSONA_UNSET,
    })
    const parsed = UpdatePreferencesSchema.parse(patch) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(patch).sort())
  })

  it('round-trips view → patch → merged → view', () => {
    const target: PreferencesView = {
      selection: { preset: 'quietDesk', mode: 'dark', density: 'dense' },
      reduceMotion: true,
      arrangement: 'dashboardFirst',
      moduleVisibility: { habits: false, features: false },
      moduleNames: { tasks: 'To-dos' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      weekStartsOn: 0,
      notifInApp: false,
      notifPush: true,
      notifEmail: false,
      quietHours: true,
      persona: 'creative',
    }
    const user = applyUserPatch(U, toUserPatch(target))
    const nav = applyNavPatch(N, toNavPatch(target))
    expect(toView(user, nav)).toEqual(target)
  })
})

describe('applyUserPatch — the one merge (map-aware)', () => {
  it('merges dashboard_layout per sub-key, never replacing the object', () => {
    let m: MergedPreferences = { ...U, dashboard_layout: { theme: 'reader', widgets: ['agenda'] } }
    m = applyUserPatch(m, { dashboard_layout: { arrangement: 'dashboardFirst' } })
    expect(m.dashboard_layout).toEqual({ theme: 'reader', widgets: ['agenda'], arrangement: 'dashboardFirst' })
  })

  it('map-merges moduleNames inside dashboard_layout ({a} then {b} keeps both)', () => {
    let m = applyUserPatch(U, { dashboard_layout: { moduleNames: { tasks: 'To-dos' } } })
    m = applyUserPatch(m, { dashboard_layout: { moduleNames: { habits: 'Rituals' } } })
    expect(m.dashboard_layout).toEqual({ moduleNames: { tasks: 'To-dos', habits: 'Rituals' } })
  })

  it('map-merges module_visibility ({a} then {b} keeps both)', () => {
    let m = applyUserPatch(U, { module_visibility: { tasks: false } })
    m = applyUserPatch(m, { module_visibility: { features: false } })
    expect(m.module_visibility).toEqual({ tasks: false, features: false })
  })
})
