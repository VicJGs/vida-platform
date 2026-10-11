// @vitest-environment jsdom
// AR-4 router — the tree renders under RouterProvider and resolves the index route. UI-4 · S1: RootComponent now
// renders the AppShell chrome (which uses Tamagui), so the render is wrapped in UIProvider — mirroring App.tsx, where
// UIProvider wraps RouterProvider. The old placeholder Home/Notes nav was replaced by the shell frame.
import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { router } from './routes'

afterEach(cleanup)

describe('router', () => {
  it('mounts the index route inside the app-shell frame', async () => {
    // fe-shell-scope #15 S3: RootComponent now mounts Bar 1 (GlobalBar1 → ScopeSelector → useQuery), so the harness
    // mirrors App.tsx's QueryClientProvider ⊃ RouterProvider stack (App.tsx:76). `retry:false` so the stub read settles
    // immediately.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={client}>
        <UIProvider>
          <RouterProvider router={router} />
        </UIProvider>
      </QueryClientProvider>,
    )
    // The index route content renders inside the shell chrome…
    await waitFor(() => expect(container.querySelector('[data-region="topStrip"]')).not.toBeNull())
    // …the reserved top strip (banner) + the content region are present. (fe-shell #14 reshape: the Modules nav is now a
    // dock⇄float panel built in S3; the always-present frame regions are the top strip + content.)
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
    // Await Bar 1's scope query SETTLING (empty-state trigger) before the test ends, so its async resolution can't fire a
    // post-teardown render that touches a torn-down `window` (fe-shell-scope #15 S3).
    await screen.findByLabelText(/Scope: All/)
  })
})
