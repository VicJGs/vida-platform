// UI-4 · S2 — shared test helper (NOT a test file; never imported by app code, so it's tree-shaken from the build).
// The nav chrome renders NavLink (useRouterState) + Link, which need a router context. This mounts the UI under test
// inside a memory router whose `/` + `/notes` routes mirror the real registered set (so unregistered targets degrade).
import { type ReactNode } from 'react'
import { render } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { UIProvider } from '@vida/ui'

/** Render `ui` inside a UIProvider + a loaded memory router at `path`. Await it (the router resolves asynchronously). */
export async function renderInShell(ui: ReactNode, path = '/') {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: () => null })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, notesRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return render(
    <UIProvider>
      <RouterProvider router={router} />
    </UIProvider>,
  )
}
