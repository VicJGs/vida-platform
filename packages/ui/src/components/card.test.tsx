// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Card } from './card'

afterEach(cleanup)

function renderCard(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

describe('Card', () => {
  it('is a role=group container by default (non-interactive)', () => {
    const { getByRole, queryByRole } = renderCard(<Card>Body</Card>)
    expect(getByRole('group')).not.toBeNull()
    expect(queryByRole('button')).toBeNull()
  })

  it('becomes role=button when interactive', () => {
    const { getByRole, queryByRole } = renderCard(
      <Card interactive onPress={() => {}}>
        Clickable
      </Card>,
    )
    expect(getByRole('button')).not.toBeNull()
    expect(queryByRole('group')).toBeNull()
  })

  it('forwards the ref to the DOM <div>', () => {
    const ref = createRef<HTMLDivElement>()
    renderCard(<Card ref={ref}>Body</Card>)
    expect(ref.current?.tagName).toBe('DIV')
  })

  // BR-C-11 — header/footer render their content but are NOT <header>/<footer> landmark elements (a <header> nested in
  // the <div> frame is exposed as a banner/contentinfo landmark, duplicated N× in a list — card.md:6 Intent forbids it).
  it('renders header/footer content as non-landmark regions (no <header>/<footer>, no banner/contentinfo)', () => {
    const { container, getByText, queryByRole } = renderCard(
      <Card header="Title" footer="Foot">
        Body
      </Card>,
    )
    expect(getByText('Title')).not.toBeNull()
    expect(getByText('Foot')).not.toBeNull()
    // No landmark elements + no landmark roles — the P1-gate fix.
    expect(container.querySelector('header')).toBeNull()
    expect(container.querySelector('footer')).toBeNull()
    expect(queryByRole('banner')).toBeNull()
    expect(queryByRole('contentinfo')).toBeNull()
  })

  it('renders many header/footer cards with zero duplicate landmarks (the repeated-row shape)', () => {
    const { container } = renderCard(
      <>
        {[1, 2, 3].map((n) => (
          <Card key={n} header={`H${n}`} footer={`F${n}`}>
            Body
          </Card>
        ))}
      </>,
    )
    expect(container.querySelectorAll('header')).toHaveLength(0)
    expect(container.querySelectorAll('footer')).toHaveLength(0)
  })

  it('renders the actions slot (independently clickable) alongside header content', () => {
    const { getByText, getByRole } = renderCard(
      <Card header="Title" actions={<button type="button">Edit</button>}>
        Body
      </Card>,
    )
    expect(getByText('Edit')).not.toBeNull()
    // The card is a role=group container that contains the action.
    expect(getByRole('group').contains(getByText('Edit'))).toBe(true)
  })

  // ── P2 alive-hooks: status edge · metric · headerDivider · neutral baseline ─────────────────────────────
  it('renders a status accent edge for calm/warm, and none for neutral/faded', () => {
    const calm = renderCard(<Card status="calm">Body</Card>)
    expect(calm.container.querySelector('.vida-card-edge')).not.toBeNull()
    cleanup()
    const warm = renderCard(<Card status="warm">Body</Card>)
    expect(warm.container.querySelector('.vida-card-edge')).not.toBeNull()
    cleanup()
    const neutral = renderCard(<Card status="neutral">Body</Card>)
    expect(neutral.container.querySelector('.vida-card-edge')).toBeNull()
    cleanup()
    const faded = renderCard(<Card status="faded">Body</Card>)
    expect(faded.container.querySelector('.vida-card-edge')).toBeNull()
  })

  it('status edge is decorative (aria-hidden) — not announced', () => {
    const { container } = renderCard(<Card status="calm">Body</Card>)
    expect(container.querySelector('.vida-card-edge')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('neutral (default) === baseline: no edge, same role=group container', () => {
    const { container, getByRole } = renderCard(<Card>Body</Card>)
    expect(getByRole('group')).not.toBeNull()
    expect(container.querySelector('.vida-card-edge')).toBeNull()
  })

  it('renders the metric slot in the header, coexisting with actions', () => {
    const { getByText } = renderCard(
      <Card header="Title" metric={<span>metric-x</span>} actions={<button type="button">Edit</button>}>
        Body
      </Card>,
    )
    expect(getByText('metric-x')).not.toBeNull()
    expect(getByText('Edit')).not.toBeNull()
  })

  it('renders a header with headerDivider without breaking header content', () => {
    const { getByText } = renderCard(
      <Card header="Title" headerDivider>
        Body
      </Card>,
    )
    expect(getByText('Title')).not.toBeNull()
  })

  it('a faded card is flat/recessed (chrome dim, text held) — role=group, content rendered, vida-card-flat class', () => {
    const { getByRole, getByText } = renderCard(<Card status="faded">Neglected body</Card>)
    const el = getByRole('group')
    expect(el).not.toBeNull()
    expect(getByText('Neglected body')).not.toBeNull()
    // BR-C-7a: faded dims the chrome (flat class suppresses elevation + recessed surface), NOT the text (no opacity).
    expect(el.className).toContain('vida-card-flat')
    expect(el.style.opacity === '' || el.style.opacity === '1').toBe(true)
  })

  // ── interactive activation ────────────────────────────────────────────────
  it('fires onPress on click when interactive', () => {
    const onPress = vi.fn()
    const { getByRole } = renderCard(
      <Card interactive onPress={onPress}>
        Go
      </Card>,
    )
    fireEvent.click(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire onPress on click when not interactive', () => {
    const onPress = vi.fn()
    // onPress without interactive is a misuse (dev-warns), but must never activate.
    const { getByRole } = renderCard(<Card onPress={onPress}>Static</Card>)
    fireEvent.click(getByRole('group'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('activates on Enter (keydown), and guards against key repeat', () => {
    const onPress = vi.fn()
    const { getByRole } = renderCard(
      <Card interactive onPress={onPress}>
        Go
      </Card>,
    )
    const el = getByRole('button')
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(onPress).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(el, { key: 'Enter', repeat: true }) // held → must not re-fire
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('activates on Space keyUp (not keyDown) and prevents scroll on keyDown', () => {
    const onPress = vi.fn()
    const { getByRole } = renderCard(
      <Card interactive onPress={onPress}>
        Go
      </Card>,
    )
    const el = getByRole('button')
    const notCancelledOnKeyDown = fireEvent.keyDown(el, { key: ' ' })
    expect(onPress).not.toHaveBeenCalled() // Space does NOT activate on keydown
    expect(notCancelledOnKeyDown).toBe(false) // preventDefault called (blocks page scroll)
    fireEvent.keyUp(el, { key: ' ' })
    expect(onPress).toHaveBeenCalledTimes(1) // activates on keyup
  })

  it('nested action clicks do not bubble to the card onPress', () => {
    const cardPress = vi.fn()
    const actionClick = vi.fn()
    const { getByText } = renderCard(
      <Card interactive onPress={cardPress} actions={<button type="button" onClick={actionClick}>Edit</button>}>
        Body
      </Card>,
    )
    fireEvent.click(getByText('Edit'))
    expect(actionClick).toHaveBeenCalledTimes(1)
    expect(cardPress).not.toHaveBeenCalled() // stopPropagation on the actions wrapper
  })

  // ── disabled ──────────────────────────────────────────────────────────────
  it('disabled interactive card: aria-disabled, tabIndex -1, no interactive class, onPress suppressed', () => {
    const onPress = vi.fn()
    const { getByRole } = renderCard(
      <Card interactive disabled onPress={onPress}>
        Off
      </Card>,
    )
    const el = getByRole('button')
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.getAttribute('tabindex')).toBe('-1')
    expect(el.className).not.toContain('vida-card-interactive')
    expect(el.className).toContain('vida-card')
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: 'Enter' })
    fireEvent.keyUp(el, { key: ' ' })
    expect(onPress).not.toHaveBeenCalled()
  })

  it('interactive (enabled) card is tab-reachable and carries the interactive class', () => {
    const { getByRole } = renderCard(
      <Card interactive onPress={() => {}}>
        Go
      </Card>,
    )
    const el = getByRole('button')
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.className).toContain('vida-card-interactive')
  })

  // ── pass-through (N1) ─────────────────────────────────────────────────────
  it('passes through arbitrary props and preserves a consumer className', () => {
    const { getByRole } = renderCard(
      <Card aria-label="Metrics" className="consumer-x">
        Body
      </Card>,
    )
    const el = getByRole('group')
    expect(el.getAttribute('aria-label')).toBe('Metrics')
    expect(el.className).toContain('consumer-x') // merged, not clobbered
    expect(el.className).toContain('vida-card') // load-bearing class survives
  })

  // ── dev-warns ─────────────────────────────────────────────────────────────
  it('warns when onPress/disabled are passed without interactive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderCard(<Card onPress={() => {}}>Body</Card>)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('only apply when `interactive`'))
    warn.mockRestore()
  })

  it('warns when an interactive card has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderCard(
      <Card interactive onPress={() => {}}>
        {null}
      </Card>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs an accessible name'))
    warn.mockRestore()
  })

  it('does NOT warn for a well-formed interactive card with text content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderCard(
      <Card interactive onPress={() => {}}>
        Labelled
      </Card>,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
