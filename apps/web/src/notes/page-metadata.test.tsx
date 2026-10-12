// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { CoverBanner, MetadataControlsView } from './page-metadata'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)
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
    const { getByRole } = renderUI(<MetadataControlsView {...baseProps} onToggleFavorite={onToggleFavorite} onToggleArchive={onToggleArchive} />)
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

describe('CoverBanner (S6 — merged placeholder, D-S6-5)', () => {
  it('renders nothing when cover is null', () => {
    const { container } = renderUI(<CoverBanner cover={null} />)
    expect(container.querySelector('[aria-label="Cover"]')).toBeNull()
  })
  it('renders a placeholder strip when cover is set', () => {
    const { getByRole } = renderUI(<CoverBanner cover="cover-1" />)
    expect(getByRole('img', { name: 'Cover' })).not.toBeNull()
  })
})
