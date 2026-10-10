// Pure — the M1 nav-placement prefs stub (fe-shell #14 · S1).
import { describe, expect, it } from 'vitest'
import { DEFAULT_PLACEMENT } from './regions'
import { stubShellPrefs } from './shell-prefs'

describe('shell placement prefs — M1 stub (nav_preferences seam)', () => {
  it('returns the cold-start default (deny-safe; live persistence deferred to first consumer)', async () => {
    await expect(stubShellPrefs()).resolves.toEqual(DEFAULT_PLACEMENT)
  })

  it('is a ProviderRead (a zero-arg promise), never a raw table read', () => {
    expect(stubShellPrefs).toHaveLength(0)
    expect(stubShellPrefs()).toBeInstanceOf(Promise)
  })
})
