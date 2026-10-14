// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { PAGE_SIZE, useCurrencies } from './use-currencies'
import { CurrenciesMode } from './currencies-mode'

function setSearch(s: string) {
  window.history.replaceState({}, '', `/gamification${s}`)
}

beforeEach(() => setSearch(''))
afterEach(() => {
  cleanup()
  setSearch('')
})

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('useCurrencies (data seam)', () => {
  it('honest M1 default = the shipped XP currency (success, not empty)', () => {
    const { result } = renderHook(() => useCurrencies())
    expect(result.current.state).toBe('success')
    expect(result.current.total).toBe(1)
    // XP is self-granted → one non-empty group
    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0]!.kind).toBe('self-granted')
    expect(result.current.groups[0]!.lines[0]!.def.code).toBe('XP')
  })

  it('?sample groups across all 3 backing kinds, in canonical order', () => {
    setSearch('?sample')
    const { result } = renderHook(() => useCurrencies())
    expect(result.current.groups.map((g) => g.kind)).toEqual(['real-money', 'measured-time', 'self-granted'])
    expect(result.current.total).toBe(5)
  })

  it('?force=empty → empty; ?force=loading/error → that state', () => {
    setSearch('?force=empty')
    expect(renderHook(() => useCurrencies()).result.current.state).toBe('empty')
    setSearch('?force=loading')
    expect(renderHook(() => useCurrencies()).result.current.state).toBe('loading')
    setSearch('?force=error')
    expect(renderHook(() => useCurrencies()).result.current.state).toBe('error')
  })

  it('?big paginates 50/page (120 → 3 pages); setPage slices', () => {
    setSearch('?big')
    const { result } = renderHook(() => useCurrencies())
    expect(result.current.total).toBe(120)
    expect(result.current.page.count).toBe(Math.ceil(120 / PAGE_SIZE))
    act(() => result.current.setPage(2))
    expect(result.current.page.index).toBe(2)
  })

  it('create appends an optimistic-local currency', () => {
    const { result } = renderHook(() => useCurrencies())
    act(() => result.current.create({ name: 'Gems', backing_kind: 'real-money' }))
    expect(result.current.total).toBe(2)
    const codes = result.current.groups.flatMap((g) => g.lines.map((l) => l.def.code))
    expect(codes).toContain('GEMS')
  })
})

describe('CurrenciesMode (EC-5)', () => {
  it('renders the grouped currencies + the + New currency entry', () => {
    setSearch('?sample')
    const { getByText, getAllByText } = renderUI(<CurrenciesMode />)
    // backing-kind group eyebrows + a known currency row + its locked composition
    expect(getByText('Real money')).not.toBeNull()
    expect(getByText('Measured time')).not.toBeNull()
    expect(getByText('Self-granted')).not.toBeNull()
    expect(getByText('Allowance')).not.toBeNull()
    expect(getAllByText(/locked$/).length).toBeGreaterThan(0) // 🔒 locked (Lucide icon + text)
    expect(getByText('New currency')).not.toBeNull()
  })

  it('+ New currency reveals an optimistic-local create form', () => {
    const { getByText, getByLabelText, queryByLabelText } = renderUI(<CurrenciesMode />)
    expect(queryByLabelText('Currency name')).toBeNull()
    fireEvent.click(getByText('New currency'))
    expect(getByLabelText('Currency name')).not.toBeNull()
  })
})
