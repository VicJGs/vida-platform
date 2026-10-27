// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { CoverBanner, MetadataControlsView } from './page-metadata'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) =>
  render(
    <UIProvider>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </UIProvider>,
  )
const noop = () => {}

const baseProps = {
  favorite: false,
  archived: false,
  icon: null as string | null,
  cover: null as string | null,
  onToggleFavorite: noop,
  onToggleArchive: noop,
  onChangeIcon: noop,
  onChangeCover: noop,
}

describe('MetadataControlsView (S6 — EC-7)', () => {
  it('renders all 4 controls (favorite · archive · icon · cover)', () => {
    const { getByRole } = renderUI(<MetadataControlsView {...baseProps} />)
    expect(getByRole('button', { name: 'Favorite' })).not.toBeNull()
    expect(getByRole('button', { name: 'Archive' })).not.toBeNull()
    expect(getByRole('button', { name: 'Add icon' })).not.toBeNull()
    expect(getByRole('button', { name: 'Add cover' })).not.toBeNull()
  })

  it('EC-7 — favorite control REFLECTS state via aria-pressed', () => {
    const inactive = renderUI(<MetadataControlsView {...baseProps} favorite={false} />)
    expect(inactive.getByRole('button', { name: 'Favorite' }).getAttribute('aria-pressed')).toBe('false')
    cleanup()
    const active = renderUI(<MetadataControlsView {...baseProps} favorite />)
    expect(active.getByRole('button', { name: 'Favorite' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('toggling favorite/archive fires the handler', () => {
    const onToggleFavorite = vi.fn()
    const onToggleArchive = vi.fn()
    const { getByRole } = renderUI(
      <MetadataControlsView {...baseProps} onToggleFavorite={onToggleFavorite} onToggleArchive={onToggleArchive} />,
    )
    fireEvent.click(getByRole('button', { name: 'Favorite' }))
    fireEvent.click(getByRole('button', { name: 'Archive' }))
    expect(onToggleFavorite).toHaveBeenCalledOnce()
    expect(onToggleArchive).toHaveBeenCalledOnce()
  })

  it('icon/cover controls reflect set vs unset via their label', () => {
    const { getByRole } = renderUI(<MetadataControlsView {...baseProps} icon="star" cover="cover-1" />)
    expect(getByRole('button', { name: 'Change icon' })).not.toBeNull()
    expect(getByRole('button', { name: 'Change cover' })).not.toBeNull()
  })

  it('EC-22 — controls carry Lucide icons (svg)', () => {
    const { container } = renderUI(<MetadataControlsView {...baseProps} />)
    expect(container.querySelectorAll('svg').length).toBe(4)
  })
})

describe('CoverBanner (R3 G10 — the real cover strip)', () => {
  it('renders nothing when cover is null', () => {
    const { container } = renderUI(<CoverBanner cover={null} />)
    expect(container.querySelector('[aria-label="Cover"]')).toBeNull()
  })
  it('a value that is not a URL or attachment:<id> renders the neutral placeholder', () => {
    const { getByRole } = renderUI(<CoverBanner cover="cover-1" />)
    expect(getByRole('img', { name: 'Cover unavailable' })).not.toBeNull()
  })
  it('a URL cover renders the image', () => {
    const { container } = renderUI(<CoverBanner cover="https://e.com/c.png" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://e.com/c.png')
  })
})

describe('R3 G16 — controls match the greybox: icon + visible label, greybox order, name = label', () => {
  it('shows the labels as text, in order Change icon · Change cover · Favorite · Archive', () => {
    const { getAllByRole } = renderUI(<MetadataControlsView {...baseProps} icon="star" cover="https://e.com/c.png" />)
    const group = getAllByRole('group', { name: 'Page metadata' })[0]!
    const labels = Array.from(group.querySelectorAll('[role="button"]')).map((b) => b.textContent)
    expect(labels).toEqual(['Change icon', 'Change cover', 'Favorite', 'Archive'])
    for (const b of Array.from(group.querySelectorAll('[role="button"]')))
      expect(b.getAttribute('aria-label')).toBeNull()
  })
})
