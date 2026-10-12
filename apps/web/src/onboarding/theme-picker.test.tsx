// @vitest-environment jsdom
// fe-onboarding (LIF-216) · S3 — theme picker: the preset-selection + live-preview seam and the swatch view. Wrapped in
// <UIProvider> (the guided-setup.test.tsx precedent). The live lever (onPreview) is asserted at the hook; the visual
// live-preview re-root is proven in the Visual Gate.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { UIProvider, THEME_PRESETS, THEME_DEFAULT } from '@vida/ui'
import { lintCopy } from '../voice/voice-copy'
import { useThemeSelection } from './use-theme-selection'
import { ThemePickerView } from './theme-picker'

afterEach(() => cleanup())

const PRESET_LABEL: Record<string, string> = { editorial: 'Editorial', reader: 'Reader', quietDesk: 'Quiet Desk' }

describe('useThemeSelection (preview + persist seam)', () => {
  it('inits to the cold-start default preset', () => {
    const { result } = renderHook(() => useThemeSelection())
    expect(result.current.selected).toBe(THEME_DEFAULT.preset)
  })

  it('preview selects AND drives the app-owned live lever (onPreview)', () => {
    const onPreview = vi.fn()
    const { result } = renderHook(() => useThemeSelection({ onPreview }))
    act(() => result.current.preview('reader'))
    expect(result.current.selected).toBe('reader')
    expect(onPreview).toHaveBeenCalledWith('reader')
  })

  it('preview still reflects when no lever is injected (reflect-only in isolation)', () => {
    const { result } = renderHook(() => useThemeSelection())
    act(() => result.current.preview('quietDesk'))
    expect(result.current.selected).toBe('quietDesk')
  })

  it('commit resolves no-op (honest stub — no persistence claim at M1)', async () => {
    const { result } = renderHook(() => useThemeSelection())
    await expect(result.current.commit('reader')).resolves.toBeUndefined()
  })
})

describe('ThemePickerView (swatches)', () => {
  const renderView = (selected = THEME_DEFAULT.preset, onSelect = vi.fn()) =>
    render(
      <UIProvider>
        <ThemePickerView selected={selected} onSelect={onSelect} />
      </UIProvider>,
    )

  it('renders a swatch per shipped preset, labelled', () => {
    renderView()
    for (const p of THEME_PRESETS) {
      expect(screen.getByRole('button', { name: PRESET_LABEL[p] })).toBeTruthy()
    }
    expect(screen.getAllByRole('button').length).toBe(THEME_PRESETS.length)
  })

  it('aria-pressed reflects the selected preset (single-select)', () => {
    renderView('reader')
    expect(screen.getByRole('button', { name: 'Reader', pressed: true })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Editorial', pressed: false })).toBeTruthy()
    // exactly one pressed
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
  })

  it('onSelect fires with the preset key', () => {
    const onSelect = vi.fn()
    renderView(THEME_DEFAULT.preset, onSelect)
    fireEvent.click(screen.getByRole('button', { name: 'Reader' }))
    expect(onSelect).toHaveBeenCalledWith('reader')
  })

  it('every preset label is copy-honest (lintCopy clean — EC-7)', () => {
    for (const p of THEME_PRESETS) expect(lintCopy(PRESET_LABEL[p])).toEqual([])
  })
})
