// UI-4 · S2 — shared test helper (NOT a test file; never imported by app code, so it's tree-shaken from the build).
// The nav chrome renders NavLink (useRouterState) + Link, which need a router context. This mounts the UI under test
// inside a memory router whose `/` + `/notes` routes mirror the real registered set (so unregistered targets degrade).
import { type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { UIProvider } from '@vida/ui'
import { createPrefsWrapper } from '../test/preferences-test-utils'

/**
 * Render `ui` inside a UIProvider + a loaded memory router at `path`. Await it (the router resolves asynchronously).
 * `prefs: true` (preferences-rescope R5) also wraps the app's singleton QueryClient, for chrome that reads the live
 * preferences (the dock). Opt-in, so other `renderInShell` users keep their own client and never share its cache.
 */
export async function renderInShell(ui: ReactNode, path = '/', options: { prefs?: boolean } = {}) {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: () => null })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, notesRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const tree = (
    <UIProvider>
      <RouterProvider router={router} />
    </UIProvider>
  )
  if (!options.prefs) return render(tree)
  const Prefs = createPrefsWrapper()
  return render(<Prefs>{tree}</Prefs>)
}
