// @vitest-environment jsdom
// AR-4 router — the tree renders under RouterProvider and resolves the index route. UI-4 · S1: RootComponent now
// renders the AppShell chrome (which uses Tamagui), so the render is wrapped in UIProvider — mirroring App.tsx, where
// UIProvider wraps RouterProvider. The old placeholder Home/Notes nav was replaced by the shell frame.
import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { UIProvider } from '@vida/ui'
import { router } from './routes'

describe('router', () => {
  it('mounts the index route inside the app-shell frame', async () => {
    const { container } = render(
      <UIProvider>
        <RouterProvider router={router} />
      </UIProvider>,
    )
    // The index route content renders inside the shell chrome…
    await waitFor(() => expect(container.querySelector('[data-region="topStrip"]')).not.toBeNull())
    // …the reserved top strip (banner) + the content region are present. (fe-shell #14 reshape: the Modules nav is now a
    // dock⇄float panel built in S3; the always-present frame regions are the top strip + content.)
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
  })
})
