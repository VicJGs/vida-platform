// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// preferences-rescope R5: the pane reads the persisted view and writes through `useSettings()` (→ the preferences
// writer → the composition root) — serve the fake.
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { ModulesPane } from './modules-pane'
import { SettingsContext } from './settings-context'
import { HIDEABLE_MODULES, ALWAYS_REACHABLE_KEYS } from './settings-model'
import { queryClient } from '../lib/query-client'
import { seedPreferences } from '../preferences/preferences-queries'
import { preferencesWriter, resetPreferencesWriterForTests } from '../preferences/writer-instance'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'

const PrefsWrapper = createPrefsWrapper()

async function seed(visibility: Record<string, boolean> = {}, names: Record<string, string> = {}) {
  testPreferences.state.user = {
    ...USER_PREFERENCES_DEFAULTS,
    module_visibility: visibility,
    dashboard_layout: { theme: 'reader', moduleNames: names },
  }
  await seedPreferences(queryClient)
}

beforeEach(async () => {
  resetTestPreferences()
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
})

const renderUI = (ui: React.ReactNode) =>
  render(
    <PrefsWrapper>
      <UIProvider>{ui}</UIProvider>
    </PrefsWrapper>,
  )
const tasks = HIDEABLE_MODULES.find((m) => m.key === 'tasks')!
const habits = HIDEABLE_MODULES.find((m) => m.key === 'habits')!

describe('ModulesPane (fe-settings S5 — EC-4/EC-8/EC-12; persisted since preferences-rescope R5)', () => {
  it('renders a show/hide Switch for each hideable module (default visible)', async () => {
    await seed()
    renderUI(<ModulesPane />)
    for (const m of HIDEABLE_MODULES) {
      const sw = screen.getByLabelText(`Show ${m.label} in the nav`) as HTMLInputElement
      expect(sw.checked).toBe(true) // absent key ⇒ visible
    }
  })

  it('EC-8 escape hatch — Settings + Home are NOT in the hideable list', () => {
    expect(HIDEABLE_MODULES.some((m) => ALWAYS_REACHABLE_KEYS.has(m.key))).toBe(false)
    expect(HIDEABLE_MODULES.some((m) => m.label === 'Settings' || m.label === 'Home')).toBe(false)
  })

  it('reflects the persisted visibility', async () => {
    await seed({ tasks: false })
    renderUI(<ModulesPane />)
    expect((screen.getByLabelText(`Show ${tasks.label} in the nav`) as HTMLInputElement).checked).toBe(false)
  })

  it('a Switch persists to module_visibility; two quick toggles both persist, siblings survive (IR-2)', async () => {
    await seed()
    renderUI(<ModulesPane />)
    fireEvent.click(screen.getByLabelText(`Show ${tasks.label} in the nav`))
    fireEvent.click(screen.getByLabelText(`Show ${habits.label} in the nav`))
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.module_visibility).toEqual({ tasks: false, habits: false })
    expect(testPreferences.state.user?.dashboard_layout).toMatchObject({ theme: 'reader' })
  })

  it('EC-12 — inline rename: pencil → Input + save persists to dashboard_layout.moduleNames (trimmed)', async () => {
    await seed()
    renderUI(<ModulesPane />)
    fireEvent.click(screen.getByLabelText(`Rename ${tasks.label}`))
    const input = screen.getByLabelText(`Rename ${tasks.label}`) as HTMLInputElement
    fireEvent.change(input, { target: { value: '  Todo  ' } })
    fireEvent.click(screen.getByLabelText(`Save name for ${tasks.label}`))
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.dashboard_layout).toMatchObject({
      theme: 'reader',
      moduleNames: { tasks: 'Todo' },
    })
  })

  it('EC-12 — Enter saves, Esc cancels, an empty name writes nothing', async () => {
    await seed()
    renderUI(<ModulesPane />)
    const update = vi.spyOn(preferencesWriter, 'writePreferences')
    // Esc
    fireEvent.click(screen.getByLabelText(`Rename ${tasks.label}`))
    fireEvent.change(screen.getByLabelText(`Rename ${tasks.label}`), { target: { value: 'Nope' } })
    fireEvent.keyDown(screen.getByLabelText(`Rename ${tasks.label}`), { key: 'Escape' })
    // empty
    fireEvent.click(screen.getByLabelText(`Rename ${tasks.label}`))
    fireEvent.change(screen.getByLabelText(`Rename ${tasks.label}`), { target: { value: '   ' } })
    fireEvent.keyDown(screen.getByLabelText(`Rename ${tasks.label}`), { key: 'Enter' })
    expect(update).not.toHaveBeenCalled()
    // Enter
    fireEvent.click(screen.getByLabelText(`Rename ${tasks.label}`))
    fireEvent.change(screen.getByLabelText(`Rename ${tasks.label}`), { target: { value: 'Todo' } })
    fireEvent.keyDown(screen.getByLabelText(`Rename ${tasks.label}`), { key: 'Enter' })
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.dashboard_layout).toMatchObject({ moduleNames: { tasks: 'Todo' } })
  })

  it('the rename field is capped at 40 characters', async () => {
    await seed()
    renderUI(<ModulesPane />)
    fireEvent.click(screen.getByLabelText(`Rename ${tasks.label}`))
    expect((screen.getByLabelText(`Rename ${tasks.label}`) as HTMLInputElement).maxLength).toBe(40)
  })

  it('a renamed module speaks ONE name on every row control (rename · switch · save · cancel)', async () => {
    await seed({}, { habits: 'Rituals' })
    renderUI(<ModulesPane />)
    expect(screen.getByText('Rituals')).not.toBeNull()
    expect(screen.getByLabelText('Show Rituals in the nav')).not.toBeNull()
    fireEvent.click(screen.getByLabelText('Rename Rituals'))
    expect(screen.getByLabelText('Rename Rituals')).not.toBeNull() // the Input
    expect(screen.getByLabelText('Save name for Rituals')).not.toBeNull()
    expect(screen.getByLabelText('Cancel renaming Rituals')).not.toBeNull()
    expect(screen.queryByLabelText(/Habits/)).toBeNull()
  })

  it('Surfaces (Feature Atlas + Sync log) persist to module_visibility.features / .sync', async () => {
    await seed()
    renderUI(<ModulesPane />)
    expect(screen.getByText('Surfaces')).not.toBeNull()
    fireEvent.click(screen.getByLabelText('Sync & Activity log'))
    fireEvent.click(screen.getByLabelText('Feature Atlas'))
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.module_visibility).toEqual({ sync: false, features: false })
  })

  it('read-only (EC-7): no rename, switches disabled', async () => {
    await seed()
    render(
      <PrefsWrapper>
        <UIProvider>
          <SettingsContext.Provider value={{ readOnly: true, update: async () => {} }}>
            <ModulesPane />
          </SettingsContext.Provider>
        </UIProvider>
      </PrefsWrapper>,
    )
    await waitFor(() => expect(screen.getByLabelText(`Show ${tasks.label} in the nav`)).not.toBeNull())
    expect(screen.queryByLabelText(`Rename ${tasks.label}`)).toBeNull()
    expect((screen.getByLabelText(`Show ${tasks.label} in the nav`) as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('Feature Atlas') as HTMLInputElement).disabled).toBe(true)
  })
})
