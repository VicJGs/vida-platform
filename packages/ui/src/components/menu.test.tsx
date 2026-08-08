// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Menu, type MenuItem } from './menu'

afterEach(cleanup)

const ITEMS: MenuItem[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'delete', label: 'Delete', intent: 'danger' },
]

function renderMenu(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

function Basic(props: Partial<React.ComponentProps<typeof Menu>>) {
  return (
    <Menu
      trigger={<button>Actions</button>}
      items={ITEMS}
      aria-label="Actions"
      {...props}
    />
  )
}

const trigger = () => screen.getByRole('button', { name: 'Actions' })

describe('Menu — trigger + roles', () => {
  it('the trigger has aria-haspopup=menu and aria-expanded=false when closed; no menu is rendered', () => {
    renderMenu(<Basic />)
    const t = trigger()
    expect(t.getAttribute('aria-haspopup')).toBe('menu')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('clicking the trigger opens a role=menu with role=menuitem children; aria-expanded + aria-controls set', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    expect(menu).toBeTruthy()
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(menu.id)
    expect(menu.getAttribute('aria-label')).toBe('Actions')
  })

  it('the menu portals to document.body (outside the trigger subtree)', () => {
    const { container } = renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    expect(container.contains(menu)).toBe(false)
    expect(document.body.contains(menu)).toBe(true)
  })
})

describe('Menu — open interactions + focus', () => {
  it('opening focuses the first item (roving DOM focus, not aria-activedescendant)', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const items = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(items[0])
    expect(items[0]?.getAttribute('tabindex')).toBe('0')
    expect(items[1]?.getAttribute('tabindex')).toBe('-1')
    // no aria-activedescendant anywhere (the combobox mechanism must NOT be used here)
    expect(screen.getByRole('menu').getAttribute('aria-activedescendant')).toBeNull()
  })

  it('ArrowUp on the trigger opens to the LAST item', () => {
    renderMenu(<Basic />)
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' })
    const items = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(items[2])
  })

  it('Enter on the trigger opens exactly once (native double-fire suppressed by preventDefault)', () => {
    const onOpenChange = vi.fn()
    renderMenu(<Basic onOpenChange={onOpenChange} />)
    fireEvent.keyDown(trigger(), { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})

describe('Menu — roving keyboard nav', () => {
  it('ArrowDown/ArrowUp move focus between items', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    const items = screen.getAllByRole('menuitem')
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0])
  })

  it('ArrowUp from the first item WRAPS to the last (menu convention)', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    const items = screen.getAllByRole('menuitem')
    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[2])
  })

  it('Home/End jump to first/last', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    const items = screen.getAllByRole('menuitem')
    fireEvent.keyDown(menu, { key: 'End' })
    expect(document.activeElement).toBe(items[2])
    fireEvent.keyDown(menu, { key: 'Home' })
    expect(document.activeElement).toBe(items[0])
  })

  it('arrow nav skips a disabled item', () => {
    const items: MenuItem[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo', disabled: true },
      { id: 'c', label: 'Charlie' },
    ]
    renderMenu(<Basic items={items} />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    // Bravo disabled → skipped → Charlie focused
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Charlie' }))
  })

  it('type-ahead focuses the first matching item', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')
    fireEvent.keyDown(menu, { key: 'd' }) // "Duplicate"
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Duplicate' }))
  })
})

describe('Menu — activation + close', () => {
  it('Enter on the focused item fires onSelect, closes, and returns focus to the trigger', () => {
    const onSelect = vi.fn()
    const items: MenuItem[] = [
      { id: 'edit', label: 'Edit', onSelect },
      { id: 'delete', label: 'Delete' },
    ]
    renderMenu(<Basic items={items} />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('clicking an item fires its onSelect and closes', () => {
    const onSelect = vi.fn()
    const items: MenuItem[] = [{ id: 'edit', label: 'Edit', onSelect }]
    renderMenu(<Basic items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('a disabled item does not activate on click', () => {
    const onSelect = vi.fn()
    const items: MenuItem[] = [{ id: 'x', label: 'Disabled', disabled: true, onSelect }]
    renderMenu(<Basic items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disabled' }))
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeTruthy() // stays open
  })

  it('Escape closes and returns focus to the trigger', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('an outside pointerdown closes the menu', () => {
    renderMenu(<Basic />)
    fireEvent.click(trigger())
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('Menu — controlled vs uncontrolled', () => {
  it('controlled: open prop drives visibility; onOpenChange fires but the menu does not self-close', () => {
    const onOpenChange = vi.fn()
    renderMenu(<Basic open onOpenChange={onOpenChange} />)
    expect(screen.getByRole('menu')).toBeTruthy() // open because open=true
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    // parent did not update `open` → still open
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('uncontrolled defaultOpen renders open on mount', () => {
    renderMenu(<Basic defaultOpen />)
    expect(screen.getByRole('menu')).toBeTruthy()
  })
})

describe('Menu — empty state', () => {
  it('renders a disabled "No actions" menuitem (announceable, not aria-hidden)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderMenu(<Basic items={[]} defaultOpen />)
    const item = screen.getByRole('menuitem')
    expect(item.textContent).toContain('No actions')
    expect(item.getAttribute('aria-disabled')).toBe('true')
    warn.mockRestore()
  })
})

describe('Menu — ref composition + dev warnings', () => {
  it('assigns both the forwarded ref and the trigger element’s own ref to the trigger node', () => {
    const menuRef = createRef<HTMLButtonElement>()
    const ownRef = createRef<HTMLButtonElement>()
    renderMenu(
      <Menu
        ref={menuRef}
        trigger={<button ref={ownRef}>Actions</button>}
        items={ITEMS}
        aria-label="Actions"
      />,
    )
    expect(menuRef.current?.tagName).toBe('BUTTON')
    expect(ownRef.current?.tagName).toBe('BUTTON')
    expect(menuRef.current).toBe(ownRef.current)
  })

  it('preserves the consumer’s own onClick on the trigger (composed, not clobbered)', () => {
    const onClick = vi.fn()
    renderMenu(<Basic trigger={<button onClick={onClick}>Actions</button>} />)
    fireEvent.click(trigger())
    expect(onClick).toHaveBeenCalledTimes(1) // consumer handler still fires
    expect(screen.getByRole('menu')).toBeTruthy() // and ours opened the menu
  })

  it('warns when no accessible name is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderMenu(<Menu trigger={<button>Actions</button>} items={ITEMS} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('warns on an empty items array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderMenu(<Basic items={[]} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty'))
    warn.mockRestore()
  })

  it('warns on duplicate item ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const items: MenuItem[] = [
      { id: 'dup', label: 'One' },
      { id: 'dup', label: 'Two' },
    ]
    renderMenu(<Basic items={items} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate'))
    warn.mockRestore()
  })
})
