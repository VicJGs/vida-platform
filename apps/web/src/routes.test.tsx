// @vitest-environment jsdom
// AR-4 router — the tree renders under RouterProvider and resolves the index route. UI-4 · S1: RootComponent now
// renders the AppShell chrome (which uses Tamagui), so the render is wrapped in UIProvider — mirroring App.tsx, where
// UIProvider wraps RouterProvider. The old placeholder Home/Notes nav was replaced by the shell frame.
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    // The index route content renders…
    await waitFor(() => expect(screen.getByText('Vida')).toBeTruthy())
    // …inside the shell chrome (the module-dock landmark + content region are present).
    expect(container.querySelector('nav[aria-label="Modules"]')).not.toBeNull()
    expect(container.querySelector('[data-region="content"]')).not.toBeNull()
  })
})
