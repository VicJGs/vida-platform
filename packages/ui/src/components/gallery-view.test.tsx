// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { GalleryView } from './gallery-view'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Item = { id: string; title: string }
const items: Item[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
]
const key = (i: Item) => i.id
const tile = (i: Item) => <span>{i.title}</span>

describe('GalleryView', () => {
  // ── success grid ────────────────────────────────────────────────────────────
  it('renders role="list" with one role="listitem" tile per item, via renderItem', () => {
    const { getByRole, getAllByRole, getByText } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} aria-label="Gallery" />,
    )
    expect(getByRole('list')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(3)
    expect(getByText('Alpha')).not.toBeNull()
  })

  it('applies the tile FLOOR: minWidth + flexBasis = minTileWidth (px-suffixed), flexGrow unitless', () => {
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} minTileWidth={240} aria-label="Gallery" />,
    )
    const cell = getAllByRole('listitem')[0] as HTMLElement
    expect(cell.style.minWidth).toBe('240px')
    expect(cell.style.flexBasis).toBe('240px')
    expect(cell.style.maxWidth).toBe('480px')
    expect(cell.style.flexGrow).toBe('1')
  })

  // ── P4: getWeight (width-weighted tiles) ────────────────────────────────────
  it('getWeight scales a tile: flexGrow=w, flexBasis=w·min, maxWidth=w·min·2 — but minWidth stays the base floor', () => {
    const weight: Record<string, number> = { a: 1, b: 2, c: 1 }
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} minTileWidth={200} getWeight={(i) => weight[i.id]!} aria-label="Gallery" />,
    )
    const [a, b] = getAllByRole('listitem') as HTMLElement[]
    // base tile (w=1)
    expect(a!.style.flexGrow).toBe('1')
    expect(a!.style.flexBasis).toBe('200px')
    expect(a!.style.maxWidth).toBe('400px')
    // weighted tile (w=2): prefers 2×, grows 2× faster, max 2× — but the FLOOR is unchanged (375-safe, GV-2)
    expect(b!.style.flexGrow).toBe('2')
    expect(b!.style.flexBasis).toBe('400px')
    expect(b!.style.maxWidth).toBe('800px')
    expect(b!.style.minWidth).toBe('200px') // base floor, NOT 400 — no 375 overflow
    expect(b!.style.flexShrink).toBe('1') // explicit: RNW defaults flexShrink to 0 → a w·min flexBasis couldn't shrink → overflow
  })

  it('absent getWeight → every tile is weight-1 (back-compat with the pre-P4 tileStyle)', () => {
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} minTileWidth={200} aria-label="Gallery" />,
    )
    for (const cell of getAllByRole('listitem') as HTMLElement[]) {
      expect(cell.style.flexGrow).toBe('1')
      expect(cell.style.flexBasis).toBe('200px')
    }
  })

  it('getWeight returning <1 / NaN / Infinity → coerced to 1 + dev-warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad: Record<string, number> = { a: 0, b: NaN, c: Infinity }
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} minTileWidth={200} getWeight={(i) => bad[i.id]!} aria-label="Gallery" />,
    )
    for (const cell of getAllByRole('listitem') as HTMLElement[]) {
      expect(cell.style.flexGrow).toBe('1') // all coerced to 1
      expect(cell.style.flexBasis).toBe('200px')
    }
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('weights must be finite in [1, 8]'))
    warn.mockRestore()
  })

  it('getWeight above the ceiling (MAX_WEIGHT=8) → clamped + dev-warn (symmetric guard)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} minTileWidth={200} getWeight={() => 1e9} aria-label="Gallery" />,
    )
    const cell = getAllByRole('listitem')[0] as HTMLElement
    expect(cell.style.flexGrow).toBe('8') // clamped to the ceiling, not 1e9
    expect(cell.style.flexBasis).toBe('1600px') // 8·200
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[1, 8]'))
    warn.mockRestore()
  })

  it('skeleton tiles stay weight-1 (uniform, data-independent) even with getWeight passed', () => {
    const { container } = renderUI(
      <GalleryView items={[]} getKey={key} renderItem={tile} state="loading" minTileWidth={200} getWeight={() => 3} aria-label="Gallery" />,
    )
    const sk = container.querySelectorAll('[role="listitem"]')[0] as HTMLElement
    expect(sk.style.flexGrow).toBe('1')
    expect(sk.style.flexBasis).toBe('200px') // not weighted
  })

  it('defaults minTileWidth to 200', () => {
    const { getAllByRole } = renderUI(
      <GalleryView items={items} getKey={key} renderItem={tile} aria-label="Gallery" />,
    )
    expect((getAllByRole('listitem')[0] as HTMLElement).style.minWidth).toBe('200px')
  })

  it('calls getKey + renderItem with (item, index) per tile', () => {
    const getKey = vi.fn((i: Item) => i.id)
    const renderItem = vi.fn((i: Item) => <span>{i.title}</span>)
    renderUI(<GalleryView items={items} getKey={getKey} renderItem={renderItem} aria-label="Gallery" />)
    expect(getKey).toHaveBeenNthCalledWith(1, items[0], 0)
    expect(renderItem).toHaveBeenNthCalledWith(3, items[2], 2)
  })

  // ── loading ────────────────────────────────────────────────────────────────
  it('loading: role="list" + aria-busy + N aspect-locked skeleton tiles (default 6)', () => {
    const { getByRole, container } = renderUI(
      <GalleryView items={[]} getKey={key} renderItem={tile} state="loading" aria-label="Gallery" />,
    )
    expect(getByRole('list').getAttribute('aria-busy')).toBe('true')
    const skeletons = container.querySelectorAll('[role="listitem"]')
    expect(skeletons).toHaveLength(6)
    expect(skeletons[0]?.getAttribute('aria-hidden')).toBe('true')
    expect((skeletons[0] as HTMLElement).style.aspectRatio).toContain('1.5') // 3/2=1.5 → CSSOM normalizes to "1.5 / 1"
  })

  it('loading: respects loadingCount', () => {
    const { container } = renderUI(
      <GalleryView items={[]} getKey={key} renderItem={tile} state="loading" loadingCount={4} aria-label="Gallery" />,
    )
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(4)
  })

  // ── empty / error (role=status, reused from V1) ─────────────────────────────
  it('empty: role="status" (NOT list) + default message; slot when provided', () => {
    const { getByRole, queryByRole, getByText, rerender } = renderUI(
      <GalleryView items={[]} getKey={key} renderItem={tile} state="empty" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('list')).toBeNull()
    expect(getByText(/nothing here/i)).not.toBeNull()
    rerender(
      <UIProvider>
        <GalleryView items={[]} getKey={key} renderItem={tile} state="empty" empty={<div>No tiles</div>} />
      </UIProvider>,
    )
    expect(getByText('No tiles')).not.toBeNull()
  })

  it('error: role="status" + default message; slot when provided', () => {
    const { getByRole, getByText } = renderUI(
      <GalleryView items={[]} getKey={key} renderItem={tile} state="error" error={<div>Retry?</div>} />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(getByText('Retry?')).not.toBeNull()
  })

  // ── ref (React 19 ref-as-prop) ──────────────────────────────────────────────
  it('forwards ref to the container <div>', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<GalleryView ref={ref} items={items} getKey={key} renderItem={tile} aria-label="Gallery" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current?.getAttribute('role')).toBe('list')
  })

  // ── dev-warns (parity with V1) ──────────────────────────────────────────────
  it('warns on success+empty items, loading+items, and a missing accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<GalleryView items={[]} getKey={key} renderItem={tile} state="success" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty `items`'))
    warn.mockClear()
    renderUI(<GalleryView items={items} getKey={key} renderItem={tile} state="loading" aria-label="G" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale render'))
    warn.mockClear()
    renderUI(<GalleryView items={items} getKey={key} renderItem={tile} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does NOT warn for a well-formed named gallery with items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<GalleryView items={items} getKey={key} renderItem={tile} aria-label="Gallery" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
