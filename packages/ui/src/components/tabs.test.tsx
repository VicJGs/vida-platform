// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Tabs } from './tabs'

afterEach(cleanup)

const ITEMS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
]

function renderTabs(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

function Basic(props: Partial<React.ComponentProps<typeof Tabs>>) {
  return (
    <Tabs items={ITEMS} {...props}>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
      <Tabs.Panel value="c">Panel C</Tabs.Panel>
    </Tabs>
  )
}

describe('Tabs — roles + ARIA wiring', () => {
  it('renders a tablist of role=tab buttons and one role=tabpanel', () => {
    renderTabs(<Basic defaultValue="a" />)
    expect(screen.getByRole('tablist')).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1) // only the active panel is mounted
  })

  it('the active tab is aria-selected + aria-controls its panel; the panel is aria-labelledby the tab', () => {
    renderTabs(<Basic defaultValue="b" />)
    const active = screen.getByRole('tab', { name: 'Bravo' })
    const panel = screen.getByRole('tabpanel')
    expect(active.getAttribute('aria-selected')).toBe('true')
    expect(active.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(active.id)
    expect(panel.textContent).toContain('Panel B')
  })

  it('tabs render as native <button>s with type=button', () => {
    renderTabs(<Basic defaultValue="a" />)
    const tab = screen.getByRole('tab', { name: 'Alpha' })
    expect(tab.tagName).toBe('BUTTON')
    expect(tab.getAttribute('type')).toBe('button')
  })

  it('aria-orientation reflects the orientation prop', () => {
    renderTabs(<Basic defaultValue="a" orientation="vertical" />)
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical')
  })

  it('forwards the ref to the root HTMLDivElement', () => {
    const ref = createRef<HTMLDivElement>()
    renderTabs(<Basic defaultValue="a" ref={ref} />)
    expect(ref.current?.tagName).toBe('DIV')
  })
})

describe('Tabs — roving tabindex', () => {
  it('only the active tab is tabIndex=0; the rest are -1', () => {
    renderTabs(<Basic defaultValue="b" />)
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('tabindex')).toBe('-1')
    expect(screen.getByRole('tab', { name: 'Bravo' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('tab', { name: 'Charlie' }).getAttribute('tabindex')).toBe('-1')
  })

  it('the panel is focusable (tabIndex=0) so Tab moves focus into it', () => {
    renderTabs(<Basic defaultValue="a" />)
    expect(screen.getByRole('tabpanel').getAttribute('tabindex')).toBe('0')
  })
})

describe('Tabs — keyboard nav (automatic activation)', () => {
  it('ArrowRight selects the next tab and swaps the panel', () => {
    renderTabs(<Basic defaultValue="a" />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Bravo' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toContain('Panel B')
  })

  it('ArrowLeft wraps from the first tab to the last', () => {
    renderTabs(<Basic defaultValue="a" />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Charlie' }).getAttribute('aria-selected')).toBe('true')
  })

  it('Home/End jump to the first/last tab', () => {
    renderTabs(<Basic defaultValue="b" />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Charlie' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true')
  })

  it('vertical orientation uses ArrowDown/ArrowUp', () => {
    renderTabs(<Basic defaultValue="a" orientation="vertical" />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowDown' })
    expect(screen.getByRole('tab', { name: 'Bravo' }).getAttribute('aria-selected')).toBe('true')
  })

  it('arrow nav skips a disabled tab', () => {
    const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo', disabled: true },
      { value: 'c', label: 'Charlie' },
    ]
    renderTabs(
      <Tabs items={items} defaultValue="a">
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
        <Tabs.Panel value="c">C</Tabs.Panel>
      </Tabs>,
    )
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    // Bravo is disabled → skipped → Charlie becomes active
    expect(screen.getByRole('tab', { name: 'Charlie' }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('Tabs — disabled', () => {
  it('a disabled tab is aria-disabled and NOT natively disabled (stays in the a11y tree)', () => {
    const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo', disabled: true },
    ]
    renderTabs(
      <Tabs items={items} defaultValue="a">
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>,
    )
    const disabled = screen.getByRole('tab', { name: 'Bravo' })
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    expect((disabled as HTMLButtonElement).disabled).toBe(false)
  })

  it('clicking a disabled tab does not select it', () => {
    const onValueChange = vi.fn()
    const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo', disabled: true },
    ]
    renderTabs(
      <Tabs items={items} defaultValue="a" onValueChange={onValueChange}>
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Bravo' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true')
  })

  it('an uncontrolled defaultValue on a disabled tab falls back to the first enabled tab (D8)', () => {
    const items = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Bravo' },
    ]
    renderTabs(
      <Tabs items={items} defaultValue="a">
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'Bravo' }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('Tabs — controlled vs uncontrolled', () => {
  it('uncontrolled: clicking a tab selects it and fires onValueChange', () => {
    const onValueChange = vi.fn()
    renderTabs(<Basic defaultValue="a" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Charlie' }))
    expect(onValueChange).toHaveBeenCalledWith('c')
    expect(screen.getByRole('tabpanel').textContent).toContain('Panel C')
  })

  it('controlled: the parent value wins; a click fires onValueChange but does not self-update', () => {
    const onValueChange = vi.fn()
    renderTabs(<Basic value="a" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Bravo' }))
    expect(onValueChange).toHaveBeenCalledWith('b')
    // value stays 'a' (parent did not update) → Alpha remains selected
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true')
  })

  it('defaults to the first enabled tab when neither value nor defaultValue is given', () => {
    renderTabs(<Basic />)
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('Tabs — panel composition', () => {
  it('only the active panel content is mounted; switching swaps it', () => {
    renderTabs(<Basic defaultValue="a" />)
    expect(screen.queryByText('Panel B')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Bravo' }))
    expect(screen.getByText('Panel B')).toBeTruthy()
    expect(screen.queryByText('Panel A')).toBeNull()
  })

  it('passes extra Tabs.Panel props (aria-busy) through to the tabpanel wrapper', () => {
    renderTabs(
      <Tabs items={ITEMS} defaultValue="a">
        <Tabs.Panel value="a" aria-busy>
          Loading
        </Tabs.Panel>
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
        <Tabs.Panel value="c">Panel C</Tabs.Panel>
      </Tabs>,
    )
    expect(screen.getByRole('tabpanel').getAttribute('aria-busy')).toBe('true')
  })

  it('ignores non-Panel children without throwing (toArray + type-guard)', () => {
    renderTabs(
      <Tabs items={ITEMS} defaultValue="a">
        {false && <Tabs.Panel value="x">nope</Tabs.Panel>}
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        {null}
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
        <Tabs.Panel value="c">Panel C</Tabs.Panel>
      </Tabs>,
    )
    expect(screen.getByRole('tabpanel').textContent).toContain('Panel A')
  })
})

describe('Tabs — dev warnings', () => {
  it('warns on an orphan Tabs.Panel (value matches no item)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderTabs(
      <Tabs items={ITEMS} defaultValue="a">
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
        <Tabs.Panel value="c">C</Tabs.Panel>
        <Tabs.Panel value="zzz">orphan</Tabs.Panel>
      </Tabs>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('orphan panel'))
    warn.mockRestore()
  })

  it('warns when a value names a disabled tab', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const items = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Bravo' },
    ]
    renderTabs(
      <Tabs items={items} defaultValue="a">
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled tab'))
    warn.mockRestore()
  })
})
