// @vitest-environment jsdom
// AR-4 router — the tree renders under RouterProvider and resolves the index route.
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './routes'

describe('router', () => {
  it('mounts and renders the index route (with the root shell nav)', async () => {
    render(<RouterProvider router={router} />)
    // RootComponent nav + IndexComponent content
    await waitFor(() => expect(screen.getByText('Vida')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Notes' })).toBeTruthy()
  })
})
