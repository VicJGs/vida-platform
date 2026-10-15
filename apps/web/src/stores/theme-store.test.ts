import { describe, it, expect, beforeEach } from 'vitest'
import { THEME_DEFAULT } from '@vida/ui'
import { useThemeStore } from './theme-store'

describe('theme store (fe-settings S2 — app-owned theme selection, AR-4/EC-5)', () => {
  beforeEach(() => useThemeStore.setState({ selection: THEME_DEFAULT }))

  it('boots at THEME_DEFAULT (Editorial · light · calm)', () => {
    expect(useThemeStore.getState().selection).toEqual(THEME_DEFAULT)
  })

  it('setPreset changes only the preset', () => {
    useThemeStore.getState().setPreset('reader')
    expect(useThemeStore.getState().selection).toEqual({ ...THEME_DEFAULT, preset: 'reader' })
  })

  it('setMode changes only the mode', () => {
    useThemeStore.getState().setMode('dark')
    expect(useThemeStore.getState().selection).toEqual({ ...THEME_DEFAULT, mode: 'dark' })
  })

  it('setDensity changes only the density', () => {
    useThemeStore.getState().setDensity('dense')
    expect(useThemeStore.getState().selection).toEqual({ ...THEME_DEFAULT, density: 'dense' })
  })

  it('setters are independent — compose into a full selection', () => {
    const s = useThemeStore.getState()
    s.setPreset('quietDesk')
    s.setMode('dark')
    s.setDensity('dense')
    expect(useThemeStore.getState().selection).toEqual({ preset: 'quietDesk', mode: 'dark', density: 'dense' })
  })

  it('setSelection / hydrate replace the whole selection (the deferred-seam activation point)', () => {
    const next = { preset: 'reader', mode: 'dark', density: 'dense' } as const
    useThemeStore.getState().hydrate(next)
    expect(useThemeStore.getState().selection).toEqual(next)
    useThemeStore.getState().setSelection(THEME_DEFAULT)
    expect(useThemeStore.getState().selection).toEqual(THEME_DEFAULT)
  })
})
