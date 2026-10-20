// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { ModulesPane } from './modules-pane'
import { usePreferencesStore } from '../stores/preferences-store'
import { HIDEABLE_MODULES, ALWAYS_REACHABLE_KEYS } from './settings-model'

afterEach(cleanup)
beforeEach(() => usePreferencesStore.setState({ moduleVisibility: {}, moduleNames: {} }))

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('ModulesPane (fe-settings S5 — EC-4/EC-8/EC-12)', () => {
  it('renders a show/hide Switch for each hideable module (default visible)', () => {
    const { getByLabelText } = renderUI(<ModulesPane />)
    for (const m of HIDEABLE_MODULES) {
      const sw = getByLabelText(`Show ${m.label} in the nav`) as HTMLInputElement
      expect(sw).not.toBeNull()
      expect(sw.checked).toBe(true) // absent key ⇒ visible
    }
  })

  it('EC-8 escape hatch — Settings + Home are NOT in the hideable list', () => {
    // belt + suspenders: the list excludes the always-reachable keys AND they are `global` (not dock) anyway.
    expect(HIDEABLE_MODULES.some((m) => ALWAYS_REACHABLE_KEYS.has(m.key))).toBe(false)
    expect(HIDEABLE_MODULES.some((m) => m.label === 'Settings' || m.label === 'Home')).toBe(false)
  })

  it('toggling a module Switch writes to the store (in-session)', () => {
    const first = HIDEABLE_MODULES[0]!
    const { getByLabelText } = renderUI(<ModulesPane />)
    fireEvent.click(getByLabelText(`Show ${first.label} in the nav`))
    expect(usePreferencesStore.getState().moduleVisibility[first.key]).toBe(false)
  })

  it('EC-12 — inline rename: pencil → Input + save commits the new name', () => {
    const first = HIDEABLE_MODULES[0]!
    const { getByLabelText } = renderUI(<ModulesPane />)
    fireEvent.click(getByLabelText(`Rename ${first.label}`))
    const input = getByLabelText(`Rename ${first.label}`) as HTMLInputElement // the Input now carries the aria-label
    fireEvent.change(input, { target: { value: 'My name' } })
    fireEvent.click(getByLabelText(`Save name for ${first.label}`))
    expect(usePreferencesStore.getState().moduleNames[first.key]).toBe('My name')
  })

  it('EC-12 — cancel discards the rename', () => {
    const first = HIDEABLE_MODULES[0]!
    const { getByLabelText } = renderUI(<ModulesPane />)
    fireEvent.click(getByLabelText(`Rename ${first.label}`))
    const input = getByLabelText(`Rename ${first.label}`) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.click(getByLabelText(`Cancel renaming ${first.label}`))
    expect(usePreferencesStore.getState().moduleNames[first.key]).toBeUndefined()
  })

  it('renders the Surfaces subsection (Feature Atlas + Sync log toggles)', () => {
    const { getByText, getByLabelText } = renderUI(<ModulesPane />)
    expect(getByText('Surfaces')).not.toBeNull()
    expect(getByLabelText('Feature Atlas')).not.toBeNull()
    const syncSwitch = getByLabelText('Sync & Activity log') as HTMLInputElement
    fireEvent.click(syncSwitch)
    expect(usePreferencesStore.getState().moduleVisibility.sync).toBe(false)
  })

  it('a renamed module shows its custom label on the Switch', () => {
    const first = HIDEABLE_MODULES[0]!
    usePreferencesStore.setState({ moduleNames: { [first.key]: 'Rituals' }, moduleVisibility: {} })
    const { getByLabelText } = renderUI(<ModulesPane />)
    expect(getByLabelText('Show Rituals in the nav')).not.toBeNull()
  })
})
