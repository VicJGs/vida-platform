// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { TemplatePickerView } from './template-picker'
import { toTemplateItems, useTemplates, type TemplateItem } from './use-templates'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)
const SAMPLE: TemplateItem[] = [
  { id: 'tpl-1', name: 'Daily journal' },
  { id: 'tpl-2', name: 'Meeting notes' },
]

describe('TemplatePickerView (S8) — state-as-prop', () => {
  const view = (state: Parameters<typeof TemplatePickerView>[0]['state'], templates: TemplateItem[] = []) =>
    renderUI(<TemplatePickerView templates={templates} state={state} onApply={() => {}} onSaveCurrent={() => {}} />)

  it('renders a named role=group Templates panel (EC-13)', () => {
    const { getByRole } = view('empty')
    expect(getByRole('group', { name: 'Templates' })).not.toBeNull()
  })

  it('loading → aria-busy', () => {
    const { container } = view('loading')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('error → calm role=status', () => {
    const { getByRole } = view('error')
    expect(getByRole('status').textContent).toMatch(/Couldn’t load templates/)
  })

  it('empty → a message AND the Save-current affordance (you can save before any exist)', () => {
    const { getByRole, getByText } = view('empty')
    expect(getByText(/No templates yet/)).not.toBeNull()
    expect(getByRole('button', { name: 'Save current as template' })).not.toBeNull()
  })

  it('populated → a role=list of named templates, each with an Apply affordance (EC-13)', () => {
    const { getByRole, getAllByRole } = view('populated', SAMPLE)
    expect(getByRole('list')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(2)
    expect(getByRole('button', { name: 'Apply Daily journal' })).not.toBeNull()
    expect(getByRole('button', { name: 'Apply Meeting notes' })).not.toBeNull()
    expect(getByRole('button', { name: 'Save current as template' })).not.toBeNull()
  })

  it('EC-22 — Lucide svg in rows + the Save action', () => {
    const { container } = view('populated', SAMPLE)
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)
  })

  it('Apply fires onApply(id); Save fires onSaveCurrent', () => {
    const onApply = vi.fn()
    const onSaveCurrent = vi.fn()
    const { getByRole } = renderUI(
      <TemplatePickerView templates={SAMPLE} state="populated" onApply={onApply} onSaveCurrent={onSaveCurrent} />,
    )
    fireEvent.click(getByRole('button', { name: 'Apply Meeting notes' }))
    expect(onApply).toHaveBeenCalledWith('tpl-2')
    fireEvent.click(getByRole('button', { name: 'Save current as template' }))
    expect(onSaveCurrent).toHaveBeenCalledTimes(1)
  })

  it('Apply is keyboard-operable (Enter)', () => {
    const onApply = vi.fn()
    const { getByRole } = renderUI(
      <TemplatePickerView templates={SAMPLE} state="populated" onApply={onApply} onSaveCurrent={() => {}} />,
    )
    fireEvent.keyDown(getByRole('button', { name: 'Apply Daily journal' }), { key: 'Enter' })
    expect(onApply).toHaveBeenCalledWith('tpl-1')
  })
})

describe('useTemplates (S8) — data seam', () => {
  it('toTemplateItems projects {id,name} (drops bundle)', () => {
    const items = toTemplateItems([{ id: 'a', name: 'A' } as never])
    expect(items).toEqual([{ id: 'a', name: 'A' }])
  })

  it('default (no ?sample) → empty', () => {
    const { result } = renderHook(() => useTemplates('p1'))
    expect(result.current.state).toBe('empty')
    expect(result.current.templates).toHaveLength(0)
  })

  it('apply/saveCurrent resolve without throwing (stubbed deferred seams)', async () => {
    const { result } = renderHook(() => useTemplates('p1'))
    await expect(result.current.apply('tpl-1')).resolves.toBeUndefined()
    await expect(result.current.saveCurrent()).resolves.toBeUndefined()
  })
})
