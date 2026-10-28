// @vitest-environment jsdom
// notes-rescope R3 · G10 · IMPL R-7/R-8 — the cover image (URL · attachment thumbnail · placeholder).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'

const thumbs = new Map<string, Uint8Array | null>()
const reads: string[] = []
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({
      notes: {
        getAttachmentThumbnail: async (id: string) => {
          reads.push(id)
          return thumbs.get(id) ?? null
        },
      },
    }),
}))

import { CoverImage } from './cover-image'
import { CoverBanner } from './page-metadata'

const renderUI = (ui: React.ReactNode) =>
  render(
    <UIProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {ui}
      </QueryClientProvider>
    </UIProvider>,
  )

beforeEach(() => {
  thumbs.clear()
  reads.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:thumb-1')
  URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

describe('CoverImage', () => {
  it('a URL cover → a decorative img with no referrer', () => {
    const { container } = renderUI(<CoverImage cover="https://example.com/c.png" variant="header" />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://example.com/c.png')
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('a failed header image → the "Cover unavailable" placeholder (role img)', () => {
    const { container, getByRole } = renderUI(<CoverImage cover="https://example.com/x.png" variant="header" />)
    fireEvent.error(container.querySelector('img')!)
    expect(getByRole('img', { name: 'Cover unavailable' })).not.toBeNull()
  })

  it('a failed TILE image → a decorative placeholder (no announced image)', () => {
    const { container, queryByRole } = renderUI(<CoverImage cover="https://example.com/x.png" variant="tile" />)
    fireEvent.error(container.querySelector('img')!)
    expect(queryByRole('img')).toBeNull()
  })

  it('an attachment cover reads ONLY the thumbnail and shows it via an object URL (revoked on unmount)', async () => {
    thumbs.set('a1', new Uint8Array([1, 2]))
    const r = renderUI(<CoverImage cover="attachment:a1" variant="header" />)
    await waitFor(() => expect(r.container.querySelector('img')?.getAttribute('src')).toBe('blob:thumb-1'))
    expect(reads).toEqual(['a1'])
    r.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb-1')
  })

  it('an attachment with no thumbnail → the placeholder', async () => {
    const { findByRole } = renderUI(<CoverImage cover="attachment:none" variant="header" />)
    expect(await findByRole('img', { name: 'Cover unavailable' })).not.toBeNull()
  })

  it('a value that is neither a URL nor attachment:<id> → the placeholder', () => {
    const { getByRole } = renderUI(<CoverImage cover="cover-sample" variant="header" />)
    expect(getByRole('img', { name: 'Cover unavailable' })).not.toBeNull()
  })

  it('B1 — a failed cover recovers when the cover changes (no remount needed)', () => {
    const r = renderUI(<CoverBanner cover="https://e.com/broken.png" />)
    fireEvent.error(r.container.querySelector('img')!)
    expect(r.getByRole('img', { name: 'Cover unavailable' })).not.toBeNull()
    r.rerender(
      <UIProvider>
        <QueryClientProvider client={new QueryClient()}>
          <CoverBanner cover="https://e.com/good.png" />
        </QueryClientProvider>
      </UIProvider>,
    )
    expect(r.container.querySelector('img')?.getAttribute('src')).toBe('https://e.com/good.png')
  })
})
