// @vitest-environment jsdom
// B4 — the Links-out + Backlinks rail panels: the four doc-fixed terminal states (business-rules.md:32), the two DISTINCT
// groups (page_links | entity_links), and the removability rule (Links-out removable; Backlinks READ-ONLY — BR-B4-7).
// The read hooks + router Link are mocked; deriveTerminalState is real. Spec: b4-link-panels.md · BR-B4-1/2/3/7.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { UIProvider } from '@vida/ui'

vi.mock('@tanstack/react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
  Link: ({ children, params, ...rest }: any) => (
    <a href={`/note/${params?.id ?? ''}`} {...rest}>
      {children}
    </a>
  ),
}))

const h = vi.hoisted(() => ({
  linksOut: vi.fn(),
  backlinks: vi.fn(),
  removePage: vi.fn(),
  removeEntity: vi.fn(),
  removePageMutate: vi.fn(),
  removeEntityMutate: vi.fn(),
}))
vi.mock('./use-note', () => ({
  useLinksOut: h.linksOut,
  useBacklinks: h.backlinks,
  useRemovePageLink: () => ({ mutate: h.removePageMutate }),
  useRemoveEntityLink: () => ({ mutate: h.removeEntityMutate }),
  useNoteTitle: (id: string) => ({ data: { title: `Title-${id}` } }),
}))

import { BacklinksPanel, LinksOutPanel } from './links-panels'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row stubs
const pl = (o: any) => ({ id: o.id, source_page_id: o.src, target_page_id: o.tgt }) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row stubs
const el = (o: any) => ({ id: o.id, page_id: o.page, entity_type: 'page', entity_id: o.ent }) as any

const wrap = (ui: React.ReactElement) => render(<UIProvider>{ui}</UIProvider>)

describe('LinksOutPanel — terminal states + distinct groups + removable (BR-B4-3/7)', () => {
  it('loading → "Querying links…"', () => {
    h.linksOut.mockReturnValue({ isPending: true, isError: false, data: undefined })
    wrap(<LinksOutPanel id="n1" />)
    expect(screen.getByText('Querying links…')).toBeTruthy()
  })

  it('error → a retry affordance', () => {
    h.linksOut.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch: vi.fn() })
    wrap(<LinksOutPanel id="n1" />)
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('empty (both arrays empty) → the empty copy', () => {
    h.linksOut.mockReturnValue({ isPending: false, isError: false, data: { pageLinks: [], entityLinks: [] } })
    wrap(<LinksOutPanel id="n1" />)
    expect(screen.getByText('This note doesn’t link out yet.')).toBeTruthy()
  })

  it('populated → TWO distinct groups; each row navigates by id and has a REMOVE control', () => {
    h.linksOut.mockReturnValue({
      isPending: false,
      isError: false,
      data: { pageLinks: [pl({ id: 'l1', src: 'n1', tgt: 'p2' })], entityLinks: [el({ id: 'e1', page: 'n1', ent: 'p3' })] },
    })
    wrap(<LinksOutPanel id="n1" />)
    expect(screen.getByText('Page links')).toBeTruthy()
    expect(screen.getByText('Entity links')).toBeTruthy()
    // page-link row → target_page_id; entity-link row → entity_id
    expect(screen.getByRole('link', { name: 'Open Title-p2' }).getAttribute('href')).toBe('/note/p2')
    expect(screen.getByRole('link', { name: 'Open Title-p3' }).getAttribute('href')).toBe('/note/p3')
    // remove present on BOTH kinds
    expect(screen.getByRole('button', { name: 'Remove link to Title-p2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove link to Title-p3' })).toBeTruthy()
  })
})

describe('BacklinksPanel — states + distinct groups + READ-ONLY (BR-B4-2/7)', () => {
  it('empty → "Nothing links here yet." (business-rules.md:32 verbatim)', () => {
    h.backlinks.mockReturnValue({ isPending: false, isError: false, data: { entityLinks: [], pageLinks: [] } })
    wrap(<BacklinksPanel id="n1" />)
    expect(screen.getByText('Nothing links here yet.')).toBeTruthy()
  })

  it('populated → rows navigate to the SOURCE (source_page_id / page_id) and carry NO remove control', () => {
    h.backlinks.mockReturnValue({
      isPending: false,
      isError: false,
      data: { pageLinks: [pl({ id: 'l1', src: 'a1', tgt: 'n1' })], entityLinks: [el({ id: 'e1', page: 'b2', ent: 'n1' })] },
    })
    wrap(<BacklinksPanel id="n1" />)
    // backlink page-link → source_page_id; entity-link → page_id (the linking page)
    expect(screen.getByRole('link', { name: 'Open Title-a1' }).getAttribute('href')).toBe('/note/a1')
    expect(screen.getByRole('link', { name: 'Open Title-b2' }).getAttribute('href')).toBe('/note/b2')
    // READ-ONLY: no remove buttons anywhere in the panel (BR-B4-7)
    expect(screen.queryByRole('button', { name: /Remove link/ })).toBeNull()
  })
})
