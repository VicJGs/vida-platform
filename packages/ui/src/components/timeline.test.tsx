// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Timeline } from './timeline'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Event = { id: string; when: string; what: string }
const events: Event[] = [
  { id: 'a', when: 'Aug 8', what: 'Kickoff' },
  { id: 'b', when: 'Aug 9', what: 'Design' },
  { id: 'c', when: 'Aug 10', what: 'Build' },
]
const key = (e: Event) => e.id
const item = (e: Event) => <span>{e.what}</span>
const lines = (c: HTMLElement) => c.querySelectorAll('.vida-timeline-line')
const dots = (c: HTMLElement) => c.querySelectorAll('.vida-timeline-dot')

describe('Timeline', () => {
  // ── success sequence + rail ─────────────────────────────────────────────────
  it('renders role="list" with one role="listitem" per item + a dot each', () => {
    const { getByRole, getAllByRole, container, getByText } = renderUI(
      <Timeline items={events} getKey={key} renderItem={item} aria-label="History" />,
    )
    expect(getByRole('list')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(3)
    expect(dots(container)).toHaveLength(3)
    expect(getByText('Kickoff')).not.toBeNull()
  })

  it('rail line trims at the ends: first top=18, middle full (top=0,bottom=0), last top=0 height=18', () => {
    const { container } = renderUI(<Timeline items={events} getKey={key} renderItem={item} aria-label="History" />)
    const ls = lines(container)
    expect(ls).toHaveLength(3) // n=3 → every item has a line
    const first = ls[0] as HTMLElement
    const middle = ls[1] as HTMLElement
    const last = ls[2] as HTMLElement
    expect(first.style.top).toBe('18px')
    expect(first.style.bottom).toBe('0px')
    expect(middle.style.top).toBe('0px')
    expect(middle.style.bottom).toBe('0px')
    expect(last.style.top).toBe('0px')
    expect(last.style.height).toBe('18px')
  })

  it('LONE item → a dot but NO line (no spurious nub)', () => {
    const { container, getAllByRole } = renderUI(
      <Timeline items={[events[0]!]} getKey={key} renderItem={item} aria-label="History" />,
    )
    expect(getAllByRole('listitem')).toHaveLength(1)
    expect(dots(container)).toHaveLength(1)
    expect(lines(container)).toHaveLength(0) // the fix: isFirst && isLast → no line
  })

  it('renders getLabel as real (non-hidden) content, before the item', () => {
    const { getByText } = renderUI(
      <Timeline items={events} getKey={key} renderItem={item} getLabel={(e) => e.when} aria-label="History" />,
    )
    const label = getByText('Aug 8')
    expect(label).not.toBeNull()
    // it's real content — not inside an aria-hidden subtree
    expect(label.closest('[aria-hidden="true"]')).toBeNull()
  })

  // ── loading ──────────────────────────────────────────────────────────────
  it('loading: role="list" + aria-busy + N dot-only skeleton rows (default 5), no lines', () => {
    const { getByRole, container } = renderUI(
      <Timeline items={[]} getKey={key} renderItem={item} state="loading" aria-label="History" />,
    )
    expect(getByRole('list').getAttribute('aria-busy')).toBe('true')
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(5)
    expect(dots(container)).toHaveLength(5)
    expect(lines(container)).toHaveLength(0) // skeleton rail is dot-only
  })

  // ── empty / error (reused spine) ───────────────────────────────────────────
  it('empty: role="status" (NOT list) + default message; slot when provided', () => {
    const { getByRole, queryByRole, getByText } = renderUI(
      <Timeline items={[]} getKey={key} renderItem={item} state="empty" empty={<div>No events</div>} />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('list')).toBeNull()
    expect(getByText('No events')).not.toBeNull()
  })

  it('error: role="status" + default message', () => {
    const { getByRole, getByText } = renderUI(
      <Timeline items={[]} getKey={key} renderItem={item} state="error" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(getByText(/couldn/i)).not.toBeNull()
  })

  // ── ref ─────────────────────────────────────────────────────────────────
  it('forwards ref to the container <div>', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<Timeline ref={ref} items={events} getKey={key} renderItem={item} aria-label="History" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current?.getAttribute('role')).toBe('list')
  })

  // ── dev-warns via the shared helper ────────────────────────────────────────
  it('warns (via resolveDataViewState) on a missing accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<Timeline items={events} getKey={key} renderItem={item} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })
})
