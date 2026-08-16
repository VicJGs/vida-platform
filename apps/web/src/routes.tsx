// ============================================================================
// Router — AR-4 (LIF-75). Code-based TanStack Router tree (ADR-001; the docs
// mandate a central routes.tsx, not file-based routing — performance-strategy §6).
// Module-scope `router` singleton so StrictMode's dev double-invoke can't spawn
// duplicates (R5). Route-based lazy code-splitting via `lazyRouteComponent`
// (BR-RT-8): each top-level route's component is its own async chunk.
//
// AR-4 ships the tree + a root route + a not-found + ONE lazy reference route
// (/notes). Per-module routes land with each module's own wave (M1.1+).
// ============================================================================

import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from './shell/app-shell'

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

// UI-4 · S1: the app-shell chrome wraps the routed content. AppShell mounts HERE (inside the router) — not above
// <RouterProvider> — because it hosts the <Outlet/>, which is only legal inside a route component.
function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function NotFoundComponent() {
  return (
    <div>
      <h1>404 — Not found</h1>
      <Link to="/">Home</Link>
    </div>
  )
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h2>Vida</h2>,
})

// Reference lazy route — the component loads as a separate chunk on navigation.
const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: lazyRouteComponent(() => import('./app/notes')),
})

const routeTree = rootRoute.addChildren([indexRoute, notesRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// Type-safety registration (TanStack Router v1).
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
