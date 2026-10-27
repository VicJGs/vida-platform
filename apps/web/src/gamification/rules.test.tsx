// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { useRules } from './use-rules'
import { RulesMode } from './rules-mode'

function setSearch(s: string) {
  window.history.replaceState({}, '', `/gamification${s}`)
}
beforeEach(() => setSearch(''))
afterEach(() => {
  cleanup()
  setSearch('')
})
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('useRules (data seam)', () => {
  it('honest M1 default = empty (rules are user-authored); the Flow reads are honest-empty', () => {
    const { result } = renderHook(() => useRules())
    expect(result.current.state).toBe('empty')
    expect(result.current.total).toBe(0)
    expect(result.current.availableMeasures).toEqual([]) // EC-9 honest empty-seam
    expect(result.current.dreams).toEqual([]) // deny-safe Purposes read
    expect(result.current.rewardCurrencies.length).toBeGreaterThan(0)
  })

  it('?sample = 2 rules; toggle flips enabled, remove drops, create appends (optimistic-local)', () => {
    setSearch('?sample')
    const { result, rerender } = renderHook(() => useRules())
    expect(result.current.total).toBe(2)
    const focus = result.current.rules.find((r) => r.id === 'r-focus')!
    expect(focus.isEnabled).toBe(true)
    result.current.toggle('r-focus')
    rerender()
    expect(result.current.rules.find((r) => r.id === 'r-focus')!.isEnabled).toBe(false)
    result.current.remove('r-week')
    rerender()
    expect(result.current.rules.find((r) => r.id === 'r-week')).toBeUndefined()
    result.current.create({
      name: 'Nightly wind-down',
      condition: { kind: 'event_trigger', eventType: 'day.ended' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 20 } }],
    })
    rerender()
    expect(result.current.rules.some((r) => r.name === 'Nightly wind-down')).toBe(true)
  })
})

describe('RulesMode + RuleAuthoringFlow (EC-7 / EC-9)', () => {
  it('EC-7 — lists rules with condition/consequence summary + an enable toggle', () => {
    setSearch('?sample')
    const { getByText } = renderUI(<RulesMode />)
    expect(getByText('Daily focus reward')).not.toBeNull()
    expect(getByText('on week.ended → grant 100 COIN')).not.toBeNull()
    expect(getByText('Enabled')).not.toBeNull()
  })

  it('EC-9 — + New rule opens the 3-stage Flow; condition shows the honest empty-seam measures', () => {
    const { getByText, getByLabelText } = renderUI(<RulesMode />)
    fireEvent.click(getByText('New rule'))
    // FlowSessionView frame + the condition stage's honest empty-seam
    expect(getByText('New rule')).not.toBeNull()
    expect(getByText(/No measures are available yet/)).not.toBeNull()
    expect(getByLabelText('Rule name')).not.toBeNull()
    expect(getByLabelText('Trigger event')).not.toBeNull()
  })

  it('EC-9 — walking condition → reward → review → Create adds the rule (optimistic-local)', () => {
    const { getByText, getByLabelText, queryByText } = renderUI(<RulesMode />)
    fireEvent.click(getByText('New rule'))
    fireEvent.change(getByLabelText('Rule name'), { target: { value: 'Morning win' } })
    fireEvent.change(getByLabelText('Trigger event'), { target: { value: 'morning.done' } })
    fireEvent.click(getByText('Next')) // → reward
    fireEvent.change(getByLabelText('Amount'), { target: { value: '30' } })
    fireEvent.click(getByText('Next')) // → review
    fireEvent.click(getByText('Create rule'))
    // back on the list, the new rule appears
    expect(getByText('Morning win')).not.toBeNull()
    expect(queryByText(/No measures are available yet/)).toBeNull() // the flow closed
  })
})
