// @vitest-environment jsdom
// S3 integration — the HUD in the REAL shell (the routes.test.tsx mounting idiom: real `router`,
// QueryClientProvider ⊃ UIProvider ⊃ RouterProvider, mirroring App.tsx).
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { router } from '../routes'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

async function mountApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <UIProvider>
        <RouterProvider router={router} />
      </UIProvider>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(view.container.querySelector('[data-region="topStrip"]')).not.toBeNull())
  // Bar 1's scope query must settle before teardown (routes.test.tsx discipline).
  await screen.findByLabelText(/Scope: All/)
  return view
}

describe('SessionHudSurface in the real shell', () => {
  it('M1 prod (no ?sample): the hudSlot renders NOTHING — the strip is unchanged (BR-HUD-S3-2 / EC-7)', async () => {
    const { container } = await mountApp()
    const slot = container.querySelector('[data-region="hudSlot"]')!
    expect(slot).not.toBeNull()
    expect(slot.children.length).toBe(0)
  })

  it('DEV ?sample=focus: the pill mounts in the real strip, deep-linking with the sample param (BR-HUD-S3-3)', async () => {
    window.history.pushState({}, '', '/?sample=focus')
    const { container } = await mountApp()
    const slot = container.querySelector('[data-region="hudSlot"]')!
    const link = slot.querySelector('a')!
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toContain('/sessions/sample-session')
    expect(link.getAttribute('href')).toContain('sample=focus')
    // The actual CLICK-walk (pill → runtime page) is deliberately NOT performed here — it is the blocking
    // S3 Visual Gate's job in the real browser (PLAN §4.4; performed + passed there). jsdom asserts the href.
    // jsdom matches no Tamagui media query ⇒ the strip renders the COMPACT form (ring + time, no pause
    // control) — the honest 375 truth; the ≥768 form incl. the sibling control is unit-covered via
    // `__compact={false}` (session-hud.test.tsx) and measured at the live Visual Gate.
    expect(link.querySelector('svg')).not.toBeNull()
    expect(slot.querySelector('button')).toBeNull()
  })

  it('a CLIENT-SIDE URL change mounts the pill reactively — the live-shell path (S3 gate catch)', async () => {
    const { container } = await mountApp() // mounted at '/', no sample → hidden
    const slot = () => container.querySelector('[data-region="hudSlot"]')!
    expect(slot().children.length).toBe(0)
    // simulate the in-app navigation the gate performs: pushState + popstate, NO remount
    await waitFor(async () => {
      window.history.pushState({}, '', '/?sample=focus')
      window.dispatchEvent(new PopStateEvent('popstate'))
      expect(slot().querySelector('a')).not.toBeNull()
    })
    expect(slot().querySelector('a')!.getAttribute('href')).toContain('sample=focus')
  })

  it('DEV ?sample=idle: the idle form renders with NO interactive control (Envision answer 1)', async () => {
    window.history.pushState({}, '', '/?sample=idle')
    const { container } = await mountApp()
    const slot = container.querySelector('[data-region="hudSlot"]')!
    // compact idle (jsdom) = the hollow ring glyph only; never a link or button in any width.
    expect(slot.querySelector('svg')).not.toBeNull()
    expect(slot.querySelector('a, button')).toBeNull()
  })
})
