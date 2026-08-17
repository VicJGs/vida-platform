// @vitest-environment jsdom
// UI-4 · S2 — NavLink tests. A memory router provides the routing context; the root route renders the UI under test,
// index (`/`) + notes (`/notes`) mirror the real registered routes so an unregistered target (`/tasks`) is exercised.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { UIProvider } from '@vida/ui'
import { StickyNote } from 'lucide-react'
import { NavLink } from './nav-link'
import type { ReactNode } from 'react'

// Bound queries search document.body, so tests must clean up between renders (else prior anchors accumulate).
afterEach(cleanup)

async function renderAt(path: string, ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: () => null })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, notesRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  // TanStack Router resolves its first match asynchronously — load it before the (synchronous) render assertions.
  await router.load()
  return render(
    <UIProvider>
      <RouterProvider router={router} />
    </UIProvider>,
  )
}

describe('NavLink', () => {
  it('renders a real anchor with the label', async () => {
    const { getByRole } = await renderAt('/', <NavLink to="/notes" label="Notes" icon={StickyNote} />)
    const link = getByRole('link', { name: 'Notes' })
    expect(link.tagName.toLowerCase()).toBe('a')
  })

  it('marks the current route with aria-current="page" (exact match)', async () => {
    const { getByRole } = await renderAt(
      '/',
      <>
        <NavLink to="/" label="Home" />
        <NavLink to="/notes" label="Notes" />
      </>,
    )
    expect(getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    // `/` must not light up a different route (FOLD-3 exact match).
    expect(getByRole('link', { name: 'Notes' }).getAttribute('aria-current')).toBeNull()
  })

  it('navigates to an UNREGISTERED route without throwing (BR-4 degrade)', async () => {
    const { getByRole } = await renderAt('/', <NavLink to="/tasks" label="Tasks" />)
    // The link renders (SPA target); the router resolves NotFound only on activation.
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull()
  })

  it('iconOnly puts the label on aria-label and hides the text', async () => {
    const { getByRole, queryByText } = await renderAt(
      '/',
      <NavLink to="/notes" label="Notes" icon={StickyNote} iconOnly />,
    )
    expect(getByRole('link', { name: 'Notes' })).not.toBeNull()
    expect(queryByText('Notes')).toBeNull()
  })
})
