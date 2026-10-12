// @vitest-environment jsdom
// fe-onboarding (LIF-216) · S2 — module enable-set picker: the roster projection (mirrors the dock's visibility + the
// honest default), the in-memory selection seam, and the grouped aria-pressed toggle view. Wrapped in <UIProvider>
// (the onboarding.test.tsx / guided-setup.test.tsx precedent).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { MODULE_MAP } from '../nav/module-map'
import { lintCopy } from '../voice/voice-copy'
import { getDockModuleGroups, defaultModuleEnableSet } from './modules'
import { useModuleSelection } from './use-module-selection'
import { ModulePickerView } from './module-picker'

afterEach(() => cleanup())

describe('modules (roster projection)', () => {
  it('mirrors the visible dock set — grouped, declaration order, gamification excluded', () => {
    const groups = getDockModuleGroups()
    expect(groups.map((g) => g.group)).toEqual([
      'integration',
      'productivity',
      'knowledge',
      'personal-growth',
      'life-management',
    ])
    // platform-services (only the flag-gated gamification in the dock) drops in M1.0 — no empty heading.
    expect(groups.map((g) => g.group)).not.toContain('platform-services')
    const keys = groups.flatMap((g) => g.modules.map((m) => m.key))
    expect(keys).toContain('notes')
    expect(keys).not.toContain('gamification') // feature-flag OFF → not dock-visible → not offered
  })

  it('offers exactly the placement:dock, feature-visible modules (the honesty guard)', () => {
    const offered = getDockModuleGroups()
      .flatMap((g) => g.modules.map((m) => m.key))
      .sort()
    // the independent oracle: MODULE_MAP filtered the same way the dock filters (sans the always-off gamification flag).
    const expected = MODULE_MAP.filter((e) => e.placement === 'dock' && e.visibleWhen == null)
      .map((e) => e.key)
      .sort()
    expect(offered).toEqual(expected)
  })

  it('defaults every visible-dock module ON (matches today — the preview cannot lie)', () => {
    const def = defaultModuleEnableSet()
    const keys = getDockModuleGroups().flatMap((g) => g.modules.map((m) => m.key))
    expect(Object.keys(def).sort()).toEqual([...keys].sort())
    expect(Object.values(def).every((v) => v === true)).toBe(true)
  })

  it('every module + group label is copy-honest (lintCopy clean — EC-7)', () => {
    for (const g of getDockModuleGroups()) {
      expect(lintCopy(g.label)).toEqual([])
      for (const m of g.modules) expect(lintCopy(m.label)).toEqual([])
    }
  })
})

describe('useModuleSelection (in-memory seam)', () => {
  it('inits to the default enable-set', () => {
    const { result } = renderHook(() => useModuleSelection())
    expect(result.current.enabled).toEqual(defaultModuleEnableSet())
  })

  it('toggle flips one module; setEnabled sets it explicitly', () => {
    const { result } = renderHook(() => useModuleSelection())
    act(() => result.current.toggle('notes'))
    expect(result.current.enabled.notes).toBe(false)
    act(() => result.current.setEnabled('notes', true))
    expect(result.current.enabled.notes).toBe(true)
  })

  it('commit resolves no-op (honest stub — no persistence claim at M1)', async () => {
    const { result } = renderHook(() => useModuleSelection())
    await expect(result.current.commit(result.current.enabled)).resolves.toBeUndefined()
  })
})

describe('ModulePickerView (grouped toggles)', () => {
  const groups = getDockModuleGroups()

  const renderView = (enabled: Record<string, boolean>, onToggle = vi.fn()) =>
    render(
      <UIProvider>
        <ModulePickerView groups={groups} enabled={enabled} onToggle={onToggle} />
      </UIProvider>,
    )

  it('renders a labelled group per group and a toggle per module', () => {
    renderView(defaultModuleEnableSet())
    for (const g of groups) expect(screen.getByRole('group', { name: g.label })).toBeTruthy()
    const toggleCount = groups.reduce((n, g) => n + g.modules.length, 0)
    // every module toggle + the outer picker group buttons: assert the Notes toggle exists + reflects state.
    expect(screen.getByRole('button', { name: 'Notes', pressed: true })).toBeTruthy()
    expect(screen.getAllByRole('button').length).toBe(toggleCount)
  })

  it('aria-pressed reflects the enable-set', () => {
    const enabled = { ...defaultModuleEnableSet(), notes: false }
    renderView(enabled)
    expect(screen.getByRole('button', { name: 'Notes', pressed: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tasks', pressed: true })).toBeTruthy()
  })

  it('onToggle fires with the module key', () => {
    const onToggle = vi.fn()
    renderView(defaultModuleEnableSet(), onToggle)
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    expect(onToggle).toHaveBeenCalledWith('notes')
  })
})
