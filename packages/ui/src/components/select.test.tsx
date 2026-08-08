// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Select } from './select'

afterEach(cleanup)

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

function renderSelect(ui: React.ReactElement) {
  const utils = render(<UIProvider>{ui}</UIProvider>)
  const trigger = screen.getByRole('combobox')
  return { ...utils, trigger }
}

describe('Select', () => {
  it('renders a <button role="combobox"> trigger with haspopup=listbox, collapsed by default', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} placeholder="Pick" aria-label="Fruit" />)
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('forwards the ref to the trigger HTMLButtonElement', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <UIProvider>
        <Select options={FRUITS} aria-label="Fruit" ref={ref} />
      </UIProvider>,
    )
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  it('shows the placeholder when empty', () => {
    render(
      <UIProvider>
        <Select options={FRUITS} placeholder="Pick a fruit" aria-label="Fruit" />
      </UIProvider>,
    )
    expect(screen.getByText('Pick a fruit')).toBeTruthy()
  })

  it('shows the option label when a defaultValue is set (uncontrolled)', () => {
    render(
      <UIProvider>
        <Select options={FRUITS} defaultValue="banana" placeholder="Pick a fruit" aria-label="Fruit" />
      </UIProvider>,
    )
    expect(screen.getByText('Banana')).toBeTruthy()
  })

  it('opens on click → listbox with an option per entry, aria-expanded/controls wired', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" />)
    fireEvent.click(trigger)
    const listbox = screen.getByRole('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id)
    expect(listbox.getAttribute('aria-multiselectable')).toBe('false')
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('the listbox mirrors the trigger accessible name', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" />)
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe('Fruit')
  })

  it('opens on Enter and on ArrowDown', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" />)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('option ids are unique across multiple Select instances (useId, not index-only)', () => {
    render(
      <UIProvider>
        <Select options={FRUITS} aria-label="A" />
        <Select options={FRUITS} aria-label="B" />
      </UIProvider>,
    )
    const [a, b] = screen.getAllByRole('combobox')
    fireEvent.click(a!)
    fireEvent.click(b!)
    const listboxes = screen.getAllByRole('listbox')
    expect(listboxes[0]!.id).not.toBe(listboxes[1]!.id)
  })

  it('ArrowDown/Up move aria-activedescendant, SKIP disabled options, and do NOT wrap', () => {
    const opts = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ]
    const { trigger } = renderSelect(<Select options={opts} aria-label="X" />)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // opens, active = first enabled (A)
    const active0 = trigger.getAttribute('aria-activedescendant')!
    expect(document.getElementById(active0)?.textContent).toContain('A')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // skips disabled B → C
    const active1 = trigger.getAttribute('aria-activedescendant')!
    expect(document.getElementById(active1)?.textContent).toContain('C')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // no-wrap: stays on C
    expect(trigger.getAttribute('aria-activedescendant')).toBe(active1)
  })

  it('Enter on the active option commits + fires onValueChange + closes; focus returns to the trigger', () => {
    const onValueChange = vi.fn()
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" onValueChange={onValueChange} />)
    trigger.focus() // a keyboard user tabs to the trigger first
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // open, active = Apple
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // active = Banana
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onValueChange).toHaveBeenLastCalledWith('banana')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('clicking an option commits it; a disabled option does not', () => {
    const onValueChange = vi.fn()
    const opts = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ]
    const { trigger } = renderSelect(<Select options={opts} aria-label="X" onValueChange={onValueChange} />)
    fireEvent.click(trigger)
    fireEvent.click(screen.getByText('B'))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeTruthy() // stayed open
    fireEvent.click(screen.getByText('A'))
    expect(onValueChange).toHaveBeenLastCalledWith('a')
  })

  it('the selected option has aria-selected="true"', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} defaultValue="cherry" aria-label="Fruit" />)
    fireEvent.click(trigger)
    const selected = screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected?.textContent).toContain('Cherry')
  })

  it('Escape closes and keeps focus on the trigger', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" />)
    trigger.focus() // a keyboard user tabs to the trigger first
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('outside pointerdown closes the panel', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" />)
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closed type-ahead commits the matching value IN PLACE without opening', () => {
    const onValueChange = vi.fn()
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" onValueChange={onValueChange} />)
    fireEvent.keyDown(trigger, { key: 'c' }) // matches Cherry
    expect(onValueChange).toHaveBeenLastCalledWith('cherry')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('open type-ahead highlights (does not commit until Enter)', () => {
    const onValueChange = vi.fn()
    const { trigger } = renderSelect(<Select options={FRUITS} aria-label="Fruit" onValueChange={onValueChange} />)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'b' }) // highlight Banana
    const active = trigger.getAttribute('aria-activedescendant')!
    expect(document.getElementById(active)?.textContent).toContain('Banana')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('controlled: reflects `value`, and does not change without a state update', () => {
    const { trigger } = renderSelect(
      <Select options={FRUITS} value="apple" onValueChange={() => undefined} aria-label="Fruit" />,
    )
    expect(screen.getByText('Apple')).toBeTruthy()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' }) // commits, but parent ignores → still Apple
    expect(screen.getByText('Apple')).toBeTruthy()
  })

  it('invalid → aria-invalid + the danger-precedence guard class; valid has neither', () => {
    const { trigger, rerender } = renderSelect(<Select options={FRUITS} invalid aria-label="Fruit" />)
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
    expect(trigger.className).toContain('vida-select-invalid')
    rerender(
      <UIProvider>
        <Select options={FRUITS} aria-label="Fruit" />
      </UIProvider>,
    )
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBeNull()
  })

  it('required → aria-required="true"', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} required aria-label="Fruit" />)
    expect(trigger.getAttribute('aria-required')).toBe('true')
  })

  it('disabled → native disabled + does not open on click', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} disabled aria-label="Fruit" />)
    expect((trigger as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(trigger)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('name → a hidden input carries the current value for form submit', () => {
    const { container } = render(
      <UIProvider>
        <Select options={FRUITS} name="fruit" defaultValue="apple" aria-label="Fruit" />
      </UIProvider>,
    )
    const hidden = container.querySelector('input[type="hidden"][name="fruit"]') as HTMLInputElement | null
    expect(hidden?.value).toBe('apple')
  })

  it('forwards consumer aria-describedby (error-text linkage)', () => {
    const { trigger } = renderSelect(<Select options={FRUITS} invalid aria-describedby="err-1" aria-label="Fruit" />)
    expect(trigger.getAttribute('aria-describedby')).toBe('err-1')
  })

  it('warns when there is no accessible name (no id / aria-label / aria-labelledby)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Select options={FRUITS} />
      </UIProvider>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does not warn when named by aria-label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Select options={FRUITS} aria-label="Fruit" />
      </UIProvider>,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
